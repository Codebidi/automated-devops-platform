-- PostgreSQL 16 schema for CI/CD Platform (production)
-- All statements are idempotent: safe to run on every startup.

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL   PRIMARY KEY,
    username        VARCHAR(32) NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    password_hash   TEXT        NOT NULL,
    role            VARCHAR(10) NOT NULL CHECK(role IN ('viewer', 'developer', 'admin')),
    is_active       SMALLINT    NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    token_version   INTEGER     NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL,
    last_login_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS deployments (
    id                BIGSERIAL    PRIMARY KEY,
    run_id            BIGINT,
    commit_sha        VARCHAR(64)  NOT NULL,
    commit_message    TEXT         NOT NULL,
    author            VARCHAR(120) NOT NULL,
    image_tag         VARCHAR(200) NOT NULL,
    image_uri         TEXT,
    status            VARCHAR(12)  NOT NULL CHECK(status IN ('success', 'failed', 'in_progress')),
    health            VARCHAR(10)  NOT NULL CHECK(health IN ('healthy', 'unhealthy', 'unknown')),
    deployed_at       TIMESTAMPTZ  NOT NULL,
    is_current        SMALLINT     NOT NULL DEFAULT 0 CHECK(is_current IN (0, 1)),
    rolled_back_from  BIGINT       REFERENCES deployments(id) ON DELETE SET NULL
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
