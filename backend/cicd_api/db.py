"""
Database access layer for the CI/CD Platform.

Engine selection:
  - DATABASE_URL unset  -> SQLite at DATABASE_PATH (default data/cicd.db)
  - DATABASE_URL set    -> PostgreSQL via psycopg[binary] >= 3.1

All app SQL uses ? placeholders; a thin wrapper translates them to %s for PG.
"""

import sqlite3
import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from flask import g, current_app
from werkzeug.security import generate_password_hash

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# psycopg lazy import – SQLite-only installs continue to work
# ---------------------------------------------------------------------------
try:
    import psycopg
    import psycopg.errors
    _psycopg_available = True
except ImportError:
    psycopg = None  # type: ignore[assignment]
    _psycopg_available = False

# Tuple of integrity-error types to catch at call sites
def _build_integrity_errors():
    errs = [sqlite3.IntegrityError]
    if _psycopg_available:
        errs.append(psycopg.errors.IntegrityConstraintViolation)  # type: ignore[attr-defined]
    return tuple(errs)

INTEGRITY_ERRORS: tuple = _build_integrity_errors()

# ---------------------------------------------------------------------------
# Schema loading
# ---------------------------------------------------------------------------
_SQL_DIR = Path(__file__).parent / "sql"

def _load_sql(filename: str) -> str:
    return (_SQL_DIR / filename).read_text(encoding="utf-8")

def _split_statements(sql: str) -> list[str]:
    """Split SQL text into individual statements, ignoring comment-only lines."""
    stmts = []
    current: list[str] = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--") or not stripped:
            continue
        current.append(line)
        if stripped.endswith(";"):
            stmts.append("\n".join(current).strip())
            current = []
    if current:
        remaining = "\n".join(current).strip()
        if remaining:
            stmts.append(remaining)
    return stmts

# ---------------------------------------------------------------------------
# Engine detection helpers
# ---------------------------------------------------------------------------
def _is_postgres(cfg=None) -> bool:
    """Returns True when DATABASE_URL points to PostgreSQL."""
    url = None
    if cfg is not None:
        url = cfg.database_url
    else:
        try:
            url = current_app.config["APP_CONFIG"].database_url
        except RuntimeError:
            pass
    if not url:
        return False
    return url.startswith("postgresql://") or url.startswith("postgres://")

def _require_psycopg() -> None:
    if not _psycopg_available:
        raise RuntimeError(
            "DATABASE_URL is set to a PostgreSQL URL but psycopg[binary] is not installed. "
            "Run: pip install 'psycopg[binary]>=3.1,<4'"
        )

# ---------------------------------------------------------------------------
# Placeholder translation: ? -> %s for PostgreSQL
# ---------------------------------------------------------------------------
def _adapt_sql(sql: str, use_pg: bool) -> str:
    """Translates ? placeholders to %s when targeting PostgreSQL."""
    if not use_pg:
        return sql
    result = []
    i = 0
    while i < len(sql):
        if sql[i] == "?":
            result.append("%s")
        else:
            result.append(sql[i])
        i += 1
    return "".join(result)

# ---------------------------------------------------------------------------
# Row normalisation for PostgreSQL (datetime -> ISO string, dict rows)
# ---------------------------------------------------------------------------
def _normalise_pg_row(row) -> dict:
    """Convert a psycopg Row/dict to a plain dict with ISO-8601 datetime strings."""
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            d[k] = v.isoformat()
    return d

# ---------------------------------------------------------------------------
# Advisory lock context manager (PG only; no-op on SQLite)
# ---------------------------------------------------------------------------
@contextmanager
def startup_lock(conn):
    """Acquires a PG advisory lock during schema creation; no-op on SQLite."""
    if isinstance(conn, sqlite3.Connection):
        yield
        return
    # Use a fixed lock id – any consistent int works for single-app locking
    LOCK_ID = 7472637263
    conn.execute(_adapt_sql("SELECT pg_advisory_lock(?)", True), (LOCK_ID,))
    try:
        yield
    finally:
        conn.execute(_adapt_sql("SELECT pg_advisory_unlock(?)", True), (LOCK_ID,))

