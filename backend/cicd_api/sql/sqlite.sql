-- SQLite schema for CI/CD Platform (local dev / tests)
-- All statements are idempotent: safe to run on every startup.

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL,
    full_name       TEXT    NOT NULL,
    password_hash   TEXT    NOT NULL,
    role            TEXT    NOT NULL CHECK(role IN ('viewer', 'developer', 'admin')),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    token_version   INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL,
    last_login_at   TEXT
);

CREATE TABLE IF NOT EXISTS deployments (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id            INTEGER,
    commit_sha        TEXT    NOT NULL,
    commit_message    TEXT    NOT NULL,
    author            TEXT    NOT NULL,
    image_tag         TEXT    NOT NULL,
    image_uri         TEXT,
    status            TEXT    NOT NULL CHECK(status IN ('success', 'failed', 'in_progress')),
    health            TEXT    NOT NULL CHECK(health IN ('healthy', 'unhealthy', 'unknown')),
    deployed_at       TEXT    NOT NULL,
    is_current        INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0, 1)),
    rolled_back_from  INTEGER REFERENCES deployments(id) ON DELETE SET NULL
);

-- Unique on lower(username) so "Admin" and "admin" collide
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username_lower
    ON users (lower(username));

-- At most one deployment may be current
CREATE UNIQUE INDEX IF NOT EXISTS ux_deployments_single_current
    ON deployments (is_current)
    WHERE is_current = 1;

-- Fast newest-first lookup
CREATE INDEX IF NOT EXISTS ix_deployments_deployed_at
    ON deployments (deployed_at DESC);

CREATE TABLE IF NOT EXISTS repositories (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    owner                   TEXT    NOT NULL,
    repo                    TEXT    NOT NULL,
    full_name               TEXT    NOT NULL,
    branch                  TEXT    NOT NULL DEFAULT 'main',
    workflow_file           TEXT    NOT NULL DEFAULT 'deploy.yml',
    rollback_workflow_file  TEXT    NOT NULL DEFAULT 'rollback.yml',
    is_active               INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0, 1)),
    created_at              TEXT    NOT NULL,
    updated_at              TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_repositories_full_name_lower
    ON repositories (lower(full_name));

CREATE UNIQUE INDEX IF NOT EXISTS ux_repositories_single_active
    ON repositories (is_active)
    WHERE is_active = 1;

CREATE TABLE IF NOT EXISTS platform_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,
    target      TEXT,
    details     TEXT,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at
    ON audit_logs (created_at DESC);
