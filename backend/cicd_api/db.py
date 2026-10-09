import os
import sqlite3
import logging
from datetime import datetime, timezone
from pathlib import Path
from flask import g, current_app
from werkzeug.security import generate_password_hash

logger = logging.getLogger(__name__)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('viewer', 'developer', 'admin')),
    is_active INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT,
    commit_sha TEXT NOT NULL,
    commit_message TEXT NOT NULL,
    author TEXT NOT NULL,
    image_tag TEXT NOT NULL,
    image_uri TEXT,
    status TEXT NOT NULL,
    health TEXT NOT NULL,
    deployed_at TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0,
    rolled_back_from TEXT
);
"""

_in_memory_keepalive: dict[str, sqlite3.Connection] = {}

def get_db(db_path: str | None = None) -> sqlite3.Connection:
    """Returns the per-request SQLite connection stored on flask.g, or a direct connection."""
    if "db" not in g:
        path = db_path or (current_app.config["APP_CONFIG"].database_path if current_app else "data/cicd.db")
        is_uri = False
        if path == ":memory:":
            path = "file:cicd_mem?mode=memory&cache=shared"
            is_uri = True
            if path not in _in_memory_keepalive:
                _in_memory_keepalive[path] = sqlite3.connect(path, uri=True)
        elif path.startswith("file:"):
            is_uri = True
            if path not in _in_memory_keepalive:
                _in_memory_keepalive[path] = sqlite3.connect(path, uri=True)
        else:
            Path(path).parent.mkdir(parents=True, exist_ok=True)

        conn = sqlite3.connect(path, uri=is_uri)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        g.db = conn
    return g.db

def close_db(e=None) -> None:
    """Closes the active database connection on request teardown."""
    db = g.pop("db", None)
    if db is not None:
        db.close()

def init_db(app) -> None:
    """Initializes database tables on startup."""
    cfg = app.config["APP_CONFIG"]
    if cfg.database_path != ":memory:":
        Path(cfg.database_path).parent.mkdir(parents=True, exist_ok=True)
    with app.app_context():
        conn = get_db(cfg.database_path)
        conn.executescript(SCHEMA_SQL)
        conn.commit()

def seed_database(app) -> None:
    """Seeds initial users and deployments if tables are empty."""
    cfg = app.config["APP_CONFIG"]
    now_iso = datetime.now(timezone.utc).isoformat()

    with app.app_context():
        conn = get_db(cfg.database_path)
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]

        if user_count == 0:
            if cfg.use_mock:
                # Seed demo users in mock mode
                demo_users = [
                    ("admin", "DevOps Administrator", generate_password_hash("Admin@12345"), "admin"),
                    ("developer", "DevOps Engineer", generate_password_hash("Dev@123456"), "developer"),
                    ("viewer", "Auditor Viewer", generate_password_hash("View@12345"), "viewer"),
                ]
                for uname, fname, phash, role in demo_users:
                    conn.execute(
                        "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                        "VALUES (?, ?, ?, ?, 1, 1, ?)",
                        (uname, fname, phash, role, now_iso),
                    )
                conn.commit()
                logger.info("Mock mode: seeded 3 demo users (admin, developer, viewer).")
            else:
                # Real mode: seed single admin from ADMIN_USERNAME / ADMIN_PASSWORD if provided
                if cfg.admin_password:
                    conn.execute(
                        "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                        "VALUES (?, ?, ?, 'admin', 1, 1, ?)",
                        (cfg.admin_username, "System Administrator", generate_password_hash(cfg.admin_password), now_iso),
                    )
                    conn.commit()
                    logger.info(f"Real mode: seeded admin user '{cfg.admin_username}'.")
        dep_count = conn.execute("SELECT COUNT(*) FROM deployments").fetchone()[0]
        if dep_count == 0 and cfg.use_mock:
            from .services.mock_provider import MockProvider
            provider = MockProvider()
            successful_runs = [r for r in provider.list_runs() if r.get("deploys")]
            seed_runs = successful_runs[:6]

            for idx, r in enumerate(seed_runs):
                is_current = 1 if idx == 0 else 0
                conn.execute(
                    "INSERT INTO deployments (run_id, commit_sha, commit_message, author, image_tag, image_uri, status, health, deployed_at, is_current, rolled_back_from) "
                    "VALUES (?, ?, ?, ?, ?, ?, 'success', 'healthy', ?, ?, NULL)",
                    (
                        r["id"],
                        r["commit_sha"],
                        r["message"],
                        r["author"],
                        r["image_tag"],
                        r["image_uri"],
                        r["started_at"],
                        is_current,
                    ),
                )
            conn.commit()
            logger.info("Mock mode: seeded %d successful deployments (1 current).", len(seed_runs))