# ---------------------------------------------------------------------------
# insert_returning_id helper
# ---------------------------------------------------------------------------
def insert_returning_id(conn, sql: str, params: tuple) -> int:
    """Executes an INSERT and returns the new row id on both SQLite and PostgreSQL."""
    use_pg = not isinstance(conn, sqlite3.Connection)
    adapted = _adapt_sql(sql, use_pg)
    if use_pg:
        adapted = adapted.rstrip(";").rstrip() + " RETURNING id"
        cur = conn.execute(adapted, params)
        row = cur.fetchone()
        return dict(row)["id"]
    else:
        cur = conn.execute(adapted, params)
        return cur.lastrowid

# ---------------------------------------------------------------------------
# SQLite in-memory connection registry (keeps shared-cache alive)
# ---------------------------------------------------------------------------
_in_memory_keepalive: dict[str, sqlite3.Connection] = {}

# ---------------------------------------------------------------------------
# get_db / close_db
# ---------------------------------------------------------------------------
def get_db(db_path: str | None = None):
    """Returns the per-request database connection stored on flask.g."""
    if "db" not in g:
        cfg = current_app.config["APP_CONFIG"]
        use_pg = _is_postgres(cfg)

        if use_pg:
            _require_psycopg()
            conn = _pg_connect(cfg.database_url)
            g.db = conn
            g.db_is_pg = True
        else:
            path = db_path or cfg.database_path
            conn = _sqlite_connect(path)
            g.db = conn
            g.db_is_pg = False

    return g.db

