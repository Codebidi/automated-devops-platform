import random
from datetime import datetime, timezone, timedelta
from .stages import STAGE_DEFINITIONS, normalize_stage_progression
from .errors import NotFoundError

MOCK_LOG_LINES = {
    "test": [
        "==> Initializing test runner on Ubuntu 22.04 LTS...",
        "==> Cloning repository git@github.com:codebidi/ai-devops-platform.git",
        "==> Checking out commit $GITHUB_SHA",
        "==> Setting up Python 3.12 and installing dependencies...",
        "==> Running flake8 linter...",
        "[flake8] 0 syntax errors, 0 style warnings.",
        "==> Running pytest suite with coverage...",
        "tests/test_api.py::test_health PASSED [ 12%]",
        "tests/test_api.py::test_auth PASSED [ 38%]",
        "tests/test_api.py::test_runs PASSED [ 62%]",
        "tests/test_api.py::test_rollback PASSED [ 88%]",
        "tests/test_api.py::test_webhooks PASSED [100%]",
        "==> All 38 unit tests passed in 14.2s (coverage: 94.1%)",
    ],
    "build": [
        "==> Starting Docker Buildx engine...",
        "==> Loading build context from repository root...",
        "[1/7] FROM python:3.12-slim AS base",
        "[2/7] WORKDIR /app",
        "[3/7] COPY requirements.txt .",
        "[4/7] RUN pip install --no-cache-dir -r requirements.txt",
        "[5/7] COPY . .",
        "[6/7] EXPOSE 8000",
        "[7/7] Committing container layer sha256:7f3b89a42c...",
        "==> Docker image built successfully: app:local-build",
        "==> Total image size: 142.6MB",
    ],
    "push": [
        "==> Authenticating to AWS ECR in region us-east-1...",
        "==> Login Succeeded",
        "==> Tagging image as 123456789012.dkr.ecr.us-east-1.amazonaws.com/codebidi-platform:$IMAGE_TAG",
        "==> Pushing layer [1/4] (sha256:1a2b3c...): 42.1MB uploaded",
        "==> Pushing layer [2/4] (sha256:4d5e6f...): 18.4MB uploaded",
        "==> Pushing layer [3/4] (sha256:7a8b9c...): 1.2MB uploaded",
        "==> Pushing manifest to Amazon ECR...",
        "==> digest: sha256:90e1f4... size: 1820",
        "==> ECR Push completed successfully.",
    ],
    "deploy": [
        "==> Establishing SSH tunnel to AWS EC2 production host...",
        "==> Authenticated host key fingerprint: SHA256:Ed25519-v8Z4...",
        "==> Pulling target release image from ECR...",
        "==> Executing blue-green container switchover...",
        "==> Container devops-web-worker started with PID 4108",
        "==> Initiating health probe: GET http://127.0.0.1:8080/health",
        "==> Health probe attempt 1/5: HTTP 200 OK (latency: 14ms)",
        "==> Traffic routed to new container. Zero-downtime deployment finished.",
    ],
    "failed_test": [
        "==> Running pytest suite...",
        "tests/test_api.py::test_auth FAILED [ 35%]",
        "AssertionError: expected status 200, got 401",
        "==> Error: Process completed with exit code 1. Stage failed.",
    ],
    "failed_build": [
        "==> Docker build in progress...",
        "ERROR: failed to solve: process '/bin/sh -c pip install' did not complete successfully: exit code 2",
        "==> Error: Docker build failed.",
    ],
    "failed_deploy": [
        "==> Health probe attempt 1/5: Connection refused",
        "==> Health probe attempt 2/5: HTTP 500 Internal Server Error",
        "==> Health probe attempt 3/5: Timeout after 60 seconds",
        "==> Error: Container failed health verification. Rollback required.",
    ]
}

