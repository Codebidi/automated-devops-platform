import json
import unittest
import requests
from cicd_api.services.github_provider import GitHubProvider
from cicd_api.services.errors import GitHubApiError, NotFoundError

class FakeResponse:
    def __init__(self, status_code=200, json_data=None, text=""):
        self.status_code = status_code
        self._json_data = json_data
        self.text = text or (json.dumps(json_data) if json_data is not None else "")

    def json(self):
        if self._json_data is not None:
            return self._json_data
        return json.loads(self.text)

class FakeSession:
    def __init__(self):
        self.headers = {}
        self.get_responses = {}
        self.post_responses = {}
        self.get_calls = []
        self.post_calls = []

    def get(self, url, params=None, timeout=None):
        self.get_calls.append((url, params))
        if url in self.get_responses:
            return self.get_responses[url]
        # Wildcard / prefix matching
        for pattern, resp in self.get_responses.items():
            if pattern in url:
                return resp
        return FakeResponse(404, {"message": "Not Found"})

    def post(self, url, json=None, timeout=None):
        self.post_calls.append((url, json))
        if url in self.post_responses:
            return self.post_responses[url]
        for pattern, resp in self.post_responses.items():
            if pattern in url:
                return resp
        return FakeResponse(204)

class TestGitHubProvider(unittest.TestCase):
    def setUp(self):
        self.fake_session = FakeSession()
        self.provider = GitHubProvider(
            token="ghp_testsecrettoken12345",
            owner="testowner",
            repo="testrepo",
            workflow_file="deploy.yml",
            rollback_workflow_file="rollback.yml",
            cache_ttl_seconds=10,
            session=self.fake_session,
        )

    def test_list_runs_normalization_and_filters(self):
        runs_url = "https://api.github.com/repos/testowner/testrepo/actions/workflows/deploy.yml/runs"
        self.fake_session.get_responses[runs_url] = FakeResponse(200, {
            "workflow_runs": [
                {
                    "id": 101,
                    "run_number": 1,
                    "status": "completed",
                    "conclusion": "success",
                    "event": "push",
                    "head_branch": "main",
                    "head_sha": "abcdef1234567890abcdef1234567890abcdef12",
                    "run_started_at": "2026-10-09T10:00:00Z",
                    "updated_at": "2026-10-09T10:02:00Z",
                    "head_commit": {"message": "feat: release v1", "author": {"name": "Alice"}},
                },
                {
                    "id": 102,
                    "run_number": 2,
                    "status": "in_progress",
                    "conclusion": None,
                    "event": "pull_request",
                    "head_branch": "feature/ui",
                    "head_sha": "bbbbbb1234567890abcdef1234567890abcdef12",
                    "run_started_at": "2026-10-09T11:00:00Z",
                    "updated_at": "2026-10-09T11:01:00Z",
                    "head_commit": {"message": "ui: new navbar", "author": {"name": "Bob"}},
                }
            ]
        })

        runs = self.provider.list_runs()
        self.assertEqual(len(runs), 2)
        self.assertEqual(runs[0]["status"], "success")
        self.assertTrue(runs[0]["deploys"])
        self.assertEqual(runs[0]["short_sha"], "abcdef1")
        self.assertEqual(runs[1]["status"], "running")
        self.assertFalse(runs[1]["deploys"])

        # Filter by branch
        main_runs = self.provider.list_runs(branch="main")
        self.assertEqual(len(main_runs), 1)
        self.assertEqual(main_runs[0]["branch"], "main")

        # Filter by search
        search_runs = self.provider.list_runs(search="navbar")
        self.assertEqual(len(search_runs), 1)
        self.assertEqual(search_runs[0]["author"], "Bob")

    def test_get_run_step_keyword_mapping_to_stages(self):
        run_url = "https://api.github.com/repos/testowner/testrepo/actions/runs/101"
        jobs_url = "https://api.github.com/repos/testowner/testrepo/actions/runs/101/jobs"

        self.fake_session.get_responses[run_url] = FakeResponse(200, {
            "id": 101,
            "run_number": 1,
            "status": "completed",
            "conclusion": "success",
            "event": "push",
            "head_branch": "main",
            "head_sha": "abcdef1234567890abcdef1234567890abcdef12",
            "run_started_at": "2026-10-09T10:00:00Z",
            "updated_at": "2026-10-09T10:03:00Z",
            "head_commit": {"message": "build test", "author": {"name": "Alice"}},
        })

        self.fake_session.get_responses[jobs_url] = FakeResponse(200, {
            "jobs": [
                {
                    "id": 501,
                    "name": "test-job",
                    "steps": [
                        {"name": "Run flake8 linter", "status": "completed", "conclusion": "success"},
                        {"name": "Run pytest suite", "status": "completed", "conclusion": "success"},
                    ]
                },
                {
                    "id": 502,
                    "name": "deploy-job",
                    "steps": [
                        {"name": "Build Docker image layer", "status": "completed", "conclusion": "success"},
                        {"name": "Push image to ECR repository", "status": "completed", "conclusion": "success"},
                        {"name": "Deploy to EC2 host and verify", "status": "completed", "conclusion": "success"},
                    ]
                }
            ]
        })

        run = self.provider.get_run("101")
        stages = run["stages"]
        self.assertEqual(len(stages), 4)
        for s in stages:
            self.assertEqual(s["status"], "success")

    def test_get_run_failed_stage_skips_later_stages(self):
        run_url = "https://api.github.com/repos/testowner/testrepo/actions/runs/103"
        jobs_url = "https://api.github.com/repos/testowner/testrepo/actions/runs/103/jobs"

        self.fake_session.get_responses[run_url] = FakeResponse(200, {
            "id": 103,
            "run_number": 3,
            "status": "completed",
            "conclusion": "failure",
            "event": "push",
            "head_branch": "main",
            "head_sha": "1234567890abcdef1234567890abcdef12345678",
            "head_commit": {"message": "failing build"},
        })

        self.fake_session.get_responses[jobs_url] = FakeResponse(200, {
            "jobs": [
                {
                    "id": 503,
                    "steps": [
                        {"name": "Run pytest suite", "status": "completed", "conclusion": "success"},
                        {"name": "Build Docker container", "status": "completed", "conclusion": "failure"},
                        {"name": "Push to ECR", "status": "completed", "conclusion": "skipped"},
                        {"name": "Deploy to EC2", "status": "completed", "conclusion": "skipped"},
                    ]
                }
            ]
        })

        run = self.provider.get_run("103")
        stages = run["stages"]
        self.assertEqual(stages[0]["id"], "test")
        self.assertEqual(stages[0]["status"], "success")
        self.assertEqual(stages[1]["id"], "build")
        self.assertEqual(stages[1]["status"], "failed")
        self.assertEqual(stages[2]["id"], "push")
        self.assertEqual(stages[2]["status"], "skipped")
        self.assertEqual(stages[3]["id"], "deploy")
        self.assertEqual(stages[3]["status"], "skipped")

    def test_get_logs_and_truncation(self):
        run_url = "https://api.github.com/repos/testowner/testrepo/actions/runs/101"
        jobs_url = "https://api.github.com/repos/testowner/testrepo/actions/runs/101/jobs"
        logs_url = "https://api.github.com/repos/testowner/testrepo/actions/jobs/501/logs"

        self.fake_session.get_responses[run_url] = FakeResponse(200, {
            "id": 101,
            "run_number": 1,
            "status": "completed",
            "head_commit": {"message": "ok"},
        })
        self.fake_session.get_responses[jobs_url] = FakeResponse(200, {
            "jobs": [{"id": 501, "steps": [{"name": "Run pytest", "status": "completed", "conclusion": "success"}]}]
        })

        # 600 lines of logs
        log_lines = [f"Log line {i}" for i in range(600)]
        self.fake_session.get_responses[logs_url] = FakeResponse(200, text="\n".join(log_lines))

        res = self.provider.get_logs("101", "test")
        self.assertEqual(res["stage"], "test")
        self.assertEqual(len(res["lines"]), 500)
        self.assertTrue(res["truncated"])
        self.assertEqual(res["lines"][-1], "Log line 599")

    def test_get_logs_expired_returns_clean_message(self):
        run_url = "https://api.github.com/repos/testowner/testrepo/actions/runs/101"
        jobs_url = "https://api.github.com/repos/testowner/testrepo/actions/runs/101/jobs"
        logs_url = "https://api.github.com/repos/testowner/testrepo/actions/jobs/501/logs"

        self.fake_session.get_responses[run_url] = FakeResponse(200, {
            "id": 101,
            "head_commit": {},
        })
        self.fake_session.get_responses[jobs_url] = FakeResponse(200, {
            "jobs": [{"id": 501, "steps": [{"name": "Run pytest", "status": "completed", "conclusion": "success"}]}]
        })
        self.fake_session.get_responses[logs_url] = FakeResponse(404, text="Not Found")

        res = self.provider.get_logs("101", "test")
        self.assertFalse(res["truncated"])
        self.assertIn("expired", res["lines"][0].lower())

    def test_dispatch_rollback(self):
        rollback_url = "https://api.github.com/repos/testowner/testrepo/actions/workflows/rollback.yml/dispatches"
        self.fake_session.post_responses[rollback_url] = FakeResponse(204)

        result = self.provider.dispatch_rollback("v2.4.12-abc1234", 42)
        self.assertEqual(result["status"], "dispatched")
        self.assertEqual(result["image_tag"], "v2.4.12-abc1234")
        self.assertEqual(result["deployment_id"], 42)

    def test_rate_limit_and_auth_error_handling(self):
        test_url = "https://api.github.com/repos/testowner/testrepo/actions/workflows/deploy.yml/runs"

        # Rate limit
        self.fake_session.get_responses[test_url] = FakeResponse(403, {"message": "API rate limit exceeded for user"})
        with self.assertRaises(GitHubApiError) as ctx:
            self.provider.list_runs()
        self.assertIn("rate limit", str(ctx.exception.message).lower())

        # Bad token / auth error
        self.fake_session._cache = {}
        self.provider._cache = {}
        self.fake_session.get_responses[test_url] = FakeResponse(401, {"message": "Bad credentials"})
        with self.assertRaises(GitHubApiError) as ctx:
            self.provider.list_runs()
        self.assertIn("check github_token", str(ctx.exception.message).lower())

    def test_token_redacted_in_errors(self):
        test_url = "https://api.github.com/repos/testowner/testrepo/actions/workflows/deploy.yml/runs"
        secret_leak = "Error for token ghp_testsecrettoken12345 occurred"
        self.fake_session.get_responses[test_url] = FakeResponse(500, {"message": secret_leak})
        with self.assertRaises(GitHubApiError) as ctx:
            self.provider.list_runs()
        self.assertNotIn("ghp_testsecrettoken12345", str(ctx.exception.message))
        self.assertIn("[REDACTED]", str(ctx.exception.message))

    def test_list_secrets_and_permission_denial(self):
        secrets_url = "https://api.github.com/repos/testowner/testrepo/actions/secrets"

        # Success case
        self.fake_session.get_responses[secrets_url] = FakeResponse(200, {
            "secrets": [{"name": "AWS_KEY"}, {"name": "EC2_HOST"}]
        })
        res = self.provider.list_secret_names()
        self.assertTrue(res["available"])
        self.assertEqual(len(res["secrets"]), 2)

        # Permission denied case (e.g. 403)
        self.fake_session.get_responses[secrets_url] = FakeResponse(403, {"message": "Must have admin rights"})
        res = self.provider.list_secret_names()
        self.assertFalse(res["available"])
        self.assertEqual(res["secrets"], [])

    def test_caching_behavior(self):
        runs_url = "https://api.github.com/repos/testowner/testrepo/actions/workflows/deploy.yml/runs"
        self.fake_session.get_responses[runs_url] = FakeResponse(200, {"workflow_runs": []})

        self.provider.list_runs()
        self.provider.list_runs()
        # Second call should use cache, so get_calls length is 1
        self.assertEqual(len(self.fake_session.get_calls), 1)

if __name__ == "__main__":
    unittest.main()
