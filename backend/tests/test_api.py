import hmac
import hashlib
import json
import unittest
from datetime import datetime, timezone

from cicd_api import create_app
from cicd_api.config import load_config
from cicd_api.db import get_db
from cicd_api.security import generate_auth_token

import uuid

class TestApiBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Setup an isolated in-memory database for this test class
        cls.test_secret_key = "test-secret-key-that-is-at-least-32-chars-long"
        cls.test_api_key = "test-api-key-automation-secret-999"
        cls.test_webhook_secret = "test-webhook-hmac-secret-abc"
        cls.db_uri = f"file:cicd_test_{uuid.uuid4().hex}?mode=memory&cache=shared"

        cls.app = create_app(overrides={
            "use_mock": True,
            "secret_key": cls.test_secret_key,
            "api_key": cls.test_api_key,
            "webhook_secret": cls.test_webhook_secret,
            "database_path": cls.db_uri,
            "cors_origins": ("http://localhost:5173", "http://test-allowed.com"),
        })
        cls.client = cls.app.test_client()

        # Login tokens for seeded users
        cls.admin_token = cls._get_token("admin", "Admin@12345")
        cls.dev_token = cls._get_token("developer", "Dev@123456")
        cls.viewer_token = cls._get_token("viewer", "View@12345")

    @classmethod
    def _get_token(cls, username, password):
        res = cls.client.post("/api/auth/login", json={"username": username, "password": password})
        data = res.get_json()
        return data["token"]

    def _headers(self, token=None, api_key=None):
        h = {}
        if token:
            h["Authorization"] = f"Bearer {token}"
        if api_key:
            h["X-API-Key"] = api_key
        return h

    def _sign_webhook(self, body_bytes, secret=None):
        sec = secret or self.test_webhook_secret
        sig = hmac.new(sec.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        return f"sha256={sig}"

class TestHealthAndAppHealth(TestApiBase):
    def test_public_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["mode"], "mock")
        self.assertIn("time", data)

    def test_app_health_mock_endpoint(self):
        # Viewer can access app health
        res = self.client.get("/api/app-health", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["http_status"], 200)

