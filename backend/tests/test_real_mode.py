import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from cicd_api import create_app
from cicd_api.config import Config, REQUIRED_GITHUB_SECRETS, normalize_ecr_config, validate_real_mode
from cicd_api.db import find_demo_users, get_db, purge_demo_users, insert_returning_id, db_commit
from cicd_api.services.diagnostics import run_diagnostics
from cicd_api.services.errors import GitHubApiError, NotFoundError
from cicd_api.services.github_provider import GitHubProvider
from werkzeug.security import generate_password_hash


class FakeResponse:
    def __init__(self, status_code=200, json_data=None, text="", headers=None):
        self.status_code = status_code
        self._json_data = json_data
        self.text = text or (json.dumps(json_data) if json_data is not None else "")
        self.headers = headers or {}

    def json(self):
        if self._json_data is not None:
            return self._json_data
        return json.loads(self.text)


class FakeSession:
    def __init__(self):
        self.headers = {}
        self.responses = []  # optional queue or dict
        self.get_map = {}
        self.calls = []

    def get(self, url, params=None, headers=None, timeout=None, allow_redirects=True):
        self.calls.append((url, params, headers or {}))
        if url in self.get_map:
            val = self.get_map[url]
            if callable(val):
                return val(url, params, headers or {})
            return val
        for pat, val in self.get_map.items():
            if pat in url:
                if callable(val):
                    return val(url, params, headers or {})
                return val
        return FakeResponse(404, {"message": "Not Found"})

    def post(self, url, json=None, timeout=None):
        return FakeResponse(204)


class TestConfigAndEnvLoader(unittest.TestCase):
    def test_env_loader_precedence_and_quoting(self):
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text(
                '# comment line\n\n'
                'SECRET_KEY="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6"\n'
                "GITHUB_OWNER='file-owner'\n"
                'GITHUB_REPO=file-repo\n',
                encoding="utf-8",
            )
            with patch.dict(os.environ, {"GITHUB_OWNER": "real-env-owner"}, clear=True):
                cfg = Config.from_env(env_files=[env_path])
                self.assertEqual(cfg.github_owner, "real-env-owner")
                self.assertEqual(cfg.github_repo, "file-repo")
                self.assertEqual(cfg.secret_key, "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6")

    def test_ecr_uri_normalization(self):
        reg, repo = normalize_ecr_config(
            "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest",
            None,
        )
        self.assertEqual(reg, "123456789012.dkr.ecr.us-east-1.amazonaws.com")
        self.assertEqual(repo, "my-app")

        # Explicit registry wins if already set
        reg2, repo2 = normalize_ecr_config(
            "123456789012.dkr.ecr.us-east-1.amazonaws.com/org/my-app:v2",
            "999999999999.dkr.ecr.eu-west-1.amazonaws.com/",
        )
        self.assertEqual(reg2, "999999999999.dkr.ecr.eu-west-1.amazonaws.com")
        self.assertEqual(repo2, "org/my-app")

    def test_placeholder_rejection(self):
        with self.assertRaises(ValueError):
            Config.from_env(
                overrides={"secret_key": "change-me-openssl-rand-hex-24-for-secret-key"},
                env_files=[],
            )

        cfg = Config(
            use_mock=False,
            github_token="ghp_your-token-here",
            github_owner="your-github-org",
            github_repo="my-repo",
            webhook_secret="changeme-secret",
            secret_key="a" * 32,
            app_health_url="ftp://invalid-url",
        )
        errs = validate_real_mode(cfg)
        self.assertTrue(any("GITHUB_TOKEN" in e for e in errs))
        self.assertTrue(any("GITHUB_OWNER" in e for e in errs))
        self.assertTrue(any("WEBHOOK_SECRET" in e for e in errs))
        self.assertTrue(any("APP_HEALTH_URL" in e for e in errs))


