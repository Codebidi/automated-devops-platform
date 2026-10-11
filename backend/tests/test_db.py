"""
Tests for the database layer (test_db.py).
All tests run with SQLite in-memory; no network or PostgreSQL required.
"""

import re
import sqlite3
import unittest
import uuid
from pathlib import Path

from cicd_api.config import load_config
from cicd_api.db import (
    _adapt_sql,
    _split_statements,
    _sqlite_connect,
    _validate_run_id,
    insert_returning_id,
    validate_rolled_back_from,
    INTEGRITY_ERRORS,
)
from cicd_api import create_app

SQL_DIR = Path(__file__).resolve().parent.parent / "cicd_api" / "sql"


# ---------------------------------------------------------------------------
# Helper: create isolated in-memory SQLite DB with schema applied
# ---------------------------------------------------------------------------
def _make_db() -> sqlite3.Connection:
    db_uri = f"file:testdb_{uuid.uuid4().hex}?mode=memory&cache=shared"
    conn = _sqlite_connect(db_uri)
    sql = (SQL_DIR / "sqlite.sql").read_text(encoding="utf-8")
    for stmt in _split_statements(sql):
        conn.execute(stmt)
    conn.commit()
    return conn


# ---------------------------------------------------------------------------
# 1. Schema files define identical tables and columns
# ---------------------------------------------------------------------------
class TestSchemaConsistency(unittest.TestCase):
    def _table_names(self, sql: str) -> set[str]:
        return set(re.findall(r"CREATE TABLE IF NOT EXISTS (\w+)", sql, re.IGNORECASE))

    def _column_names(self, sql: str, table: str) -> set[str]:
        # Extract block between the table's ( and matching )
        pattern = rf"CREATE TABLE IF NOT EXISTS {table}\s*\((.+?)\);"
        m = re.search(pattern, sql, re.IGNORECASE | re.DOTALL)
        if not m:
            return set()
        body = m.group(1)
        cols = set()
        for line in body.splitlines():
            line = line.strip().rstrip(",")
            if not line or line.upper().startswith("CHECK") or line.upper().startswith("REFERENCES"):
                continue
            name = line.split()[0]
            if name.upper() not in ("PRIMARY", "UNIQUE", "FOREIGN", "INDEX", "CHECK", "CONSTRAINT"):
                cols.add(name.lower())
        return cols

    def test_same_table_names(self):
        sqlite_sql = (SQL_DIR / "sqlite.sql").read_text()
        pg_sql = (SQL_DIR / "postgres.sql").read_text()
        self.assertEqual(self._table_names(sqlite_sql), self._table_names(pg_sql))

    def test_users_same_columns(self):
        sqlite_sql = (SQL_DIR / "sqlite.sql").read_text()
        pg_sql = (SQL_DIR / "postgres.sql").read_text()
        self.assertEqual(
            self._column_names(sqlite_sql, "users"),
            self._column_names(pg_sql, "users"),
        )

    def test_deployments_same_columns(self):
        sqlite_sql = (SQL_DIR / "sqlite.sql").read_text()
        pg_sql = (SQL_DIR / "postgres.sql").read_text()
        self.assertEqual(
            self._column_names(sqlite_sql, "deployments"),
            self._column_names(pg_sql, "deployments"),
        )

    def test_postgres_uses_native_types(self):
        pg_sql = (SQL_DIR / "postgres.sql").read_text()
        self.assertIn("BIGSERIAL", pg_sql)
        self.assertIn("TIMESTAMPTZ", pg_sql)
        self.assertIn("BIGINT", pg_sql)
        self.assertNotIn("AUTOINCREMENT", pg_sql)

    def test_sqlite_no_bigserial(self):
        sqlite_sql = (SQL_DIR / "sqlite.sql").read_text()
        self.assertNotIn("BIGSERIAL", sqlite_sql)
        self.assertNotIn("TIMESTAMPTZ", sqlite_sql)


# ---------------------------------------------------------------------------
# 2. Statement splitter ignores comment lines
# ---------------------------------------------------------------------------
class TestStatementSplitter(unittest.TestCase):
    def test_ignores_comment_lines(self):
        sql = """
-- This is a comment
CREATE TABLE IF NOT EXISTS foo (id INTEGER);
-- another comment
CREATE INDEX IF NOT EXISTS ix_foo ON foo(id);
"""
        stmts = _split_statements(sql)
        self.assertEqual(len(stmts), 2)
        self.assertIn("CREATE TABLE", stmts[0])
        self.assertIn("CREATE INDEX", stmts[1])

    def test_empty_input(self):
        self.assertEqual(_split_statements(""), [])