def _sqlite_connect(path: str) -> sqlite3.Connection:
    is_uri = False
    if path == ":memory:":
        path = "file:cicd_mem?mode=memory&cache=shared"
        is_uri = True
    elif path.startswith("file:"):
        is_uri = True

    if is_uri:
        if path not in _in_memory_keepalive:
            _in_memory_keepalive[path] = sqlite3.connect(path, uri=True, timeout=5)
    else:
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(path, uri=is_uri, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def _pg_connect(url: str):
    conn = psycopg.connect(  # type: ignore[union-attr]
        url,
        connect_timeout=5,
        row_factory=psycopg.rows.dict_row,  # type: ignore[attr-defined]
    )
    conn.execute("SET timezone = 'UTC'")
    conn.autocommit = False
    return conn

def close_db(e=None) -> None:
    """Closes the active database connection on request teardown."""
    db = g.pop("db", None)
    g.pop("db_is_pg", None)
    if db is not None:
        db.close()

# ---------------------------------------------------------------------------
# execute / fetchone / fetchall wrappers that normalise rows
# ---------------------------------------------------------------------------
def db_execute(conn, sql: str, params: tuple = ()):
    """Execute a parameterised statement; translates ? -> %s for PG."""
    use_pg = not isinstance(conn, sqlite3.Connection)
    return conn.execute(_adapt_sql(sql, use_pg), params)

def db_fetchone(conn, sql: str, params: tuple = ()) -> dict | None:
    """Execute and return one row as a plain dict (or None)."""
    use_pg = not isinstance(conn, sqlite3.Connection)
    cur = conn.execute(_adapt_sql(sql, use_pg), params)
    row = cur.fetchone()
    if row is None:
        return None
    return _normalise_pg_row(row) if use_pg else dict(row)

def db_fetchall(conn, sql: str, params: tuple = ()) -> list[dict]:
    """Execute and return all rows as plain dicts."""
    use_pg = not isinstance(conn, sqlite3.Connection)
    cur = conn.execute(_adapt_sql(sql, use_pg), params)
    rows = cur.fetchall()
    if use_pg:
        return [_normalise_pg_row(r) for r in rows]
    return [dict(r) for r in rows]

def db_commit(conn) -> None:
    if isinstance(conn, sqlite3.Connection):
        conn.commit()
    else:
        conn.commit()

def db_rollback(conn) -> None:
    if isinstance(conn, sqlite3.Connection):
        conn.rollback()
    else:
        conn.rollback()

# ---------------------------------------------------------------------------
# Schema initialisation
# ---------------------------------------------------------------------------
def init_db(app) -> None:
    """Initialises database tables on startup (idempotent)."""
    cfg = app.config["APP_CONFIG"]
    use_pg = _is_postgres(cfg)

    if use_pg:
        _require_psycopg()

    if not use_pg and cfg.database_path not in (":memory:",) and not cfg.database_path.startswith("file:"):
        Path(cfg.database_path).parent.mkdir(parents=True, exist_ok=True)

    with app.app_context():
        conn = get_db(None if use_pg else cfg.database_path)
        schema_sql = _load_sql("postgres.sql" if use_pg else "sqlite.sql")
        statements = _split_statements(schema_sql)

        with startup_lock(conn):
            for stmt in statements:
                db_execute(conn, stmt)
            db_commit(conn)

# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------
def seed_database(app) -> None:
    """Seeds initial users and deployments if tables are empty."""
    cfg = app.config["APP_CONFIG"]
    use_pg = _is_postgres(cfg)
    now_iso = datetime.now(timezone.utc).isoformat()

    with app.app_context():
        conn = get_db(None if use_pg else cfg.database_path)

        with startup_lock(conn):
            row = db_fetchone(conn, "SELECT COUNT(*) AS n FROM users")
            user_count = row["n"]

            if user_count == 0:
                if cfg.use_mock:
                    demo_users = [
                        ("admin", "DevOps Administrator", generate_password_hash("Admin@12345"), "admin"),
                        ("developer", "DevOps Engineer", generate_password_hash("Dev@123456"), "developer"),
                        ("viewer", "Auditor Viewer", generate_password_hash("View@12345"), "viewer"),
                    ]
                    for uname, fname, phash, role in demo_users:
                        insert_returning_id(
                            conn,
                            "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                            "VALUES (?, ?, ?, ?, 1, 1, ?)",
                            (uname, fname, phash, role, now_iso),
                        )
                    db_commit(conn)
                    logger.info("Mock mode: seeded 3 demo users (admin, developer, viewer).")
                elif cfg.admin_password:
                    insert_returning_id(
                        conn,
                        "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                        "VALUES (?, ?, ?, 'admin', 1, 1, ?)",
                        (cfg.admin_username, "System Administrator", generate_password_hash(cfg.admin_password), now_iso),
                    )
                    db_commit(conn)
                    logger.info("Real mode: seeded admin user '%s'.", cfg.admin_username)

            row2 = db_fetchone(conn, "SELECT COUNT(*) AS n FROM deployments")
            dep_count = row2["n"]

            if dep_count == 0 and cfg.use_mock:
                from .services.mock_provider import MockProvider
                provider = MockProvider()
                successful_runs = [r for r in provider.list_runs() if r.get("deploys")]
                seed_runs = successful_runs[:6]

                for idx, r in enumerate(seed_runs):
                    is_current = 1 if idx == 0 else 0
                    # Validate run_id before storing
                    raw_rid = r.get("id")
                    safe_rid = _validate_run_id(raw_rid)
                    insert_returning_id(
                        conn,
                        "INSERT INTO deployments (run_id, commit_sha, commit_message, author, image_tag, image_uri, "
                        "status, health, deployed_at, is_current, rolled_back_from) "
                        "VALUES (?, ?, ?, ?, ?, ?, 'success', 'healthy', ?, ?, NULL)",
                        (
                            safe_rid,
                            r["commit_sha"],
                            r["message"],
                            r["author"],
                            r["image_tag"],
                            r["image_uri"],
                            r["started_at"],
                            is_current,
                        ),
                    )
                db_commit(conn)
                logger.info("Mock mode: seeded %d successful deployments (1 current).", len(seed_runs))

# ---------------------------------------------------------------------------
# Input hardening
# ---------------------------------------------------------------------------
def _validate_run_id(value) -> int | None:
    """Accept only integers 0 < v < 2**63, not bool. Anything else -> None."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    try:
        v = int(value)
    except (TypeError, ValueError):
        return None
    if v <= 0 or v >= 2**63:
        return None
    return v

def validate_run_id(value) -> int | None:
    """Public alias for webhook validation."""
    return _validate_run_id(value)

def validate_rolled_back_from(conn, value) -> int | None:
    """Return deployment id only if the row exists; otherwise None."""
    if value is None:
        return None
    try:
        rid = int(value)
    except (TypeError, ValueError):
        return None
    row = db_fetchone(conn, "SELECT id FROM deployments WHERE id = ?", (rid,))
    return rid if row else None
