# CI/CD Deployment Platform Backend API

Production-ready REST API powering the CI/CD Deployment Platform dashboard. Provides pipeline orchestration, stage tracking, real-time log streaming, release auditing, health monitoring, and rollback capabilities.

Operates in **MOCK MODE** (zero external dependencies/cloud setup required for instant frontend development) and **REAL MODE** (live GitHub Actions REST API & AWS deployment automation).

---

## Architecture & Tech Stack

- **Runtime**: Python 3.12, Flask 3.1 (Application Factory Pattern)
- **WSGI Server**: Gunicorn
- **Database**: SQLite3 via standard library (`data/cicd.db`), parameterized queries, strict schema
- **Security**: URLSafeTimedSerializer signed tokens, Werkzeug password hashing with dummy timing attack mitigation, constant-time HMAC-SHA256 signature verification, brute-force rate throttling
- **Tests**: `unittest` suite (fully compatible with `pytest`)

---

## Quick Start

### 1. Environment Setup

```bash
cd backend
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows:
.\.venv\Scripts\activate

pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure `SECRET_KEY` is at least 32 characters long. By default, `USE_MOCK=true` runs the deterministic provider with 25 pre-seeded runs, demo users, and deployment history.

Default Mock Credentials:
| Username | Password | Role |
| :--- | :--- | :--- |
| `admin` | `Admin@12345` | **admin** |
| `developer` | `Dev@123456` | **developer** |
| `viewer` | `View@12345` | **viewer** |

### 3. Run the Server

**Development Mode (Direct Python):**
```bash
python run.py
```

**Production Mode (Gunicorn):**
```bash
gunicorn -w 4 -b 0.0.0.0:8000 run:app
```

**Docker Container:**
```bash
docker build -t cicd-backend:latest .
docker run -p 8000:8000 --env-file .env cicd-backend:latest
```

---

## Role-Based Access Control (RBAC)

Hierarchical roles enforced server-side on every request via a central `before_request` hook (`viewer < developer < admin`). Unlisted endpoints require at least `viewer`.

| Role | Access Level | Description |
| :--- | :--- | :--- |
| **Public** | No authentication required | `/api/health`, `/api/auth/login`, HMAC-signed `/api/webhooks/deployment` |
| **viewer** | Read-Only Audit | Access pipeline runs, run details, stage statuses, branches, KPI stats, deployment releases, and `/api/app-health` |
| **developer** | viewer + Execution Logs | All viewer capabilities plus raw build/test/deploy stage execution logs (`/api/runs/:id/stages/:stage/logs`) |
| **admin** | Full Control + Operations | All developer capabilities plus production rollbacks (`/api/deployments/:id/rollback`), user management (`/api/users`), and system settings audit (`/api/settings`) |

*Note: `X-API-Key` can authenticate ONLY the rollback endpoint (`POST /api/deployments/:id/rollback`) as a dedicated automation identity. It is rejected everywhere else.*

---

## Endpoint Reference

All endpoints are prefixed with `/api`.

| Method | Endpoint | Min. Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status, operating mode (`mock` or `real`), timestamp |
| `POST` | `/api/auth/login` | Public | Authenticates username & password; returns Bearer token (throttled at 5 fails/15m) |
| `POST` | `/api/webhooks/deployment` | Public (HMAC) | GitHub Actions deployment report with `X-Signature-256` HMAC validation |
| `GET` | `/api/auth/me` | viewer | Returns currently authenticated user details (never hashes) |
| `POST` | `/api/auth/logout` | viewer | Stateless client session logout acknowledgment |
| `GET` | `/api/app-health` | viewer | Probes target application health endpoint (5s timeout) |
| `GET` | `/api/runs` | viewer | Paginated runs with filters (`status`, `branch`, `event`, `search`) |
| `GET` | `/api/runs/<id>` | viewer | Pipeline run details and its 4 sequential execution stages |
| `GET` | `/api/runs/<id>/stages` | viewer | Pipeline stages list only |
| `GET` | `/api/runs/<id>/stages/<stage>/logs` | **developer** | Last 500 lines of stage logs (`test`, `build`, `push`, `deploy`) |
| `GET` | `/api/branches` | viewer | Distinct branch names across pipeline runs |
| `GET` | `/api/stats` | viewer | KPI summary (success rate, avg duration, running count, recent runs) |
| `GET` | `/api/deployments` | viewer | Release history with `can_rollback` indicators (newest first) |
| `GET` | `/api/deployments/current` | viewer | Currently active production deployment metadata |
| `POST` | `/api/deployments/<id>/rollback` | **admin** / API-Key | Rolls back production release to target deployment |
| `POST` | `/api/deployments/import` | **admin** | Imports past successful runs from GitHub (idempotent) |
| `GET` | `/api/diagnostics` | **admin** | Runs all 11 preflight checks (no secrets exposed) |
| `GET` | `/api/users` | **admin** | List registered users (password hashes never exposed) |
| `POST` | `/api/users` | **admin** | Create user account with role assignment |
| `PATCH` | `/api/users/<id>` | **admin** | Update user role, status, or password (increments `token_version`) |
| `GET` | `/api/settings` | **admin** | Cloud infrastructure targets and secret configuration audit |

---

## How Rollback Works

Rollback restores production traffic to an earlier known-good release image tag.

### Safety Guards
1. Deployment must exist (returns `404` if unknown).
2. Deployment must have `status: success` (returns `409` if failed or in-progress).
3. Deployment must not already be the current live version (returns `409` if already current).

### Mock Mode
When `USE_MOCK=true`:
1. Instantly unsets `is_current = 0` on active deployment.
2. Creates and commits a new deployment entry marked `is_current = 1`, copying image tag and commit metadata, and setting `rolled_back_from` to the source deployment ID.
3. Returns HTTP `200 OK` with the new active deployment record.

### Real Mode
When `USE_MOCK=false`:
1. Triggers GitHub Actions workflow dispatch on `rollback.yml` with inputs:
   - `image_tag`: Docker release tag
   - `deployment_id`: Original deployment ID
2. The `rollback.yml` GitHub Actions job validates the tag against `^[A-Za-z0-9._-]+$`, pulls the existing image from AWS ECR, deploys it to AWS EC2, and runs a health probe.
3. Upon health verification, `rollback.yml` sends a signed webhook payload to `POST /api/webhooks/deployment` with `rolled_back_from`.
4. Returns HTTP `202 Accepted`.

---

## Switch from Demo to Real (Checklist)

> **Env loading:** `python run.py` and `python manage.py` load `backend/.env` and the project-root `.env` automatically. Real OS environment variables always take priority.

1. **Prepare EC2 and ECR**: Create an ECR repo (name only, e.g. `my-app`), install Docker + AWS CLI (or attach an IAM role with `AmazonEC2ContainerRegistryReadOnly`) on EC2, and open `APP_PORT` (default `5000`) + SSH (`22`) in the EC2 Security Group.
2. **Add workflows, secrets, and variables to your app repository**:
   - Copy `workflows/deploy.yml` and `workflows/rollback.yml` into `.github/workflows/` on the default branch (`main`).
   - Add GitHub Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `WEBHOOK_SECRET`, `DASHBOARD_API_URL`.
   - Add GitHub Variables: `ECR_REPOSITORY` (name only, e.g. `my-app`) and `APP_PORT` (default `5000`).
3. **Confirm the pipeline is green**: Push to `main` and verify `deploy.yml` passes in GitHub Actions.
4. **Configure `.env`**:
   ```ini
   USE_MOCK=false
   GITHUB_TOKEN=ghp_yourPersonalAccessTokenWithWorkflowScope
   GITHUB_OWNER=your-org-or-username
   GITHUB_REPO=your-repository-name
   GITHUB_BRANCH=main
   GITHUB_WORKFLOW_FILE=deploy.yml
   ROLLBACK_WORKFLOW_FILE=rollback.yml
   AWS_REGION=us-east-1
   ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com
   ECR_REPOSITORY=my-app
   EC2_HOST=ec2-xx-xx-xx-xx.compute-1.amazonaws.com
   APP_PORT=5000
   APP_HEALTH_URL=http://ec2-xx-xx-xx-xx.compute-1.amazonaws.com:5000/health
   SECRET_KEY=generate-at-least-32-hex-characters-here
   API_KEY=automation-key-for-headless-rollback
   WEBHOOK_SECRET=shared-secret-between-github-actions-and-dashboard
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=YourStrongInitialPassword123
   ```
5. **Start DeployHub** (and reset or purge demo users if reusing an old database):
   ```bash
   python manage.py purge-demo-users
   python manage.py create-admin
   gunicorn -w 4 -b 0.0.0.0:8000 run:app
   ```
6. **Run preflight diagnostics**:
   ```bash
   python manage.py check
   ```
7. **Make the dashboard publicly reachable**: Expose port `8000`/`8080` via HTTPS (public server, ngrok, or Cloudflare Tunnel) and set GitHub secret `DASHBOARD_API_URL` to that URL.
8. **Push again and watch the deployment appear** (or use `POST /api/deployments/import` for past runs).

### Diagnostics Troubleshooting

| Check | Common FAIL / WARN Cause | Fix |
| :--- | :--- | :--- |
| `database` | Unreachable DB or missing tables | Verify `DATABASE_URL` / `DATABASE_PATH` and run `init_db` |
| `demo_users` | Demo accounts (`admin`/`developer`/`viewer`) present in real mode | Run `python manage.py purge-demo-users` or reset DB |
| `secrets_config` | `SECRET_KEY` < 32 chars, placeholder, or missing `WEBHOOK_SECRET` | Generate hex secrets (`openssl rand -hex 24`) |
| `github_connection` | 401 Bad credentials, 404 repo not found, or missing Actions scope | Check `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_TOKEN` |
| `github_workflows` | `deploy.yml`/`rollback.yml` missing or no `workflow_dispatch` | Commit workflows to `.github/workflows/` on `main` |
| `github_secrets_vars` | Missing required GitHub secret or `ECR_REPOSITORY` variable | Add all 8 secrets and `ECR_REPOSITORY` in GitHub Repo Settings |
| `ecr_config` | Placeholder in `ECR_REPOSITORY` or unknown `ECR_REGISTRY` | Set `ECR_REPOSITORY=my-app` and `ECR_REGISTRY` |
| `app_health` | Target unreachable or missing port when `APP_PORT` != 80/443 | Open `APP_PORT` in EC2 SG; include port in `APP_HEALTH_URL` |
| `webhook_reachability` | `CORS_ORIGINS` or `DASHBOARD_API_URL` uses `localhost` | Use a public HTTPS URL or tunnel for `DASHBOARD_API_URL` |

---

## Running the Test Suite

Execute the 55+ test automated verification suite:

```bash
# Using Python's standard unittest runner
python -m unittest discover tests

# Or using pytest (if installed)
pytest -v tests/
```