# ---------------------------------------------------------------------------
# 3. Placeholder translation
# ---------------------------------------------------------------------------
class TestPlaceholderTranslation(unittest.TestCase):
    def test_question_marks_become_percent_s(self):
        sql = "SELECT * FROM users WHERE id = ? AND role = ?"
        adapted = _adapt_sql(sql, use_pg=True)
        self.assertEqual(adapted, "SELECT * FROM users WHERE id = %s AND role = %s")

    def test_sqlite_unchanged(self):
        sql = "SELECT * FROM users WHERE id = ?"
        self.assertEqual(_adapt_sql(sql, use_pg=False), sql)

    def test_no_literal_percent_in_app_sql(self):
        """No app SQL file should contain a literal % (would break psycopg formatting)."""
        routes_dir = Path(__file__).resolve().parent.parent / "cicd_api"
        for py_file in routes_dir.rglob("*.py"):
            source = py_file.read_text(encoding="utf-8")
            # Find SQL strings - look for lines with INSERT/SELECT/UPDATE/DELETE containing %
            for lineno, line in enumerate(source.splitlines(), 1):
                stripped = line.strip()
                if any(kw in stripped.upper() for kw in ("SELECT ", "INSERT ", "UPDATE ", "DELETE ")):
                    # Allow %s only in _adapt_sql itself
                    if "%s" in stripped and "adapt_sql" not in stripped and "_adapt_sql" not in source.splitlines()[max(0,lineno-5):lineno+5][0]:
                        self.fail(f"Literal %s found in SQL at {py_file}:{lineno}: {stripped}")


# ---------------------------------------------------------------------------
# 4. Engine detection
# ---------------------------------------------------------------------------
class TestEngineDetection(unittest.TestCase):
    def test_no_database_url_is_sqlite(self):
        from cicd_api.db import _is_postgres
        cfg = load_config(overrides={
            "use_mock": True,
            "secret_key": "test-secret-key-that-is-at-least-32chars",
            "database_url": None,
        })
        self.assertFalse(_is_postgres(cfg))

    def test_postgres_url_detected(self):
        from cicd_api.db import _is_postgres
        cfg = load_config(overrides={
            "use_mock": True,
            "secret_key": "test-secret-key-that-is-at-least-32chars",
            "database_url": "postgresql://user:pw@localhost/db",
        })
        self.assertTrue(_is_postgres(cfg))

    def test_missing_psycopg_raises_clear_error(self):
        import cicd_api.db as db_module
        original = db_module._psycopg_available
        try:
            db_module._psycopg_available = False
            with self.assertRaises(RuntimeError) as ctx:
                db_module._require_psycopg()
            self.assertIn("psycopg[binary]", str(ctx.exception))
        finally:
            db_module._psycopg_available = original


# ---------------------------------------------------------------------------
# 5. SQLite constraint checks via the app
# ---------------------------------------------------------------------------
class TestSQLiteConstraints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_uri = f"file:constraints_{uuid.uuid4().hex}?mode=memory&cache=shared"
        cls.app = create_app(overrides={
            "use_mock": True,
            "secret_key": "test-secret-key-that-is-at-least-32-chars-long",
            "database_path": cls.db_uri,
        })
        cls.client = cls.app.test_client()
        with cls.app.app_context():
            cls.admin_token = cls.client.post(
                "/api/auth/login", json={"username": "admin", "password": "Admin@12345"}
            ).get_json()["token"]

    def _headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"}

    def test_second_current_deployment_rejected(self):
        """The partial unique index allows only one is_current=1 deployment."""
        conn = _make_db()
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO deployments (commit_sha, commit_message, author, image_tag, status, health, deployed_at, is_current) "
            "VALUES ('abc', 'msg', 'au', 'v1', 'success', 'healthy', ?, 1)",
            (now,),
        )
        conn.commit()
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute(
                "INSERT INTO deployments (commit_sha, commit_message, author, image_tag, status, health, deployed_at, is_current) "
                "VALUES ('def', 'msg2', 'au', 'v2', 'success', 'healthy', ?, 1)",
                (now,),
            )
            conn.commit()

    def test_invalid_status_rejected(self):
        conn = _make_db()
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute(
                "INSERT INTO deployments (commit_sha, commit_message, author, image_tag, status, health, deployed_at, is_current) "
                "VALUES ('abc', 'msg', 'au', 'v1', 'bad_status', 'healthy', ?, 0)",
                (now,),
            )
            conn.commit()

    def test_invalid_role_rejected(self):
        conn = _make_db()
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute(
                "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                "VALUES ('u1', 'N', 'h', 'superadmin', 1, 1, ?)",
                (now,),
            )
            conn.commit()

    def test_case_insensitive_username_rejected(self):
        conn = _make_db()
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
            "VALUES ('Admin', 'N', 'h', 'admin', 1, 1, ?)",
            (now,),
        )
        conn.commit()
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute(
                "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                "VALUES ('admin', 'N', 'h', 'admin', 1, 1, ?)",
                (now,),
            )
            conn.commit()


