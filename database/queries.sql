-- queries.sql – Ready-made queries for the deployhub database.
-- Connect: docker compose exec db psql -U deployhub -d deployhub
-- All WRITE statements are commented out and require deliberate action.

-- =============================================================================
-- READ queries
-- =============================================================================

-- List all users (without password hashes)
SELECT id, username, full_name, role, is_active, token_version, created_at, last_login_at
FROM users
ORDER BY id;

-- ----------------------------------------------------------------------------

-- Current live deployment
SELECT id, image_tag, commit_sha, commit_message, author, deployed_at, health
FROM deployments
WHERE is_current = 1;

-- ----------------------------------------------------------------------------

-- Last 20 deployments (newest first)
SELECT id, image_tag, status, health, is_current, deployed_at, author
FROM deployments
ORDER BY deployed_at DESC
LIMIT 20;

-- ----------------------------------------------------------------------------

-- Deployments by outcome
SELECT status, COUNT(*) AS total
FROM deployments
GROUP BY status
ORDER BY total DESC;

-- ----------------------------------------------------------------------------

-- All rollbacks (deployments that reference a previous one)
SELECT d.id, d.image_tag, d.deployed_at, d.author,
       d.rolled_back_from AS original_deployment_id,
       orig.image_tag     AS original_image_tag
FROM deployments d
JOIN deployments orig ON orig.id = d.rolled_back_from
ORDER BY d.deployed_at DESC;

-- ----------------------------------------------------------------------------

-- Deployments per author
SELECT author, COUNT(*) AS deployments
FROM deployments
GROUP BY author
ORDER BY deployments DESC;

-- ----------------------------------------------------------------------------

-- Inactive accounts
SELECT id, username, full_name, role, last_login_at
FROM users
WHERE is_active = 0
ORDER BY username;

-- =============================================================================
-- WRITE queries (COMMENTED OUT – uncomment deliberately)
-- =============================================================================

-- Lock out an account
-- UPDATE users SET is_active = 0, token_version = token_version + 1 WHERE username = 'username_here';

-- Sign a user out everywhere by bumping token_version
-- UPDATE users SET token_version = token_version + 1 WHERE username = 'username_here';

-- Promote a user to admin
-- UPDATE users SET role = 'admin', token_version = token_version + 1 WHERE username = 'username_here';