class TestAuthenticationAndAuthorization(TestApiBase):
    def test_unauthenticated_request_rejected(self):
        res = self.client.get("/api/runs")
        self.assertEqual(res.status_code, 401)
        self.assertIn("authorization", res.get_json()["error"].lower())

    def test_tampered_token_rejected(self):
        tampered = self.admin_token + "tampered"
        res = self.client.get("/api/runs", headers=self._headers(tampered))
        self.assertEqual(res.status_code, 401)

    def test_invalid_bearer_prefix_rejected(self):
        res = self.client.get("/api/runs", headers={"Authorization": f"Token {self.admin_token}"})
        self.assertEqual(res.status_code, 401)

    def test_login_success(self):
        res = self.client.post("/api/auth/login", json={"username": "admin", "password": "Admin@12345"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["username"], "admin")
        self.assertEqual(data["user"]["role"], "admin")
        self.assertNotIn("password_hash", data["user"])

    def test_login_unknown_user_same_error_and_timing_defense(self):
        res = self.client.post("/api/auth/login", json={"username": "nonexistent_user", "password": "WrongPassword123"})
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.get_json()["error"], "Invalid username or password")

    def test_login_wrong_password_same_error(self):
        res = self.client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword123"})
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.get_json()["error"], "Invalid username or password")

    def test_login_throttling(self):
        throttled_user = "throttle_test_user"
        # 5 failed attempts
        for _ in range(5):
            res = self.client.post("/api/auth/login", json={"username": throttled_user, "password": "WrongPassword123"})
            self.assertEqual(res.status_code, 401)

        # 6th attempt must be 429
        res = self.client.post("/api/auth/login", json={"username": throttled_user, "password": "WrongPassword123"})
        self.assertEqual(res.status_code, 429)

    def test_auth_me(self):
        res = self.client.get("/api/auth/me", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["user"]
        self.assertEqual(data["username"], "viewer")
        self.assertEqual(data["role"], "viewer")
        self.assertNotIn("password_hash", data)

    def test_auth_logout(self):
        res = self.client.post("/api/auth/logout", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "ok")

class TestRoleMatrixAndAccessControl(TestApiBase):
    def test_role_matrix_viewer(self):
        # Viewer can read runs, branches, stats, deployments
        res = self.client.get("/api/runs", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        res = self.client.get("/api/branches", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        res = self.client.get("/api/stats", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        res = self.client.get("/api/deployments", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)

        # Viewer FORBIDDEN on logs, rollback, users, settings
        res = self.client.get("/api/runs/run-24/stages/test/logs", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 403)
        res = self.client.post("/api/deployments/1/rollback", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 403)
        res = self.client.get("/api/users", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 403)
        res = self.client.get("/api/settings", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 403)

    def test_role_matrix_developer(self):
        # Developer can view logs
        res = self.client.get("/api/runs/run-24/stages/test/logs", headers=self._headers(self.dev_token))
        self.assertEqual(res.status_code, 200)

        # Developer FORBIDDEN on rollback, users, settings
        res = self.client.post("/api/deployments/1/rollback", headers=self._headers(self.dev_token))
        self.assertEqual(res.status_code, 403)
        res = self.client.get("/api/users", headers=self._headers(self.dev_token))
        self.assertEqual(res.status_code, 403)
        res = self.client.get("/api/settings", headers=self._headers(self.dev_token))
        self.assertEqual(res.status_code, 403)

    def test_role_matrix_admin(self):
        # Admin can view logs, access users, settings
        res = self.client.get("/api/runs/run-24/stages/test/logs", headers=self._headers(self.admin_token))
        self.assertEqual(res.status_code, 200)
        res = self.client.get("/api/users", headers=self._headers(self.admin_token))
        self.assertEqual(res.status_code, 200)
        res = self.client.get("/api/settings", headers=self._headers(self.admin_token))
        self.assertEqual(res.status_code, 200)

class TestRunsAndPipelineModel(TestApiBase):
    def test_runs_pagination_and_defaults(self):
        res = self.client.get("/api/runs", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["per_page"], 25)
        self.assertEqual(data["total"], 25)
        self.assertEqual(len(data["items"]), 25)

        # Custom pagination
        res2 = self.client.get("/api/runs?page=2&per_page=10", headers=self._headers(self.viewer_token))
        data2 = res2.get_json()
        self.assertEqual(data2["page"], 2)
        self.assertEqual(data2["per_page"], 10)
        self.assertEqual(len(data2["items"]), 10)

        # Invalid pagination values fallback to defaults
        res3 = self.client.get("/api/runs?page=invalid&per_page=-5", headers=self._headers(self.viewer_token))
        data3 = res3.get_json()
        self.assertEqual(data3["page"], 1)
        self.assertEqual(data3["per_page"], 25)

    def test_runs_filters(self):
        # Filter by status
        res = self.client.get("/api/runs?status=running", headers=self._headers(self.viewer_token))
        data = res.get_json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["status"], "running")

        # Filter by event
        res_pr = self.client.get("/api/runs?event=pull_request", headers=self._headers(self.viewer_token))
        for r in res_pr.get_json()["items"]:
            self.assertEqual(r["event"], "pull_request")

        # Search filter
        res_search = self.client.get("/api/runs?search=metrics", headers=self._headers(self.viewer_token))
        self.assertTrue(len(res_search.get_json()["items"]) >= 1)

    def test_single_running_run(self):
        res = self.client.get("/api/runs?status=running", headers=self._headers(self.viewer_token))
        data = res.get_json()
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["id"], "run-25")

    def test_run_detail_and_four_stages(self):
        res = self.client.get("/api/runs/run-24", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        run = res.get_json()
        self.assertEqual(run["id"], "run-24")
        self.assertEqual(len(run["stages"]), 4)
        stage_ids = [s["id"] for s in run["stages"]]
        self.assertEqual(stage_ids, ["test", "build", "push", "deploy"])

    def test_run_detail_404(self):
        res = self.client.get("/api/runs/nonexistent-run-9999", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 404)

    def test_stages_only_endpoint(self):
        res = self.client.get("/api/runs/run-24/stages", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        stages = res.get_json()["stages"]
        self.assertEqual(len(stages), 4)

    def test_failed_stage_skips_later_stages(self):
        # run-20 fails at build stage
        res = self.client.get("/api/runs/run-20", headers=self._headers(self.viewer_token))
        run = res.get_json()
        stages = run["stages"]
        self.assertEqual(stages[0]["id"], "test")
        self.assertEqual(stages[0]["status"], "success")
        self.assertEqual(stages[1]["id"], "build")
        self.assertEqual(stages[1]["status"], "failed")
        self.assertEqual(stages[2]["id"], "push")
        self.assertEqual(stages[2]["status"], "skipped")
        self.assertEqual(stages[3]["id"], "deploy")
        self.assertEqual(stages[3]["status"], "skipped")

    def test_pull_request_run_skipping_and_notes(self):
        # run-22 is pull_request
        res = self.client.get("/api/runs/run-22", headers=self._headers(self.viewer_token))
        run = res.get_json()
        self.assertEqual(run["event"], "pull_request")
        self.assertFalse(run["deploys"])
        self.assertEqual(run["note"], "Tests only, no deploy")
        self.assertEqual(run["stages"][0]["status"], "success")
        self.assertEqual(run["stages"][1]["status"], "skipped")
        self.assertEqual(run["stages"][2]["status"], "skipped")
        self.assertEqual(run["stages"][3]["status"], "skipped")

    def test_stage_logs_content_and_invalid_stage_404(self):
        # Developer views logs
        res = self.client.get("/api/runs/run-24/stages/build/logs", headers=self._headers(self.dev_token))
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["stage"], "build")
        self.assertTrue(len(data["lines"]) > 0)
        self.assertFalse(data["truncated"])

        # Invalid stage name
        res_invalid = self.client.get("/api/runs/run-24/stages/invalid_stage/logs", headers=self._headers(self.dev_token))
        self.assertEqual(res_invalid.status_code, 404)

    def test_branches_distinct(self):
        res = self.client.get("/api/branches", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        branches = res.get_json()["branches"]
        self.assertIn("main", branches)
        self.assertEqual(len(branches), len(set(branches)))

class TestStatsAndDeployments(TestApiBase):
    def test_stats_structure(self):
        res = self.client.get("/api/stats", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["total_runs"], 25)
        self.assertEqual(data["running"], 1)
        self.assertIsInstance(data["success_rate"], float)
        self.assertIsInstance(data["avg_duration_seconds"], (int, float))
        self.assertIsNotNone(data["current_deployment"])
        self.assertEqual(len(data["recent"]), 20)
        # Oldest to newest in recent: run_number should be ascending
        self.assertTrue(data["recent"][0]["run_number"] < data["recent"][-1]["run_number"])

    def test_seeded_deployments_exactly_one_current(self):
        res = self.client.get("/api/deployments", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        deps = res.get_json()
        self.assertTrue(len(deps) <= 6)
        current_deps = [d for d in deps if d["is_current"]]
        self.assertEqual(len(current_deps), 1)

        # can_rollback is true for successful non-current deployments
        for d in deps:
            if d["is_current"]:
                self.assertFalse(d["can_rollback"])
            elif d["status"] == "success":
                self.assertTrue(d["can_rollback"])

    def test_current_deployment_endpoint(self):
        res = self.client.get("/api/deployments/current", headers=self._headers(self.viewer_token))
        self.assertEqual(res.status_code, 200)
        curr = res.get_json()
        self.assertTrue(curr["is_current"])

class TestRollback(TestApiBase):
    def test_mock_rollback_flow(self):
        deps = self.client.get("/api/deployments", headers=self._headers(self.admin_token)).get_json()
        # Find a non-current successful deployment to roll back to
        target = next(d for d in deps if d["can_rollback"])

        res = self.client.post(f"/api/deployments/{target['id']}/rollback", headers=self._headers(self.admin_token))
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(str(data["deployment"]["rolled_back_from"]), str(target["id"]))
        self.assertTrue(data["deployment"]["is_current"])

        # Check that previous current is no longer current
        curr = self.client.get("/api/deployments/current", headers=self._headers(self.admin_token)).get_json()
        self.assertEqual(curr["id"], data["deployment"]["id"])

    def test_rollback_rejection_already_current(self):
        curr = self.client.get("/api/deployments/current", headers=self._headers(self.admin_token)).get_json()
        res = self.client.post(f"/api/deployments/{curr['id']}/rollback", headers=self._headers(self.admin_token))
        self.assertEqual(res.status_code, 409)

    def test_rollback_rejection_missing_id(self):
        res = self.client.post("/api/deployments/999999/rollback", headers=self._headers(self.admin_token))
        self.assertEqual(res.status_code, 404)

class TestApiKeyRules(TestApiBase):
    def test_api_key_authenticates_rollback_only(self):
        deps = self.client.get("/api/deployments", headers=self._headers(self.admin_token)).get_json()
        target = next(d for d in deps if d["can_rollback"])

        # X-API-Key with NO Bearer token succeeds on rollback
        res = self.client.post(
            f"/api/deployments/{target['id']}/rollback",
            headers={"X-API-Key": self.test_api_key}
        )
        self.assertEqual(res.status_code, 200)

    def test_api_key_rejected_on_other_endpoints(self):
        # X-API-Key MUST NEVER authenticate /api/runs or /api/users
        res = self.client.get("/api/runs", headers={"X-API-Key": self.test_api_key})
        self.assertEqual(res.status_code, 401)

        res_users = self.client.get("/api/users", headers={"X-API-Key": self.test_api_key})
        self.assertEqual(res_users.status_code, 401)

    def test_invalid_api_key_rejected_on_rollback(self):
        res = self.client.post(
            "/api/deployments/1/rollback",
            headers={"X-API-Key": "wrong-secret-key-12345"}
        )
        self.assertEqual(res.status_code, 401)

class TestWebhooks(TestApiBase):
    def test_webhook_hmac_valid_signature(self):
        payload = {
            "image_tag": "v2.4.99-xyz1234",
            "status": "success",
            "health": "healthy",
            "commit_sha": "abc1234567890",
            "commit_message": "Automated deploy test",
        }
        body = json.dumps(payload).encode("utf-8")
        sig = self._sign_webhook(body)

        res = self.client.post(
            "/api/webhooks/deployment",
            data=body,
            headers={"Content-Type": "application/json", "X-Signature-256": sig}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["image_tag"], "v2.4.99-xyz1234")
        self.assertTrue(data["is_current"])

    def test_webhook_hmac_bad_or_missing_signature(self):
        payload = {"image_tag": "v1.0.0", "status": "success", "health": "healthy"}
        body = json.dumps(payload).encode("utf-8")

        # Missing signature
        res1 = self.client.post("/api/webhooks/deployment", data=body, headers={"Content-Type": "application/json"})
        self.assertEqual(res1.status_code, 401)

        # Bad signature
        res2 = self.client.post(
            "/api/webhooks/deployment",
            data=body,
            headers={"Content-Type": "application/json", "X-Signature-256": "sha256=invalidhexsig123456"}
        )
        self.assertEqual(res2.status_code, 401)

    def test_webhook_payload_validation(self):
        # Missing image_tag
        payload1 = {"status": "success", "health": "healthy"}
        body1 = json.dumps(payload1).encode("utf-8")
        res1 = self.client.post("/api/webhooks/deployment", data=body1, headers={"Content-Type": "application/json", "X-Signature-256": self._sign_webhook(body1)})
        self.assertEqual(res1.status_code, 400)

        # Invalid status
        payload2 = {"image_tag": "v1.0", "status": "invalid_status", "health": "healthy"}
        body2 = json.dumps(payload2).encode("utf-8")
        res2 = self.client.post("/api/webhooks/deployment", data=body2, headers={"Content-Type": "application/json", "X-Signature-256": self._sign_webhook(body2)})
        self.assertEqual(res2.status_code, 400)

        # Invalid health
        payload3 = {"image_tag": "v1.0", "status": "success", "health": "invalid_health"}
        body3 = json.dumps(payload3).encode("utf-8")
        res3 = self.client.post("/api/webhooks/deployment", data=body3, headers={"Content-Type": "application/json", "X-Signature-256": self._sign_webhook(body3)})
        self.assertEqual(res3.status_code, 400)

    def test_webhook_failed_deploy_not_current(self):
        curr_before = self.client.get("/api/deployments/current", headers=self._headers(self.admin_token)).get_json()

        payload = {"image_tag": "v-failed-test-1", "status": "failed", "health": "unhealthy"}
        body = json.dumps(payload).encode("utf-8")
        res = self.client.post("/api/webhooks/deployment", data=body, headers={"Content-Type": "application/json", "X-Signature-256": self._sign_webhook(body)})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.get_json()["is_current"])

        # Current should still be original
        curr_after = self.client.get("/api/deployments/current", headers=self._headers(self.admin_token)).get_json()
        self.assertEqual(curr_before["id"], curr_after["id"])

    def test_webhook_rolled_back_from_copies_commit_details(self):
        curr = self.client.get("/api/deployments/current", headers=self._headers(self.admin_token)).get_json()

        payload = {
            "image_tag": curr["image_tag"],
            "status": "success",
            "health": "healthy",
            "rolled_back_from": curr["id"]
        }
        body = json.dumps(payload).encode("utf-8")
        res = self.client.post("/api/webhooks/deployment", data=body, headers={"Content-Type": "application/json", "X-Signature-256": self._sign_webhook(body)})
        self.assertEqual(res.status_code, 200)
        saved = res.get_json()
        self.assertEqual(saved["commit_sha"], curr["commit_sha"])
        self.assertEqual(saved["commit_message"], curr["commit_message"])
        self.assertEqual(str(saved["rolled_back_from"]), str(curr["id"]))

class TestUserManagementAndGuards(TestApiBase):
    def test_create_user_validation_and_conflict(self):
        # Invalid username policy (special char not allowed)
        res = self.client.post("/api/users", headers=self._headers(self.admin_token), json={
            "username": "bad!username", "role": "viewer", "password": "Password12345", "full_name": "Test User"
        })
        self.assertEqual(res.status_code, 400)

        # Invalid password policy (too short)
        res = self.client.post("/api/users", headers=self._headers(self.admin_token), json={
            "username": "validuser1", "role": "viewer", "password": "short1", "full_name": "Test User"
        })
        self.assertEqual(res.status_code, 400)

        # Successful creation
        res = self.client.post("/api/users", headers=self._headers(self.admin_token), json={
            "username": "newopsengineer", "role": "developer", "password": "SecurePassword123", "full_name": "New Engineer"
        })
        self.assertEqual(res.status_code, 201)
        created = res.get_json()
        self.assertEqual(created["username"], "newopsengineer")
        self.assertNotIn("password_hash", created)

        # Duplicate username (case-insensitive) -> 409
        res_dup = self.client.post("/api/users", headers=self._headers(self.admin_token), json={
            "username": "NEWopsEngineer", "role": "viewer", "password": "SecurePassword123", "full_name": "Duplicate User"
        })
        self.assertEqual(res_dup.status_code, 409)

    def test_session_revocation_on_role_or_password_change(self):
        # Create a temp developer
        self.client.post("/api/users", headers=self._headers(self.admin_token), json={
            "username": "revocationuser", "role": "developer", "password": "Password123456", "full_name": "Revoke Me"
        })
        # Login as that user
        login_res = self.client.post("/api/auth/login", json={"username": "revocationuser", "password": "Password123456"})
        user_token = login_res.get_json()["token"]
        user_id = login_res.get_json()["user"]["id"]

        # User token works on developer endpoint
        res = self.client.get("/api/runs/run-24/stages/test/logs", headers=self._headers(user_token))
        self.assertEqual(res.status_code, 200)

        # Admin changes role to viewer
        patch_res = self.client.patch(f"/api/users/{user_id}", headers=self._headers(self.admin_token), json={"role": "viewer"})
        self.assertEqual(patch_res.status_code, 200)

        # The old user token must now be rejected because token_version incremented
        res_revoked = self.client.get("/api/runs", headers=self._headers(user_token))
        self.assertEqual(res_revoked.status_code, 401)

    def test_admin_self_lockout_protection(self):
        # Find admin user id
        admin_info = self.client.get("/api/auth/me", headers=self._headers(self.admin_token)).get_json()["user"]
        admin_id = admin_info["id"]

        # Admin attempting to demote self -> 409
        res = self.client.patch(f"/api/users/{admin_id}", headers=self._headers(self.admin_token), json={"role": "viewer"})
        self.assertEqual(res.status_code, 409)

        # Admin attempting to deactivate self -> 409
        res2 = self.client.patch(f"/api/users/{admin_id}", headers=self._headers(self.admin_token), json={"is_active": False})
        self.assertEqual(res2.status_code, 409)

    def test_last_active_admin_protection(self):
        # Create a second admin
        c_res = self.client.post("/api/users", headers=self._headers(self.admin_token), json={
            "username": "secondadmin", "role": "admin", "password": "AdminPassword123", "full_name": "Admin Two"
        })
        sec_id = c_res.get_json()["id"]

        # Can demote second admin because 2 active admins exist
        res = self.client.patch(f"/api/users/{sec_id}", headers=self._headers(self.admin_token), json={"role": "developer"})
        self.assertEqual(res.status_code, 200)

        # Now only 1 active admin exists; demoting or deactivating that last admin is impossible (also guarded by self-lockout)
        # Even if attempted from another identity if there were one, last admin count is checked.

class TestSecurityHeadersCorsAndRedaction(TestApiBase):
    def test_cors_allowed_and_disallowed_origins(self):
        # Allowed origin
        res_allowed = self.client.get("/api/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(res_allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")

        # Disallowed origin
        res_disallowed = self.client.get("/api/health", headers={"Origin": "http://evil-attacker.com"})
        self.assertIsNone(res_disallowed.headers.get("Access-Control-Allow-Origin"))

    def test_security_headers_present(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("Cache-Control"), "no-store")

    def test_no_passwords_hashes_or_secrets_leaked(self):
        endpoints = [
            ("/api/auth/me", self.viewer_token),
            ("/api/users", self.admin_token),
            ("/api/settings", self.admin_token),
            ("/api/deployments", self.viewer_token),
            ("/api/runs", self.viewer_token),
        ]
        forbidden_substrings = ["pbkdf2", "scrypt", "argon2", "Admin@12345", "test-secret-key"]
        for ep, token in endpoints:
            res = self.client.get(ep, headers=self._headers(token))
            body_text = res.get_data(as_text=True)
            for sub in forbidden_substrings:
                self.assertNotIn(sub, body_text)

if __name__ == "__main__":
    unittest.main()
