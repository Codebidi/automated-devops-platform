import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote
import requests
from .stages import STAGE_DEFINITIONS, normalize_stage_progression
from .errors import NotFoundError, GitHubApiError


class GitHubProvider:
    """Client for interacting with the GitHub Actions REST API with ETag caching and error masking."""

    def __init__(
        self,
        token: str,
        owner: str,
        repo: str,
        workflow_file: str = "deploy.yml",
        rollback_workflow_file: str = "rollback.yml",
        cache_ttl_seconds: int = 10,
        ecr_registry: str | None = None,
        ecr_repository: str | None = None,
        branch: str = "main",
        session: requests.Session | None = None,
    ):
        self.token = token
        self.owner = owner
        self.repo = repo
        self.workflow_file = workflow_file
        self.rollback_workflow_file = rollback_workflow_file
        self.cache_ttl = cache_ttl_seconds
        self.ecr_registry = ecr_registry
        self.ecr_repository = ecr_repository
        self.learned_registry: str | None = None
        self.branch = branch
        self.base_url = "https://api.github.com"
        # cache_key -> (timestamp, etag, data)
        self._cache: dict[str, tuple[float, str | None, Any]] = {}
        self.last_rate_limit: dict[str, Any] | None = None

        self.session = session or requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })

    def _repo_path(self) -> str:
        return f"{quote(self.owner, safe='')}/{quote(self.repo, safe='')}"

    def _sanitize(self, text: str) -> str:
        if self.token and text:
            return text.replace(self.token, "[REDACTED]")
        return text

    def _record_rate_limit(self, resp: requests.Response) -> None:
        headers = getattr(resp, "headers", None) or {}
        rem = headers.get("X-RateLimit-Remaining")
        lim = headers.get("X-RateLimit-Limit")
        rst = headers.get("X-RateLimit-Reset")
        if rem is not None or lim is not None:
            self.last_rate_limit = {
                "remaining": int(rem) if str(rem).isdigit() else rem,
                "limit": int(lim) if str(lim).isdigit() else lim,
                "reset": int(rst) if str(rst).isdigit() else rst,
            }

    def _build_image_uri(self, short_sha: str) -> str | None:
        registry = self.ecr_registry or self.learned_registry
        if not registry:
            return None
        repo_name = self.ecr_repository or self.repo
        return f"{registry.rstrip('/')}/{repo_name}:{short_sha}"

    def _get(self, url: str, params: dict | None = None, use_cache: bool = True) -> Any:
        cache_key = f"{url}?{sorted(params.items()) if params else ''}"
        now = time.time()
        cached_etag: str | None = None
        cached_data: Any = None

        if use_cache and cache_key in self._cache:
            ts, cached_etag, cached_data = self._cache[cache_key]
            if now - ts < self.cache_ttl:
                return cached_data

        try:
            if cached_etag:
                try:
                    resp = self.session.get(
                        url, params=params, headers={"If-None-Match": cached_etag}, timeout=10
                    )
                except TypeError:
                    resp = self.session.get(url, params=params, timeout=10)
            else:
                resp = self.session.get(url, params=params, timeout=10)
        except requests.RequestException as e:
            raise GitHubApiError(f"GitHub network communication error: {type(e).__name__}", 502)

        self._record_rate_limit(resp)

        if resp.status_code == 304 and cached_data is not None:
            if use_cache:
                self._cache[cache_key] = (now, cached_etag, cached_data)
            return cached_data

        self._handle_response_errors(resp, url=url)
        data = resp.json()
        resp_headers = getattr(resp, "headers", None) or {}
        new_etag = resp_headers.get("ETag") or resp_headers.get("etag") or cached_etag

        if use_cache:
            self._cache[cache_key] = (now, new_etag, data)
        return data

    def _handle_response_errors(self, resp: requests.Response, url: str = "") -> None:
        if resp.status_code in (200, 201, 202, 204):
            return
        if resp.status_code == 404:
            if "/actions/workflows/" in url:
                raise NotFoundError(
                    f"GitHub workflow '{self.workflow_file}' was not found in "
                    f"'{self.owner}/{self.repo}'. Check GITHUB_WORKFLOW_FILE, GITHUB_OWNER, and GITHUB_REPO."
                )
            raise NotFoundError(
                f"GitHub repository '{self.owner}/{self.repo}' or resource was not found. "
                "Check GITHUB_OWNER and GITHUB_REPO."
            )

        err_body = ""
        try:
            err_json = resp.json()
            err_body = err_json.get("message", "")
        except Exception:
            err_body = resp.text

        clean_msg = self._sanitize(err_body)
        resp_headers = getattr(resp, "headers", None) or {}

        if resp.status_code == 401 or "Bad credentials" in clean_msg:
            raise GitHubApiError("GitHub authentication failed. Check GITHUB_TOKEN.", 502)

        is_rate_limited = resp.status_code == 403 and (
            "rate limit" in clean_msg.lower()
            or str(resp_headers.get("X-RateLimit-Remaining", "")) == "0"
        )
        if is_rate_limited:
            reset_raw = resp_headers.get("X-RateLimit-Reset")
            if reset_raw and str(reset_raw).isdigit():
                reset_dt = datetime.fromtimestamp(int(reset_raw), tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                raise GitHubApiError(
                    f"GitHub API rate limit exceeded. Resets at {reset_dt}.", 502
                )
            raise GitHubApiError("GitHub API rate limit exceeded. Please try again later.", 502)

        raise GitHubApiError(f"GitHub API error ({resp.status_code}): {clean_msg}", 502)

    @staticmethod
    def _map_run_status(c_status: str | None, c_concl: str | None) -> str:
        if c_status == "completed":
            if c_concl == "success":
                return "success"
            if c_concl == "cancelled":
                return "cancelled"
            return "failed"
        if c_status in ("in_progress", "queued", "waiting"):
            return "running"
        return "cancelled"

    def list_runs(self, status: str | None = None, branch: str | None = None, event: str | None = None, search: str | None = None) -> list[dict]:
        wf_quoted = quote(self.workflow_file, safe="")
        url = f"{self.base_url}/repos/{self._repo_path()}/actions/workflows/{wf_quoted}/runs"
        data = self._get(url, params={"per_page": 100})
        raw_runs = data.get("workflow_runs") or []

        normalized = []
        for r in raw_runs[:100]:
            run_status = self._map_run_status(r.get("status"), r.get("conclusion"))

            started_at = r.get("run_started_at") or r.get("created_at")
            updated_at = r.get("updated_at")
            duration = None
            if started_at and updated_at and run_status != "running":
                try:
                    s_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                    u_dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                    duration = max(1, int((u_dt - s_dt).total_seconds()))
                except Exception:
                    duration = None

            ev = r.get("event", "push")
            is_pr = (ev == "pull_request")
            head_sha = r.get("head_sha") or ""
            short_sha = head_sha[:7] if head_sha else "unknown"
            head_commit = r.get("head_commit") or {}
            commit_author = (head_commit.get("author") or {}).get("name")
            actor_login = (r.get("actor") or {}).get("login")
            can_deploy = (run_status == "success" and not is_pr)

            normalized.append({
                "id": str(r.get("id")),
                "run_number": r.get("run_number", 0),
                "commit_sha": head_sha,
                "short_sha": short_sha,
                "message": head_commit.get("message") or r.get("display_title") or "",
                "author": commit_author or actor_login or "Unknown",
                "branch": r.get("head_branch") or "main",
                "event": ev,
                "status": run_status,
                "duration_seconds": duration or 120,
                "started_at": started_at,
                "finished_at": updated_at if run_status != "running" else None,
                "deploys": can_deploy,
                "image_tag": f"v2.4.{r.get('run_number', 0)}-{short_sha}" if can_deploy else None,
                "image_uri": self._build_image_uri(short_sha) if can_deploy else None,
                "note": "Tests only, no deploy" if is_pr else None,
            })

        # Apply filters
        results = normalized
        if status and status != "all":
            results = [r for r in results if r["status"] == status]
        if branch and branch != "all":
            results = [r for r in results if r["branch"] == branch]
        if event and event != "all":
            results = [r for r in results if r["event"] == event]
        if search:
            q = search.lower().strip()
            results = [
                r for r in results
                if q in r["message"].lower()
                or q in r["commit_sha"].lower()
                or q in r["author"].lower()
                or q in r["branch"].lower()
                or q in str(r["run_number"])
            ]

        return results

    def get_run(self, run_id: str) -> dict:
        rid_quoted = quote(str(run_id), safe="")
        url = f"{self.base_url}/repos/{self._repo_path()}/actions/runs/{rid_quoted}"
        r = self._get(url)

        # Retrieve jobs to map stages
        jobs_url = f"{self.base_url}/repos/{self._repo_path()}/actions/runs/{rid_quoted}/jobs"
        jobs_data = self._get(jobs_url)
        jobs = jobs_data.get("jobs") or []

        # Stage mapping: check step keywords in order: deploy, push/ecr, build, lint/test/flake8/pytest
        stages_map = {
            sid: {"status": "pending", "started_at": None, "finished_at": None, "duration_seconds": None, "job_id": None}
            for sid in ["test", "build", "push", "deploy"]
        }

        for job in jobs:
            job_id = job.get("id")
            steps = job.get("steps") or []
            for step in steps:
                step_name = (step.get("name") or "").lower()
                s_concl = step.get("conclusion")
                s_stat = step.get("status")

                if s_stat in ("in_progress", "queued", "waiting"):
                    step_status = "running"
                elif s_concl == "success":
                    step_status = "success"
                elif s_concl in ("failure", "timed_out"):
                    step_status = "failed"
                elif s_concl == "skipped":
                    step_status = "skipped"
                else:
                    step_status = "pending"

                target_stage = None
                if "deploy" in step_name:
                    target_stage = "deploy"
                elif "push" in step_name or "ecr" in step_name:
                    target_stage = "push"
                elif "build" in step_name:
                    target_stage = "build"
                elif any(k in step_name for k in ["lint", "test", "flake8", "pytest"]):
                    target_stage = "test"

                if target_stage:
                    stages_map[target_stage]["status"] = step_status
                    stages_map[target_stage]["job_id"] = job_id

        raw_stages = []
        for s_def in STAGE_DEFINITIONS:
            sid = s_def["id"]
            st_info = stages_map[sid]
            raw_stages.append({
                "id": sid,
                "name": s_def["name"],
                "status": st_info["status"],
                "duration_seconds": 45 if st_info["status"] == "success" else None,
                "started_at": st_info["started_at"],
                "finished_at": st_info["finished_at"],
                "_job_id": st_info["job_id"],
            })

        is_pr = (r.get("event") == "pull_request")
        norm_stages = normalize_stage_progression(raw_stages, is_pull_request=is_pr)

        head_sha = r.get("head_sha") or ""
        short_sha = head_sha[:7] if head_sha else "unknown"
        head_commit = r.get("head_commit") or {}
        commit_author = (head_commit.get("author") or {}).get("name")
        actor_login = (r.get("actor") or {}).get("login")

        run_status = self._map_run_status(r.get("status"), r.get("conclusion"))
        can_deploy = (run_status == "success" and not is_pr)

        return {
            "id": str(r.get("id")),
            "run_number": r.get("run_number", 0),
            "commit_sha": head_sha,
            "short_sha": short_sha,
            "message": head_commit.get("message") or r.get("display_title") or "",
            "author": commit_author or actor_login or "Unknown",
            "branch": r.get("head_branch") or "main",
            "event": r.get("event", "push"),
            "status": run_status,
            "duration_seconds": 180,
            "started_at": r.get("run_started_at") or r.get("created_at"),
            "finished_at": r.get("updated_at") if run_status != "running" else None,
            "deploys": can_deploy,
            "image_tag": f"v2.4.{r.get('run_number', 0)}-{short_sha}" if can_deploy else None,
            "image_uri": self._build_image_uri(short_sha) if can_deploy else None,
            "note": "Tests only, no deploy" if is_pr else None,
            "stages": norm_stages,
        }

    def get_stages(self, run_id: str) -> list[dict]:
        run = self.get_run(run_id)
        return run["stages"]

    def get_logs(self, run_id: str, stage: str) -> dict:
        if stage not in ["test", "build", "push", "deploy"]:
            raise NotFoundError(f"Invalid stage '{stage}'")

        run = self.get_run(run_id)
        job_id = None
        for s in run.get("stages", []):
            if s["id"] == stage and s.get("_job_id"):
                job_id = s["_job_id"]
                break

        if not job_id:
            rid_quoted = quote(str(run_id), safe="")
            jobs_url = f"{self.base_url}/repos/{self._repo_path()}/actions/runs/{rid_quoted}/jobs"
            jobs = self._get(jobs_url).get("jobs") or []
            if jobs:
                job_id = jobs[0].get("id")

        if not job_id:
            return {"stage": stage, "lines": ["No logs available."], "truncated": False}

        logs_url = f"{self.base_url}/repos/{self._repo_path()}/actions/jobs/{quote(str(job_id), safe='')}/logs"
        try:
            try:
                resp = self.session.get(logs_url, timeout=10, allow_redirects=True)
            except TypeError:
                resp = self.session.get(logs_url, timeout=10)
            if resp.status_code == 404:
                return {"stage": stage, "lines": ["Logs expired or not found."], "truncated": False}
            self._handle_response_errors(resp, url=logs_url)
            raw_text = self._sanitize(resp.text)
        except requests.RequestException as e:
            raise GitHubApiError(f"Failed to fetch logs: {type(e).__name__}", 502)

        lines = raw_text.splitlines()
        truncated = len(lines) > 500
        return {
            "stage": stage,
            "lines": lines[-500:],
            "truncated": truncated,
        }

    def dispatch_rollback(self, image_tag: str, deployment_id: int) -> dict:
        wf_quoted = quote(self.rollback_workflow_file, safe="")
        url = f"{self.base_url}/repos/{self._repo_path()}/actions/workflows/{wf_quoted}/dispatches"
        payload = {
            "ref": self.branch,
            "inputs": {
                "image_tag": image_tag,
                "deployment_id": str(deployment_id),
            }
        }
        try:
            resp = self.session.post(url, json=payload, timeout=10)
            self._handle_response_errors(resp, url=url)
        except requests.RequestException as e:
            raise GitHubApiError(f"Rollback dispatch failed: {type(e).__name__}", 502)

        return {"status": "dispatched", "image_tag": image_tag, "deployment_id": deployment_id}

    def list_secret_names(self) -> dict:
        url = f"{self.base_url}/repos/{self._repo_path()}/actions/secrets"
        try:
            resp = self.session.get(url, timeout=10)
            if resp.status_code in (401, 403, 404):
                return {"available": False, "secrets": []}
            self._handle_response_errors(resp, url=url)
            data = resp.json()
            secrets = [{"name": s.get("name"), "configured": True} for s in data.get("secrets", [])]
            return {"available": True, "secrets": secrets}
        except Exception:
            return {"available": False, "secrets": []}

    def list_variable_names(self) -> dict:
        url = f"{self.base_url}/repos/{self._repo_path()}/actions/variables"
        try:
            resp = self.session.get(url, timeout=10)
            if resp.status_code in (401, 403, 404):
                return {"available": False, "variables": []}
            self._handle_response_errors(resp, url=url)
            data = resp.json()
            variables = {v.get("name"): v.get("value") for v in data.get("variables", []) if v.get("name")}
            return {"available": True, "variables": variables}
        except Exception:
            return {"available": False, "variables": []}