class MockProvider:
    """Deterministic mock provider generating realistic CI/CD data and seed records."""

    def __init__(self):
        self._runs = self._generate_deterministic_runs()

    def _generate_deterministic_runs(self) -> list[dict]:
        rng = random.Random(42)
        authors = ["Sarah Jenkins", "Alex Rivera", "David Kim", "Elena Rostova", "Marcus Chen"]
        branches = ["main", "feature/auth-jwt", "fix/ec2-health", "perf/redis-cache", "release/v2.4.0"]
        messages = [
            "feat(metrics): add real-time pipeline latency tracker",
            "fix(deploy): optimize EC2 blue-green health check threshold",
            "feat(auth): add OAuth2 refresh token rotation",
            "refactor(ecr): stream image compression layers concurrently",
            "test(runner): update unit test suites for edge cases",
            "chore(deps): bump vite from 5.4.1 to 5.4.3",
            "feat(ui): add dark mode high-contrast palette",
            "fix(k8s): handle ingress renegotiation timeouts",
            "feat(logging): structured JSON logging with request tracing",
            "perf(db): add compound index for runs timestamp lookup",
        ]

        runs = []
        base_time = datetime(2026, 10, 9, 15, 0, 0, tzinfo=timezone.utc)

        # Generate exactly 25 runs (run_number 25 down to 1)
        for i in range(25, 0, -1):
            run_id = f"run-{i}"
            delta_mins = (25 - i) * 35
            start_dt = base_time - timedelta(minutes=delta_mins)
            commit_sha = f"{rng.getrandbits(160):040x}"
            short_sha = commit_sha[:7]

            # Specific case allocations
            if i == 25:
                # Exactly one running run
                event = "push"
                branch = "main"
                status = "running"
                fail_stage = None
                duration = 95
                finished_dt = None
            elif i == 24:
                # All success on main (current deployed)
                event = "push"
                branch = "main"
                status = "success"
                fail_stage = None
                duration = 215
                finished_dt = start_dt + timedelta(seconds=duration)
            elif i == 23:
                # Failed at deploy stage
                event = "push"
                branch = "main"
                status = "failed"
                fail_stage = "deploy"
                duration = 190
                finished_dt = start_dt + timedelta(seconds=duration)
            elif i == 22:
                # Passing pull request run
                event = "pull_request"
                branch = "feature/auth-jwt"
                status = "success"
                fail_stage = None
                duration = 45
                finished_dt = start_dt + timedelta(seconds=duration)
            elif i == 21:
                # Failing pull request run (failed at test)
                event = "pull_request"
                branch = "fix/ec2-health"
                status = "failed"
                fail_stage = "test"
                duration = 32
                finished_dt = start_dt + timedelta(seconds=duration)
            elif i == 20:
                # Failed at build stage
                event = "push"
                branch = "main"
                status = "failed"
                fail_stage = "build"
                duration = 85
                finished_dt = start_dt + timedelta(seconds=duration)
            elif i == 19:
                # Failed at test stage
                event = "push"
                branch = "main"
                status = "failed"
                fail_stage = "test"
                duration = 28
                finished_dt = start_dt + timedelta(seconds=duration)
            else:
                # Remaining runs (mix of successes and PRs)
                event = "pull_request" if (i % 3 == 0) else "push"
                branch = rng.choice(branches) if event == "pull_request" else "main"
                is_fail = (i in (15, 11, 7))
                fail_stage = rng.choice(["test", "build", "deploy"]) if is_fail else None
                status = "failed" if is_fail else "success"
                duration = rng.randint(40, 230)
                finished_dt = start_dt + timedelta(seconds=duration)

            is_pr = (event == "pull_request")
            deploys = (status == "success" and not is_pr)
            image_tag = f"v2.4.{i}-{short_sha}" if deploys else None
            image_uri = f"123456789012.dkr.ecr.us-east-1.amazonaws.com/codebidi-platform:{short_sha}" if deploys else None

            # Generate 4 stages
            raw_stages = []
            for s_def in STAGE_DEFINITIONS:
                sid = s_def["id"]
                s_name = s_def["name"]

                if sid == "test":
                    st_status = "failed" if fail_stage == "test" else "success"
                elif sid == "build":
                    st_status = "running" if (status == "running") else ("failed" if fail_stage == "build" else "success")
                elif sid == "push":
                    st_status = "pending" if (status == "running") else "success"
                elif sid == "deploy":
                    st_status = "pending" if (status == "running") else ("failed" if fail_stage == "deploy" else "success")

                raw_stages.append({
                    "id": sid,
                    "name": s_name,
                    "status": st_status,
                    "duration_seconds": 35 if st_status == "success" else None,
                    "started_at": start_dt.isoformat(),
                    "finished_at": finished_dt.isoformat() if finished_dt else None,
                })

            normalized_stages = normalize_stage_progression(raw_stages, is_pull_request=is_pr)

            runs.append({
                "id": run_id,
                "run_number": i,
                "commit_sha": commit_sha,
                "short_sha": short_sha,
                "message": messages[(25 - i) % len(messages)],
                "author": authors[(25 - i) % len(authors)],
                "branch": branch,
                "event": event,
                "status": status,
                "duration_seconds": duration,
                "started_at": start_dt.isoformat(),
                "finished_at": finished_dt.isoformat() if finished_dt else None,
                "deploys": deploys,
                "image_tag": image_tag,
                "image_uri": image_uri,
                "note": "Tests only, no deploy" if is_pr else None,
                "fail_stage": fail_stage,
                "stages": normalized_stages,
            })

        return runs

    def list_runs(self, status: str | None = None, branch: str | None = None, event: str | None = None, search: str | None = None) -> list[dict]:
        results = list(self._runs)

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
        for r in self._runs:
            if r["id"] == str(run_id) or str(r["run_number"]) == str(run_id):
                return r
        raise NotFoundError(f"Pipeline run '{run_id}' not found")

    def get_stages(self, run_id: str) -> list[dict]:
        run = self.get_run(run_id)
        return run["stages"]

    def get_logs(self, run_id: str, stage: str) -> dict:
        run = self.get_run(run_id)
        if stage not in ["test", "build", "push", "deploy"]:
            raise NotFoundError(f"Invalid stage '{stage}'")

        if run.get("fail_stage") == stage:
            lines = MOCK_LOG_LINES.get(f"failed_{stage}", MOCK_LOG_LINES[stage])
        else:
            lines = MOCK_LOG_LINES.get(stage, ["No logs recorded for this stage."])

        return {
            "stage": stage,
            "lines": lines[-500:],
            "truncated": False,
        }

    def list_secret_names(self) -> dict:
        return {
            "available": True,
            "secrets": [
                {"name": "AWS_ACCESS_KEY_ID", "configured": True},
                {"name": "AWS_SECRET_ACCESS_KEY", "configured": True},
                {"name": "AWS_REGION", "configured": True},
                {"name": "EC2_HOST", "configured": True},
                {"name": "EC2_USER", "configured": True},
                {"name": "EC2_SSH_KEY", "configured": True},
                {"name": "WEBHOOK_SECRET", "configured": True},
                {"name": "DASHBOARD_API_URL", "configured": True},
            ]
        }

    def dispatch_rollback(self, image_tag: str, deployment_id: int) -> dict:
        return {"status": "dispatched", "image_tag": image_tag, "deployment_id": deployment_id}
