# GitHub Actions Workflows for DeployHub

Copy `deploy.yml` and `rollback.yml` into `.github/workflows/` of your target application repository on the **default branch** (`main`).

> **Important:** GitHub Actions only allows triggering `workflow_dispatch` (`rollback.yml`) if the workflow file exists on the repository's default branch.

---

## Required GitHub Repository Secrets

Configure under **GitHub Repo → Settings → Secrets and variables → Actions → Secrets**:

| Secret Name | Description |
| :--- | :--- |
| `AWS_ACCESS_KEY_ID` | IAM access key with ECR push/pull permissions |
| `AWS_SECRET_ACCESS_KEY` | IAM secret access key |
| `AWS_REGION` | AWS region where ECR & EC2 live (e.g. `us-east-1`) |
| `EC2_HOST` | Public DNS or IP address of the target EC2 instance |
| `EC2_USER` | SSH username on EC2 (e.g. `ubuntu` or `ec2-user`) |
| `EC2_SSH_KEY` | Private SSH key (`.pem` contents) for connecting to EC2 |
| `WEBHOOK_SECRET` | Shared HMAC-SHA256 secret matching `WEBHOOK_SECRET` in DeployHub's `.env` |
| `DASHBOARD_API_URL` | Public HTTPS URL of your DeployHub backend (e.g. `https://deployhub.example.com` or tunnel URL; GitHub-hosted runners cannot reach `localhost`) |

---

## Required GitHub Repository Variables

Configure under **GitHub Repo → Settings → Secrets and variables → Actions → Variables**:

| Variable Name | Default | Description |
| :--- | :--- | :--- |
| `ECR_REPOSITORY` | *(required)* | Repository **name only** (e.g. `my-app`, NOT the full registry URI) |
| `APP_PORT` | `5000` | Port exposed by your application container and probed at `/health` |

---

## EC2 Host Prerequisites

1. **Docker** installed and running; `EC2_USER` added to the `docker` group (`sudo usermod -aG docker $USER`).
2. **AWS CLI** installed and configured (or an **EC2 IAM Instance Profile / Role** attached with `AmazonEC2ContainerRegistryReadOnly` so `docker pull` from ECR succeeds on the server).
3. **Security Group**: Inbound TCP rule allowing `APP_PORT` (default `5000`) from the internet/load balancer and from GitHub Actions runners for health probing, plus SSH (`22`).
4. **Health Endpoint**: Your container should expose `GET /health` returning HTTP `200` on `APP_PORT`.
