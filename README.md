# DeployHub — Enterprise AI DevOps & CI/CD Platform

> **DeployHub** is a production-grade CI/CD orchestration, monitoring, and automated deployment management platform. It combines real-time pipeline monitoring, automated multi-stage builds, cloud deployments (AWS ECR & EC2), role-based security access control (RBAC), and one-click rollback capabilities.

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features](#-key-features)
- [Directory Structure](#-directory-structure)
- [Tech Stack](#-tech-stack)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Mock / Demo Mode (Instant Setup)](#1-mock--demo-mode-instant-setup)
  - [2. Live Cloud Mode (GitHub Actions & AWS)](#2-live-cloud-mode-github-actions--aws)
  - [3. Full Docker Compose Stack](#3-full-docker-compose-stack)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [API Reference](#-api-reference)
- [Database Management](#-database-management)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏛 Overview & Architecture

DeployHub bridges the gap between infrastructure automation and team observability:

```
                      ┌──────────────────────────────────────────────┐
                      │          React 18 + Vite Dashboard           │
                      │   (cicd-dashboard/ or frontend/ junction)    │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTP REST / JSON
                      ┌──────────────────────▼───────────────────────┐
                      │       Flask 3.1 REST API Backend             │
                      │               (backend/)                     │
                      └──────────────┬────────────────┬──────────────┘
                                     │                │
            SQL Queries / Pooling    │                │ REST / Webhooks
 ┌───────────────────────────────────▼───┐        ┌───▼───────────────────────────┐
 │        PostgreSQL 16 Database         │        │    GitHub Actions & AWS       │
 │             (database/)               │        │   • ECR Container Registry    │
 │   • User authentication & audit       │        │   • EC2 Production Deploy     │
 │   • Deployment history & releases     │        │   • Automated Rollback Flow   │
 └───────────────────────────────────────┘        └───────────────────────────────┘
```

The system operates in two distinct operational modes:
1. **Mock / Demo Mode (`USE_MOCK=true`)**: Runs completely self-contained with no external cloud or GitHub dependencies required. Ideal for client presentations, local development, and UI testing.
2. **Real Mode (`USE_MOCK=false`)**: Integrates directly with the live GitHub Actions REST API, AWS Elastic Container Registry (ECR), AWS EC2 hosts, and PostgreSQL.

---

## 🚀 Key Features

- **Multi-Stage Pipeline Observability**: Real-time inspection of 4 sequential pipeline stages:
  1. *Stage 1: Lint & Automated Test*
  2. *Stage 2: Docker Build & ECR Push*
  3. *Stage 3: EC2 Deployment & Health Check*
  4. *Stage 4: Automated Audit & Webhook Reporting*
- **Terminal Log Streaming**: Built-in, color-syntax live terminal viewer for reviewing stage logs.
- **One-Click Instant Rollback**: Roll back unhealthy production releases to previous stable versions with automatic target resolution.
- **Enterprise RBAC**: Hierarchical authorization (`Viewer < Developer < Admin`) with PBKDF2/Argon2 password hashing, signed bearer session tokens, and timing-attack mitigations.
- **Production Health Monitoring**: Continuous background health verification for deployed target endpoints.
- **Disaster Recovery**: Automated, timestamped GZIP database backups and restore routines.

---

## 📂 Directory Structure

```
ai-devops-platform/
├── .github/
│   └── workflows/
│       ├── deploy.yml            # GitHub Actions CI/CD deployment pipeline
│       └── rollback.yml          # GitHub Actions automated rollback workflow
├── backend/
│   ├── cicd_api/
│   │   ├── routes/               # API Controllers (auth, runs, deployments, users, webhooks)
│   │   ├── services/             # Core logic (github_provider, mock_provider, health_service)
│   │   └── sql/                  # Schemas (postgres.sql for prod, sqlite.sql for dev)
│   ├── tests/                    # Backend API unit test suite (pytest compatible)
│   ├── Dockerfile                # Backend container definition
│   ├── requirements.txt          # Python package dependencies
│   ├── run.py                    # Flask development server entry point
│   └── README.md                 # Detailed backend documentation
├── cicd-dashboard/ (frontend/)
│   ├── src/
│   │   ├── api/                  # API client & fallback bridge (pipelineApi.js)
│   │   ├── components/           # UI components (PipelineStepper, LogViewer, MetricsCharts)
│   │   ├── context/              # Context providers (AuthContext, ThemeContext, ToastContext)
│   │   ├── data/                 # Static mock dataset (mockRuns.js)
│   │   └── pages/                # App views (Dashboard, Runs, Deployments, Settings, Login)
│   ├── package.json              # Dashboard dependencies & Vite scripts
│   └── vite.config.js            # Bundler, port, and proxy configuration
├── database/
│   ├── backup.sh                 # PostgreSQL automated backup script
│   ├── restore.sh                # PostgreSQL database restore script
│   ├── queries.sql               # Performance, MTTR, and audit queries
│   └── README.md                 # Database schema dictionary & ER diagrams
├── .env                          # Local environment secrets and settings
├── .env.example                  # Reference environment template
├── docker-compose.yml            # Multi-service stack (db, backend, frontend)
├── package.json                  # Root npm workspace launcher
├── run-demo.bat                  # 1-Click Windows Batch launcher
├── run-demo.ps1                  # 1-Click PowerShell launcher
└── setup-demo.ps1                # Automated Windows WSL 2 and Docker setup script
```

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Tailwind CSS, Lucide React, Recharts |
| **Backend** | Python 3.12, Flask 3.1, PyJWT, Werkzeug, Gunicorn |
| **Database** | PostgreSQL 16 (production), SQLite 3 (lightweight dev) |
| **DevOps & Cloud** | Docker, Docker Compose, AWS ECR, AWS EC2, GitHub Actions |
| **Scripting & Automation** | PowerShell, Bash, Windows Batch |

---

## ⚡ Quick Start Guide

### 1. Mock / Demo Mode (Instant Setup)

In Mock Mode, the frontend serves full pipeline histories, metrics, and role switching instantly without needing Docker or cloud credentials.

#### Launch with 1-Click (Windows):
Double-click `run-demo.bat` in the project root, or execute:
```cmd
.\run-demo.bat
```
*(or via PowerShell: `.\run-demo.ps1`)*

#### Or launch via NPM:
```bash
# 1. Install dependencies (first time only)
cd cicd-dashboard && npm install && cd ..

# 2. Start from project root
npm run dev
```

Navigate to: **[http://localhost:8080](http://localhost:8080)** (or the displayed Vite local URL).

---

### 2. Live Cloud Mode (GitHub Actions & AWS)

To connect the platform to your live GitHub repository and AWS infrastructure:

1. **Update `.env` in the project root**:
   ```dotenv
   USE_MOCK=false
   GITHUB_TOKEN=ghp_yourRealPersonalAccessTokenHere
   GITHUB_OWNER=your-github-username-or-org
   GITHUB_REPO=your-repository-name
   GITHUB_BRANCH=main
   WEBHOOK_SECRET=your-hex-webhook-secret
   AWS_REGION=us-east-1
   ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com
   ECR_REPOSITORY=my-app
   EC2_HOST=ec2-xx-xx-xx-xx.compute-1.amazonaws.com
   APP_PORT=5000
   APP_HEALTH_URL=http://ec2-xx-xx-xx-xx.compute-1.amazonaws.com:5000/health
   CORS_ORIGINS=http://localhost:8080,http://localhost:5173
   ```

> **Environment Loading & Ports:**
> - `docker compose` reads the root `.env`.
> - Plain `python run.py` also reads `backend/.env` and the project-root `.env` automatically (real environment variables always take priority).
> - Frontend commands run inside `frontend/` (or `cicd-dashboard/`). Vite dev runs on port **5173**, while Docker serves the frontend on port **8080**.

---

## 🔄 Switch from Demo to Real Mode (Checklist)

Follow these steps in order when moving from demo mode (`USE_MOCK=true`) to a live GitHub + AWS repository:

1. **Prepare EC2 and ECR**:
   - Create an ECR repository (name only, e.g. `my-app`).
   - Provision an EC2 instance with Docker, AWS CLI (or an IAM instance profile with `AmazonEC2ContainerRegistryReadOnly`), and open `APP_PORT` (default `5000`) + SSH (`22`) in its Security Group.
2. **Add workflows, secrets, and variables to your app repository**:
   - Copy `backend/workflows/deploy.yml` and `backend/workflows/rollback.yml` into `.github/workflows/` on the default branch (`main`).
   - Add GitHub Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `WEBHOOK_SECRET`, `DASHBOARD_API_URL`.
   - Add GitHub Variables: `ECR_REPOSITORY` (name only, e.g. `my-app`) and `APP_PORT` (e.g. `5000`).
3. **Confirm the pipeline is green**:
   - Push to `main` and verify the `deploy.yml` workflow passes all steps in GitHub Actions.
4. **Configure `.env`**:
   - Copy `.env.example` to `.env`, set `USE_MOCK=false`, generate hex secrets (`openssl rand -hex 24`), and set `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `APP_HEALTH_URL`.
5. **Start DeployHub**:
   - Run `docker compose up --build` (or `python run.py` in `backend/` and `npm run dev` in `frontend/`).
   - If you previously ran in mock mode on the same database, reset or purge demo users first (see below).
6. **Run `python manage.py check`**:
   - Inside `backend/`, run `python manage.py check` (or click **Run checks** in Settings → Connection Checks) and resolve any `FAIL` or `WARN`.
7. **Make the dashboard publicly reachable**:
   - GitHub-hosted runners cannot reach `localhost`. Expose DeployHub via a public HTTPS server or tunnel (e.g. ngrok or Cloudflare Tunnel) and set GitHub secret `DASHBOARD_API_URL` to that URL.
8. **Push again and watch the deployment appear**:
   - Push a commit to `main` (or use **Import history from GitHub** on the Deployments page for past runs) and watch the signed webhook populate the live deployment.

### Resetting a Database That Still Contains Demo Users

If you switch an existing database from `USE_MOCK=true` to `USE_MOCK=false`:
- **Option 1 (Keep DB, remove only demo accounts):**
  ```bash
  cd backend
  python manage.py purge-demo-users
  python manage.py create-admin
  ```
- **Option 2 (Fresh database volume in Docker):**
  ```bash
  docker compose down -v
  docker compose up --build
  ```

### Diagnostics Troubleshooting Table

| Diagnostics FAIL / WARN | Cause | Fix |
| :--- | :--- | :--- |
| **Mode & Database** (`FAIL`) | Database unreachable or schema tables missing | Check `DATABASE_URL` / `DATABASE_PATH`; ensure Postgres is running and `init_db` ran. |
| **Demo Users Check** (`FAIL`) | Known demo accounts (`admin`/`developer`/`viewer` with demo passwords) exist in real mode | Run `python manage.py purge-demo-users` or reset the DB volume (`docker compose down -v`). |
| **Application Secrets** (`FAIL`) | `SECRET_KEY` < 32 chars, placeholder, or `WEBHOOK_SECRET` missing | Generate hex secrets with `openssl rand -hex 24` and update `.env`. |
| **GitHub Token & Repository** (`FAIL`) | 401 Bad credentials, 404 repo not found, or missing Actions scope | Verify `GITHUB_OWNER`, `GITHUB_REPO`, and regenerate `GITHUB_TOKEN` with `repo` + `workflow` scopes. |
| **GitHub Workflows** (`FAIL`) | `deploy.yml` or `rollback.yml` missing, or `rollback.yml` lacks `workflow_dispatch` | Commit both workflow files to `.github/workflows/` on your default branch (`main`). |
| **GitHub Secrets & Variables** (`FAIL`) | Missing required GitHub secrets or `ECR_REPOSITORY` variable | Add all 8 secrets and `ECR_REPOSITORY` / `APP_PORT` under GitHub Repo → Settings → Actions. |
| **ECR Repository & Registry** (`FAIL`/`WARN`) | Placeholder in `ECR_REPOSITORY` or `ECR_REGISTRY` unknown | Set `ECR_REPOSITORY` to a repo name only (e.g. `my-app`) and set `ECR_REGISTRY`. |
| **Application Health URL** (`FAIL`/`WARN`) | Target unreachable, non-2xx, or missing port when `APP_PORT` != 80/443 | Open `APP_PORT` in EC2 Security Group and set `APP_HEALTH_URL=http://<host>:<port>/health`. |
| **Dashboard Webhook Reachability** (`WARN`) | `CORS_ORIGINS` or `DASHBOARD_API_URL` uses `localhost` | Use a public HTTPS server or tunnel (ngrok / Cloudflare Tunnel) for `DASHBOARD_API_URL`. |

2. **Required GitHub Token Scopes**:
   - `repo` (Full repository control)
   - `workflow` (Update and trigger GitHub Actions workflows)

3. **Start the Backend API**:
   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate       # Windows
   pip install -r requirements.txt
   python run.py
   ```

---

### 3. Full Docker Compose Stack

To deploy the entire production stack (PostgreSQL + Python Backend + Nginx/React Frontend) in isolated containers:

```bash
# 1. Build and start all services
docker-compose up --build

# 2. Run detached in background
docker-compose up -d

# 3. View live logs
docker-compose logs -f

# 4. Stop containers
docker-compose down
```

---

## 🔐 Role-Based Access Control (RBAC)

The platform enforces strict role boundaries:

| Capability | Viewer | Developer | Admin |
| :--- | :---: | :---: | :---: |
| View Pipeline Runs & Status | ✅ | ✅ | ✅ |
| View Deployment History & KPI Metrics | ✅ | ✅ | ✅ |
| View Raw Terminal Build/Test Logs | ❌ | ✅ | ✅ |
| Trigger Manual Production Deployments | ❌ | ✅ | ✅ |
| Execute One-Click Production Rollbacks | ❌ | ❌ | ✅ |
| Manage Team Users & Access Keys | ❌ | ❌ | ✅ |

### Default Demo Credentials (Mock Mode)

| Account | Username | Password | Role Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@12345` | Full administrative control, rollbacks, and secrets management |
| **Developer** | `developer` | `Dev@123456` | Can trigger builds, inspect raw execution logs |
| **Viewer** | `viewer` | `View@12345` | Read-only audit access to runs and deployment status |

*(In Mock Mode, quick-select chips on the login screen allow 1-click credential auto-fill).*

---

## 📡 API Reference

All backend endpoints are served under `/api`:

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status and operational mode (`mock` or `real`) |
| `POST` | `/api/auth/login` | Public | Authenticates credentials; returns JWT session token |
| `GET` | `/api/auth/me` | Viewer | Returns current authenticated user profile |
| `GET` | `/api/runs` | Viewer | Returns paginated runs with branch and status filtering |
| `GET` | `/api/runs/:id` | Viewer | Detailed stage breakdowns and timing for a specific run |
| `GET` | `/api/runs/:id/stages/:stage/logs` | Developer | Fetches raw console output for a stage |
| `GET` | `/api/deployments` | Viewer | Lists deployment release history and target image tags |
| `GET` | `/api/deployments/current` | Viewer | Returns currently deployed active production version |
| `POST` | `/api/deployments/:id/rollback` | Admin | Triggers rollbacks to a previous deployment release |
| `GET` | `/api/settings` | Admin | Audits system configuration and configured secrets |
| `POST` | `/api/webhooks/deployment` | HMAC Validated | Webhook endpoint called by GitHub Actions on deploy completion |

---

## 💾 Database Management

PostgreSQL data is maintained under `database/`:

```bash
# Backup the database to a compressed GZIP archive
./database/backup.sh

# Restore from a backup archive
./database/restore.sh ./database/backups/deployhub_YYYY-MM-DD.sql.gz
```

Analytical queries for MTTR (Mean Time to Recovery) and release frequency are available in [`database/queries.sql`](database/queries.sql).

---

## ❓ Troubleshooting & FAQs

### Q: `npm run dev` fails with `ENOENT: no such file or directory`
**Fix**: Ensure you are running `npm run dev` from the project root (`ai-devops-platform/`). The root `package.json` forwards the command to `cicd-dashboard/`.

### Q: Login fails with `Unexpected end of JSON input`
**Fix**: This occurs if the frontend tries to call the backend while running standalone. The latest build includes mock auth fallback; simply refresh `http://localhost:8080` and click the quick-fill login chips (**Admin**, **Developer**, **Viewer**).

### Q: Docker Desktop displays `500 Internal Server Error (/_ping)`
**Fix**: This indicates a Docker API version mismatch or named-pipe access issue on Windows:
1. Open PowerShell as Administrator and run:
   ```powershell
   net localgroup docker-users $env:USERNAME /add
   [Environment]::SetEnvironmentVariable("DOCKER_API_VERSION", "1.45", "User")
   ```
2. Restart Docker Desktop.

---

## 📄 License
This project is proprietary and built for enterprise DevOps automation and deployment orchestration.
