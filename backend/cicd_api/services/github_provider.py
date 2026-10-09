import time
import requests
from typing import Any
from .stages import STAGE_DEFINITIONS, normalize_stage_progression
from .errors import NotFoundError, GitHubApiError

class GitHubProvider:
    """Client for interacting with the GitHub Actions REST API with caching and error masking."""

    def __init__(
        self,
        token: str,
        owner: str,
        repo: str,
        workflow_file: str = "deploy.yml",
        rollback_workflow_file: str = "rollback.yml",
        cache_ttl_seconds: int = 10,
        session: requests.Session | None = None,
    ):
        self.token = token
        self.owner = owner
        self.repo = repo
        self.workflow_file = workflow_file
        self.rollback_workflow_file = rollback_workflow_file
        self.cache_ttl = cache_ttl_seconds
        self.base_url = "https://api.github.com"
        self._cache: dict[str, tuple[float, Any]] = {}

        self.session = session or requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })

    def _get(self, url: str, params: dict | None = None, use_cache: bool = True) -> Any:
        cache_key = f"{url}?{sorted(params.items()) if params else ''}"
        now = time.time()

        if use_cache and cache_key in self._cache:
            ts, val = self._cache[cache_key]
            if now - ts < self.cache_ttl:
                return val

        try:
            resp = self.session.get(url, params=params, timeout=10)
        except requests.RequestException as e:
            raise GitHubApiError(f"GitHub network communication error: {type(e).__name__}", 502)

        self._handle_response_errors(resp)
        data = resp.json()

        if use_cache:
            self._cache[cache_key] = (now, data)
        return data

    def _handle_response_errors(self, resp: requests.Response) -> None:
        if resp.status_code == 200 or resp.status_code == 201 or resp.status_code == 202 or resp.status_code == 204:
            return
        if resp.status_code == 404:
            raise NotFoundError("Requested GitHub resource was not found")

        err_body = ""
        try:
            err_json = resp.json()
            err_body = err_json.get("message", "")
        except Exception:
            err_body = resp.text

        # Sanitize error body so tokens or sensitive headers are never leaked
        clean_msg = err_body.replace(self.token, "[REDACTED]") if self.token else err_body

        if resp.status_code == 401 or "Bad credentials" in clean_msg:
            raise GitHubApiError("GitHub authentication failed. Check GITHUB_TOKEN.", 502)
        if resp.status_code == 403 and "rate limit" in clean_msg.lower():
            raise GitHubApiError("GitHub API rate limit exceeded. Please try again later.", 502)

        raise GitHubApiError(f"GitHub API error ({resp.status_code}): {clean_msg}", 502)

    def list_runs(self, status: str | None = None, branch: str | None = None, event: str | None = None, search: str | None = None) -> list[dict]:
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/workflows/{self.workflow_file}/runs"
        data = self._get(url)
        raw_runs = data.get("workflow_runs", [])

        normalized = []
        for r in raw_runs:
            c_status = r.get("status")
            c_concl = r.get("conclusion")

            if c_status == "completed":
                run_status = "success" if c_concl == "success" else "failed"
            elif c_status in ("in_progress", "queued", "waiting"):
                run_status = "running"
            else:
                run_status = "cancelled"

            started_at = r.get("run_started_at") or r.get("created_at")
            updated_at = r.get("updated_at")
            duration = None
            if started_at and updated_at and run_status != "running":
                try:
                    from datetime import datetime
                    s_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                    u_dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                    duration = max(1, int((u_dt - s_dt).total_seconds()))
                except Exception:
                    duration = None

            ev = r.get("event", "push")
            is_pr = (ev == "pull_request")
            head_sha = r.get("head_sha", "")
            short_sha = head_sha[:7] if head_sha else "unknown"
            head_commit = r.get("head_commit") or {}

            normalized.append({
                "id": str(r.get("id")),
                "run_number": r.get("run_number", 0),
                "commit_sha": head_sha,
                "short_sha": short_sha,
                "message": head_commit.get("message", r.get("display_title", "")),
                "author": head_commit.get("author", {}).get("name") or r.get("actor", {}).get("login", "Unknown"),
                "branch": r.get("head_branch", "main"),
                "event": ev,
                "status": run_status,
                "duration_seconds": duration or 120,
                "started_at": started_at,
                "finished_at": updated_at if run_status != "running" else None,
                "deploys": (run_status == "success" and not is_pr),
                "image_tag": f"v2.4.{r.get('run_number', 0)}-{short_sha}" if (run_status == "success" and not is_pr) else None,
                "image_uri": f"123456789012.dkr.ecr.us-east-1.amazonaws.com/{self.repo}:{short_sha}" if (run_status == "success" and not is_pr) else None,
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
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/runs/{run_id}"
        r = self._get(url)

        # Retrieve jobs to map stages
        jobs_url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/runs/{run_id}/jobs"
        jobs_data = self._get(jobs_url)
        jobs = jobs_data.get("jobs", [])

        # Stage mapping: check step keywords in order: deploy, push/ecr, build, lint/test/flake8/pytest
        stages_map = {sid: {"status": "pending", "started_at": None, "finished_at": None, "duration_seconds": None, "job_id": None} for sid in ["test", "build", "push", "deploy"]}

        for job in jobs:
            job_id = job.get("id")
            for step in job.get("steps", []):
                step_name = (step.get("name") or "").lower()
                s_concl = step.get("conclusion")
                s_stat = step.get("status")

                if s_stat in ("in_progress", "queued"):
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

        head_sha = r.get("head_sha", "")
        head_commit = r.get("head_commit") or {}

        c_status = r.get("status")
        c_concl = r.get("conclusion")
        if c_status == "completed":
            run_status = "success" if c_concl == "success" else "failed"
        elif c_status in ("in_progress", "queued", "waiting"):
            run_status = "running"
        else:
            run_status = "cancelled"

        return {
            "id": str(r.get("id")),
            "run_number": r.get("run_number", 0),
            "commit_sha": head_sha,
            "short_sha": head_sha[:7] if head_sha else "unknown",
            "message": head_commit.get("message", r.get("display_title", "")),
            "author": head_commit.get("author", {}).get("name") or r.get("actor", {}).get("login", "Unknown"),
            "branch": r.get("head_branch", "main"),
            "event": r.get("event", "push"),
            "status": run_status,
            "duration_seconds": 180,
            "started_at": r.get("run_started_at") or r.get("created_at"),
            "finished_at": r.get("updated_at") if run_status != "running" else None,
            "deploys": (run_status == "success" and not is_pr),
            "image_tag": f"v2.4.{r.get('run_number', 0)}-{head_sha[:7]}" if (run_status == "success" and not is_pr) else None,
            "image_uri": f"123456789012.dkr.ecr.us-east-1.amazonaws.com/{self.repo}:{head_sha[:7]}" if (run_status == "success" and not is_pr) else None,
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
            # Fallback to fetching first job of run if specific step job wasn't matched
            jobs_url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/runs/{run_id}/jobs"
            jobs = self._get(jobs_url).get("jobs", [])
            if jobs:
                job_id = jobs[0].get("id")

        if not job_id:
            return {"stage": stage, "lines": ["No logs available."], "truncated": False}

        logs_url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/jobs/{job_id}/logs"
        try:
            resp = self.session.get(logs_url, timeout=10)
            if resp.status_code == 404:
                return {"stage": stage, "lines": ["Logs expired or not found."], "truncated": False}
            self._handle_response_errors(resp)
            raw_text = resp.text
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
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/workflows/{self.rollback_workflow_file}/dispatches"
        payload = {
            "ref": "main",
            "inputs": {
                "image_tag": image_tag,
                "deployment_id": str(deployment_id),
            }
        }
        try:
            resp = self.session.post(url, json=payload, timeout=10)
            self._handle_response_errors(resp)
        except requests.RequestException as e:
            raise GitHubApiError(f"Rollback dispatch failed: {type(e).__name__}", 502)

        return {"status": "dispatched", "image_tag": image_tag, "deployment_id": deployment_id}

    def list_secret_names(self) -> dict:
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/secrets"
        try:
            resp = self.session.get(url, timeout=10)
            if resp.status_code in (401, 403, 404):
                return {"available": False, "secrets": []}
            self._handle_response_errors(resp)
            data = resp.json()
            secrets = [{"name": s.get("name"), "configured": True} for s in data.get("secrets", [])]
            return {"available": True, "secrets": secrets}
        except Exception:
            return {"available": False, "secrets": []}