class TestGitHubProviderHardening(unittest.TestCase):
    def setUp(self):
        self.session = FakeSession()
        self.token = "ghp_superSecretTokenValue999"

    def test_image_uri_null_vs_built(self):
        runs_payload = {
            "workflow_runs": [{
                "id": 10,
                "run_number": 5,
                "status": "completed",
                "conclusion": "success",
                "event": "push",
                "head_branch": "main",
                "head_sha": "abcdef1234567890",
                "head_commit": {"message": "ship", "author": {"name": "Alice"}},
            }]
        }
        self.session.get_map["actions/workflows/deploy.yml/runs"] = FakeResponse(200, runs_payload)

        p_no_reg = GitHubProvider(self.token, "org", "app", ecr_registry=None, session=self.session)
        runs1 = p_no_reg.list_runs()
        self.assertIsNone(runs1[0]["image_uri"])

        p_with_reg = GitHubProvider(
            self.token,
            "org",
            "app",
            ecr_registry="111222333444.dkr.ecr.us-east-1.amazonaws.com",
            ecr_repository="custom-repo",
            session=self.session,
        )
        runs2 = p_with_reg.list_runs()
        self.assertEqual(runs2[0]["image_uri"], "111222333444.dkr.ecr.us-east-1.amazonaws.com/custom-repo:abcdef1")

    def test_etag_304_caching(self):
        call_count = {"n": 0}

        def handler(url, params, headers):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return FakeResponse(200, {"workflow_runs": []}, headers={"ETag": '"etag-v1"'})
            self.assertEqual(headers.get("If-None-Match"), '"etag-v1"')
            return FakeResponse(304, headers={"ETag": '"etag-v1"'})

        self.session.get_map["actions/workflows/deploy.yml/runs"] = handler
        p = GitHubProvider(self.token, "org", "app", cache_ttl_seconds=0, session=self.session)
        r1 = p.list_runs()
        r2 = p.list_runs()
        self.assertEqual(r1, [])
        self.assertEqual(r2, [])
        self.assertEqual(call_count["n"], 2)

    def test_error_cases_and_edge_runs(self):
        # 401
        self.session.get_map["actions/workflows/deploy.yml/runs"] = FakeResponse(
            401, {"message": f"Bad credentials {self.token}"}
        )
        p = GitHubProvider(self.token, "org", "app", cache_ttl_seconds=0, session=self.session)
        with self.assertRaises(GitHubApiError) as ctx401:
            p.list_runs()
        self.assertNotIn(self.token, str(ctx401.exception.message))

        # 403 rate limit with reset timestamp
        self.session.get_map["actions/workflows/deploy.yml/runs"] = FakeResponse(
            403,
            {"message": "API rate limit exceeded"},
            headers={"X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "1795600000"},
        )
        with self.assertRaises(GitHubApiError) as ctx403:
            p.list_runs()
        self.assertIn("Resets at", ctx403.exception.message)
        self.assertIn("UTC", ctx403.exception.message)

        # 404 workflow
        self.session.get_map["actions/workflows/deploy.yml/runs"] = FakeResponse(404, {"message": "Not Found"})
        with self.assertRaises(NotFoundError) as ctx404:
            p.list_runs()
        self.assertIn("GITHUB_WORKFLOW_FILE", ctx404.exception.message)

        # Missing head_commit + cancelled run
        self.session.get_map["actions/workflows/deploy.yml/runs"] = FakeResponse(200, {
            "workflow_runs": [{
                "id": 99,
                "run_number": 9,
                "status": "completed",
                "conclusion": "cancelled",
                "event": "push",
                "head_branch": "main",
                "head_sha": "",
                "head_commit": None,
                "actor": {"login": "octocat"},
                "display_title": "Manual run",
            }]
        })
        runs = p.list_runs()
        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0]["status"], "cancelled")
        self.assertEqual(runs[0]["author"], "octocat")
        self.assertEqual(runs[0]["message"], "Manual run")

    def test_in_progress_stage_mapping_and_missing_steps(self):
        self.session.get_map["actions/runs/55/jobs"] = FakeResponse(200, {
            "jobs": [
                {"id": 1, "name": "empty-job"},  # missing 'steps' key
                {
                    "id": 2,
                    "name": "main",
                    "steps": [
                        {"name": "Run pytest", "status": "completed", "conclusion": "success"},
                        {"name": "Build Docker image", "status": "in_progress", "conclusion": None},
                    ],
                },
            ]
        })
        self.session.get_map["actions/runs/55"] = FakeResponse(200, {
            "id": 55,
            "run_number": 55,
            "status": "in_progress",
            "conclusion": None,
            "event": "push",
            "head_branch": "main",
            "head_sha": "1234567890",
        })
        p = GitHubProvider(self.token, "org", "app", session=self.session)
        run = p.get_run("55")
        statuses = {s["id"]: s["status"] for s in run["stages"]}
        self.assertEqual(statuses["test"], "success")
        self.assertEqual(statuses["build"], "running")
        self.assertEqual(statuses["push"], "pending")
        self.assertEqual(statuses["deploy"], "pending")