# ---------------------------------------------------------------------------
# 6. Schema idempotency
# ---------------------------------------------------------------------------
class TestSchemaIdempotency(unittest.TestCase):
    def test_applying_schema_twice_is_safe(self):
        conn = _make_db()
        # Apply schema a second time – should not raise
        sql = (SQL_DIR / "sqlite.sql").read_text(encoding="utf-8")
        for stmt in _split_statements(sql):
            conn.execute(stmt)
        conn.commit()

    def test_restart_does_not_duplicate_seed_users(self):
        db_uri = f"file:idempotent_{uuid.uuid4().hex}?mode=memory&cache=shared"
        app = create_app(overrides={
            "use_mock": True,
            "secret_key": "test-secret-key-that-is-at-least-32-chars-long",
            "database_path": db_uri,
        })
        # Simulate second startup by calling init_db + seed_database again
        from cicd_api.db import init_db, seed_database, get_db, db_fetchone
        with app.app_context():
            init_db(app)
            seed_database(app)
            conn = get_db()
            row = db_fetchone(conn, "SELECT COUNT(*) AS n FROM users")
            self.assertEqual(row["n"], 3)  # Not 6


# ---------------------------------------------------------------------------
# 7. insert_returning_id and WAL mode
# ---------------------------------------------------------------------------
class TestInsertReturningId(unittest.TestCase):
    def test_insert_returning_id_sqlite(self):
        conn = _make_db()
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        new_id = insert_returning_id(
            conn,
            "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
            "VALUES (?, ?, ?, ?, 1, 1, ?)",
            ("testuser", "Test User", "hash", "viewer", now),
        )
        self.assertIsInstance(new_id, int)
        self.assertGreater(new_id, 0)

    def test_wal_mode_enabled_on_file_db(self):
        """WAL mode is set on file-based databases (not applicable to :memory:)."""
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            tmp_path = f.name
        try:
            conn = _sqlite_connect(tmp_path)
            row = conn.execute("PRAGMA journal_mode").fetchone()
            self.assertEqual(row[0], "wal")
            conn.close()
        finally:
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# 8. Webhook input hardening (run_id and rolled_back_from)
# ---------------------------------------------------------------------------
class TestWebhookInputHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import hmac, hashlib
        cls.db_uri = f"file:webhooks_{uuid.uuid4().hex}?mode=memory&cache=shared"
        cls.secret = "test-webhook-secret-for-hardening"
        cls.app = create_app(overrides={
            "use_mock": True,
            "secret_key": "test-secret-key-that-is-at-least-32-chars-long",
            "database_path": cls.db_uri,
            "webhook_secret": cls.secret,
        })
        cls.client = cls.app.test_client()
        cls.hmac_module = hmac
        cls.hashlib_module = hashlib

    def _sign(self, body: bytes) -> str:
        sig = self.hmac_module.new(
            self.secret.encode("utf-8"), body, self.hashlib_module.sha256
        ).hexdigest()
        return f"sha256={sig}"

    def _post(self, payload: dict):
        import json
        body = json.dumps(payload).encode()
        return self.client.post(
            "/api/webhooks/deployment",
            data=body,
            content_type="application/json",
            headers={"X-Signature-256": self._sign(body)},
        )

    def _base_payload(self, **overrides):
        p = {
            "image_tag": "v1.0.0",
            "status": "success",
            "health": "healthy",
            "commit_sha": "abc123",
        }
        p.update(overrides)
        return p

    def test_oversized_run_id_stored_as_null(self):
        res = self._post(self._base_payload(run_id=2**63))
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIsNone(data["run_id"])

    def test_negative_run_id_stored_as_null(self):
        res = self._post(self._base_payload(run_id=-1))
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(res.get_json()["run_id"])

    def test_boolean_run_id_stored_as_null(self):
        res = self._post(self._base_payload(run_id=True))
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(res.get_json()["run_id"])

    def test_string_run_id_stored_as_null(self):
        res = self._post(self._base_payload(run_id="not-a-number"))
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(res.get_json()["run_id"])

    def test_valid_run_id_stored(self):
        res = self._post(self._base_payload(run_id=12345678))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["run_id"], 12345678)

    def test_unknown_rolled_back_from_stored_as_null_returns_201(self):
        res = self._post(self._base_payload(rolled_back_from=99999, image_tag="v2.0.0"))
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(res.get_json()["rolled_back_from"])


# ---------------------------------------------------------------------------
# 9. _validate_run_id unit tests
# ---------------------------------------------------------------------------
class TestValidateRunId(unittest.TestCase):
    def test_none_returns_none(self):
        self.assertIsNone(_validate_run_id(None))

    def test_bool_returns_none(self):
        self.assertIsNone(_validate_run_id(True))
        self.assertIsNone(_validate_run_id(False))

    def test_negative_returns_none(self):
        self.assertIsNone(_validate_run_id(-1))

    def test_zero_returns_none(self):
        self.assertIsNone(_validate_run_id(0))

    def test_too_large_returns_none(self):
        self.assertIsNone(_validate_run_id(2**63))

    def test_string_non_numeric_returns_none(self):
        self.assertIsNone(_validate_run_id("abc"))

    def test_valid_int_returned(self):
        self.assertEqual(_validate_run_id(123456789), 123456789)

    def test_valid_string_int_returned(self):
        self.assertEqual(_validate_run_id("9999999"), 9999999)


if __name__ == "__main__":
    unittest.main()