class TestImportDiagnosticsAndDemoPurge(unittest.TestCase):
    def setUp(self):
        self.secret = "a" * 32 + "b" * 8
        self.gh_token = "ghp_secretTokenShouldNeverLeak12345"
        self.app = create_app(overrides={
            "use_mock": False,
            "secret_key": self.secret,
            "webhook_secret": "webhook-secret-xyz",
            "api_key": "api-key-xyz",
            "github_token": self.gh_token,
            "github_owner": "testorg",
            "github_repo": "testrepo",
            "admin_username": "realadmin",
            "admin_password": "RealAdminPassword123",
            "database_path": ":memory:",
            "database_url": None,
        })
        self.client = self.app.test_client()

    def _login(self, username, password):
        res = self.client.post("/api/auth/login", json={"username": username, "password": password})
        self.assertEqual(res.status_code, 200)
        return res.get_json()["token"]

    def test_import_idempotency_and_newest_current(self):
        token = self._login("realadmin", "RealAdminPassword123")
        fake_session = FakeSession()
        fake_session.get_map["actions/workflows/deploy.yml/runs"] = FakeResponse(200, {
            "workflow_runs": [
                {
                    "id": 2002,
                    "run_number": 20,
                    "status": "completed",
                    "conclusion": "success",
                    "event": "push",
                    "head_branch": "main",
                    "head_sha": "2222222abcdef",
                    "run_started_at": "2026-11-20T12:00:00Z",
                    "updated_at": "2026-11-20T12:02:00Z",
                    "head_commit": {"message": "newest", "author": {"name": "Alice"}},
                },
                {
                    "id": 2001,
                    "run_number": 19,
                    "status": "completed",
                    "conclusion": "success",
                    "event": "push",
                    "head_branch": "main",
                    "head_sha": "1111111abcdef",
                    "run_started_at": "2026-11-19T12:00:00Z",
                    "updated_at": "2026-11-19T12:02:00Z",
                    "head_commit": {"message": "older", "author": {"name": "Bob"}},
                },
            ]
        })
        self.app.config["PROVIDER"] = GitHubProvider(
            self.gh_token, "testorg", "testrepo", session=fake_session
        )

        # First import
        r1 = self.client.post("/api/deployments/import", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.get_json()["imported"], 2)
        self.assertEqual(r1.get_json()["skipped"], 0)

        # Second import is idempotent
        r2 = self.client.post("/api/deployments/import", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.get_json()["imported"], 0)
        self.assertEqual(r2.get_json()["skipped"], 2)

        # Only newest (run_id 2002) is current, health is unknown
        deps = self.client.get("/api/deployments", headers={"Authorization": f"Bearer {token}"}).get_json()
        currents = [d for d in deps if d["is_current"]]
        self.assertEqual(len(currents), 1)
        self.assertEqual(currents[0]["run_id"], 2002)
        self.assertEqual(currents[0]["health"], "unknown")

    def test_diagnostics_rbac_and_no_secret_leak(self):
        admin_token = self._login("realadmin", "RealAdminPassword123")

        # Create viewer and developer users
        self.client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"username": "v1", "password": "ViewerPassword123", "role": "viewer"},
        )
        self.client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"username": "d1", "password": "DevPassword123", "role": "developer"},
        )
        v_token = self._login("v1", "ViewerPassword123")
        d_token = self._login("d1", "DevPassword123")

        # Viewer & developer get 403 on diagnostics and import
        for tok in (v_token, d_token):
            self.assertEqual(
                self.client.get("/api/diagnostics", headers={"Authorization": f"Bearer {tok}"}).status_code,
                403,
            )
            self.assertEqual(
                self.client.post("/api/deployments/import", headers={"Authorization": f"Bearer {tok}"}).status_code,
                403,
            )

        # Diagnostics with fake session (PASS/WARN/FAIL) never leaks secrets
        fake_session = FakeSession()
        fake_session.get_map["https://api.github.com/repos/testorg/testrepo"] = FakeResponse(
            401, {"message": f"Bad credentials {self.gh_token}"}
        )
        with self.app.app_context():
            report = run_diagnostics(self.app, session=fake_session)
        serialized = json.dumps(report)
        self.assertNotIn(self.gh_token, serialized)
        self.assertNotIn(self.secret, serialized)
        self.assertNotIn("webhook-secret-xyz", serialized)
        self.assertNotIn("api-key-xyz", serialized)
        gh_check = next(c for c in report["checks"] if c["id"] == "github_connection")
        self.assertEqual(gh_check["status"], "FAIL")

    def test_demo_user_detection_and_purge(self):
        with self.app.app_context():
            conn = get_db(":memory:")
            # Insert a demo user with demo password + a real user named 'admin' with custom password
            insert_returning_id(
                conn,
                "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                "VALUES (?, ?, ?, 'viewer', 1, 1, '2026-01-01T00:00:00Z')",
                ("viewer", "Demo Viewer", generate_password_hash("View@12345")),
            )
            insert_returning_id(
                conn,
                "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                "VALUES (?, ?, ?, 'admin', 1, 1, '2026-01-01T00:00:00Z')",
                ("admin", "Real Admin Custom", generate_password_hash("CustomStrongPass999")),
            )
            db_commit(conn)

            found = find_demo_users(conn)
            self.assertEqual(found, ["viewer"])

            deleted = purge_demo_users(conn)
            self.assertEqual(deleted, ["viewer"])
            self.assertEqual(find_demo_users(conn), [])


class TestWorkflowYamlStandards(unittest.TestCase):
    def test_workflow_yamls_standards(self):
        root = Path(__file__).resolve().parent.parent.parent
        wf_paths = [
            root / "backend" / "workflows" / "deploy.yml",
            root / "backend" / "workflows" / "rollback.yml",
            root / ".github" / "workflows" / "deploy.yml",
            root / ".github" / "workflows" / "rollback.yml",
        ]
        for wf in wf_paths:
            text = wf.read_text(encoding="utf-8")
            self.assertNotIn("cicd-demo", text)
            self.assertNotIn("123456789012", text)
            self.assertNotIn("EC2_SSH_PRIVATE_KEY", text)
            self.assertIn("vars.ECR_REPOSITORY", text)
            self.assertIn("vars.APP_PORT", text)
            self.assertIn("continue-on-error: true", text)
            self.assertIn("secrets.DASHBOARD_API_URL", text)
            self.assertIn("secrets.WEBHOOK_SECRET", text)
            self.assertIn("secrets.EC2_SSH_KEY", text)
            self.assertIn("curl --fail", text)
            if wf.name == "rollback.yml":
                self.assertIn("aws ecr describe-images", text)
                self.assertIn("^[A-Za-z0-9._-]+$", text)

        self.assertEqual(len(REQUIRED_GITHUB_SECRETS), 8)


if __name__ == "__main__":
    unittest.main()
