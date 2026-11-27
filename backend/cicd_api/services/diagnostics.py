import base64
import os
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote, urlparse
import requests

from ..config import Config, DEFAULT_SECRET_KEY, REQUIRED_GITHUB_SECRETS, is_placeholder
from ..db import _is_postgres, db_fetchone, find_demo_users, get_db


def _sanitize(text: str, cfg: Config) -> str:
    """Strips any configured secrets/tokens from diagnostic messages."""
    if not text:
        return text
    for secret in (cfg.github_token, cfg.secret_key, cfg.webhook_secret, cfg.api_key, cfg.admin_password):
        if secret and len(secret) >= 4:
            text = text.replace(secret, "[REDACTED]")
    return text


def _check(check_id: str, name: str, status: str, message: str, fix: str = "") -> dict[str, str]:
    return {
        "id": check_id,
        "name": name,
        "status": status,  # PASS | WARN | FAIL
        "message": message,
        "fix": fix,
    }


def run_diagnostics(app, session: requests.Session | None = None) -> dict[str, Any]:
    """Runs all 11 preflight checks with 5s network timeouts. Never includes secret values."""
    cfg: Config = app.config["APP_CONFIG"]
    provider = app.config.get("PROVIDER")
    checks: list[dict[str, str]] = []

    # 1. Mode & Database Engine + Reachability + Tables
    use_pg = _is_postgres(cfg)
    engine = "PostgreSQL" if use_pg else "SQLite"
    mode = "mock" if cfg.use_mock else "real"
    conn = None
    db_ok = False
    try:
        conn = get_db(None if use_pg else cfg.database_path)
        db_fetchone(conn, "SELECT 1 AS ok")
        db_fetchone(conn, "SELECT COUNT(*) AS n FROM users")
        db_fetchone(conn, "SELECT COUNT(*) AS n FROM deployments")
        db_ok = True
        checks.append(_check(
            "database",
            "Mode & Database",
            "PASS",
            f"Mode: {mode} | Engine: {engine} | Database reachable and schema tables exist.",
        ))
    except Exception as e:
        checks.append(_check(
            "database",
            "Mode & Database",
            "FAIL",
            _sanitize(f"Mode: {mode} | Engine: {engine} | Database check failed: {type(e).__name__}", cfg),
            "Verify DATABASE_URL or DATABASE_PATH and ensure the database service is running with initialized tables.",
        ))

    # 2. Demo users absent (real mode)
    if cfg.use_mock:
        checks.append(_check(
            "demo_users",
            "Demo Users Check",
            "PASS",
            "Mock mode is active; demo accounts are expected.",
        ))
    elif not db_ok or conn is None:
        checks.append(_check(
            "demo_users",
            "Demo Users Check",
            "FAIL",
            "Cannot check for demo users because database is unreachable.",
            "Fix the database connection first.",
        ))
    else:
        demos = find_demo_users(conn)
        if demos:
            checks.append(_check(
                "demo_users",
                "Demo Users Check",
                "FAIL",
                f"Active demo accounts found in real mode: {', '.join(demos)}.",
                "Run 'python manage.py purge-demo-users' in backend/ to remove demo accounts, or reset the database.",
            ))
        else:
            checks.append(_check(
                "demo_users",
                "Demo Users Check",
                "PASS",
                "No known demo accounts found in the database.",
            ))

    # 3. SECRET_KEY, WEBHOOK_SECRET, API_KEY
    sec_issues: list[str] = []
    sec_warns: list[str] = []
    if len(cfg.secret_key) < 32 or cfg.secret_key in (DEFAULT_SECRET_KEY, "default") or is_placeholder(cfg.secret_key):
        sec_issues.append("SECRET_KEY is weak or a placeholder")
    if not cfg.webhook_secret or is_placeholder(cfg.webhook_secret):
        if cfg.use_mock:
            sec_warns.append("WEBHOOK_SECRET is not configured")
        else:
            sec_issues.append("WEBHOOK_SECRET is missing or a placeholder")
    if not cfg.api_key or is_placeholder(cfg.api_key):
        sec_warns.append("API_KEY is missing or a placeholder (automated rollback API key disabled)")

    if sec_issues:
        checks.append(_check(
            "secrets_config",
            "Application Secrets",
            "FAIL",
            "; ".join(sec_issues) + (f" (Warnings: {'; '.join(sec_warns)})" if sec_warns else ""),
            "Generate 32+ char hex secrets (e.g. openssl rand -hex 24) and set SECRET_KEY and WEBHOOK_SECRET in .env.",
        ))
    elif sec_warns:
        checks.append(_check(
            "secrets_config",
            "Application Secrets",
            "WARN",
            "SECRET_KEY and WEBHOOK_SECRET OK; " + "; ".join(sec_warns),
            "Set a strong API_KEY in .env if you use X-API-Key automation for rollbacks.",
        ))
    else:
        checks.append(_check(
            "secrets_config",
            "Application Secrets",
            "PASS",
            "SECRET_KEY, WEBHOOK_SECRET, and API_KEY are configured and non-placeholder.",
        ))

    # 4, 5, 6, 11: GitHub Checks
    gh_session = session or getattr(provider, "session", None) or requests.Session()
    gh_headers = {
        "Authorization": f"Bearer {cfg.github_token or ''}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    repo_ok = False
    rate_limit_info: dict[str, Any] | None = None

    if cfg.use_mock:
        checks.append(_check("github_connection", "GitHub Token & Repository", "PASS", "Skipped in mock mode."))
        checks.append(_check("github_workflows", "GitHub Workflows", "PASS", "Skipped in mock mode."))
        checks.append(_check("github_secrets_vars", "GitHub Secrets & Variables", "PASS", "Skipped in mock mode."))
    else:
        missing_gh = []
        if not cfg.github_token or is_placeholder(cfg.github_token):
            missing_gh.append("GITHUB_TOKEN")
        if not cfg.github_owner or is_placeholder(cfg.github_owner):
            missing_gh.append("GITHUB_OWNER")
        if not cfg.github_repo or is_placeholder(cfg.github_repo):
            missing_gh.append("GITHUB_REPO")

        if missing_gh:
            checks.append(_check(
                "github_connection",
                "GitHub Token & Repository",
                "FAIL",
                f"Missing or placeholder settings: {', '.join(missing_gh)}.",
                "Set valid GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in .env or via the Settings page.",
            ))
            checks.append(_check(
                "github_workflows",
                "GitHub Workflows",
                "FAIL",
                "Cannot inspect workflows until GitHub connection is configured.",
                "Fix GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO first.",
            ))
            checks.append(_check(
                "github_secrets_vars",
                "GitHub Secrets & Variables",
                "FAIL",
                "Cannot inspect repository secrets/variables until GitHub connection is configured.",
                "Fix GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO first.",
            ))
        else:
            owner_q = quote(cfg.github_owner, safe="")
            repo_q = quote(cfg.github_repo, safe="")
            repo_url = f"https://api.github.com/repos/{owner_q}/{repo_q}"
            try:
                resp = gh_session.get(repo_url, headers=gh_headers, timeout=5)
                hdrs = getattr(resp, "headers", None) or {}
                if "X-RateLimit-Remaining" in hdrs:
                    rate_limit_info = {
                        "remaining": hdrs.get("X-RateLimit-Remaining"),
                        "limit": hdrs.get("X-RateLimit-Limit"),
                        "reset": hdrs.get("X-RateLimit-Reset"),
                    }

                if resp.status_code == 401:
                    checks.append(_check(
                        "github_connection",
                        "GitHub Token & Repository",
                        "FAIL",
                        "GitHub token rejected (HTTP 401 Bad credentials).",
                        "Generate a new GitHub Personal Access Token with 'repo' and 'workflow' scopes and update GITHUB_TOKEN.",
                    ))
                elif resp.status_code == 404:
                    checks.append(_check(
                        "github_connection",
                        "GitHub Token & Repository",
                        "FAIL",
                        f"Repository '{cfg.github_owner}/{cfg.github_repo}' was not found (HTTP 404).",
                        "Check GITHUB_OWNER and GITHUB_REPO in .env, and ensure your token has access to private repos if applicable.",
                    ))
                elif resp.status_code >= 400:
                    checks.append(_check(
                        "github_connection",
                        "GitHub Token & Repository",
                        "FAIL",
                        f"GitHub API returned HTTP {resp.status_code}.",
                        "Verify GITHUB_TOKEN permissions and GitHub API availability.",
                    ))
                else:
                    # Check Actions read permission
                    act_url = f"{repo_url}/actions/runs?per_page=1"
                    act_resp = gh_session.get(act_url, headers=gh_headers, timeout=5)
                    if act_resp.status_code == 200:
                        repo_ok = True
                        checks.append(_check(
                            "github_connection",
                            "GitHub Token & Repository",
                            "PASS",
                            f"Connected to '{cfg.github_owner}/{cfg.github_repo}' with Actions read access.",
                        ))
                    else:
                        checks.append(_check(
                            "github_connection",
                            "GitHub Token & Repository",
                            "FAIL",
                            f"Repository found, but token cannot read Actions (HTTP {act_resp.status_code}).",
                            "Ensure GITHUB_TOKEN has 'repo' and 'workflow' (or Actions: Read) permissions.",
                        ))
            except requests.RequestException as e:
                checks.append(_check(
                    "github_connection",
                    "GitHub Token & Repository",
                    "FAIL",
                    f"Network error connecting to GitHub: {type(e).__name__}.",
                    "Check internet connectivity and firewall/proxy settings.",
                ))

            # 5. Workflow files check
            if not repo_ok:
                checks.append(_check(
                    "github_workflows",
                    "GitHub Workflows",
                    "FAIL",
                    "Skipped because GitHub connection failed.",
                    "Resolve the GitHub connection check first.",
                ))
            else:
                wf_issues: list[str] = []
                wf_warns: list[str] = []
                deploy_wf_q = quote(cfg.github_workflow_file, safe="")
                rb_wf_q = quote(cfg.rollback_workflow_file, safe="")

                try:
                    dw_resp = gh_session.get(f"{repo_url}/actions/workflows/{deploy_wf_q}", headers=gh_headers, timeout=5)
                    if dw_resp.status_code != 200:
                        wf_issues.append(f"Deploy workflow '{cfg.github_workflow_file}' not found (HTTP {dw_resp.status_code})")
                    else:
                        runs_resp = gh_session.get(
                            f"{repo_url}/actions/workflows/{deploy_wf_q}/runs?per_page=1",
                            headers=gh_headers,
                            timeout=5,
                        )
                        if runs_resp.status_code == 200 and not (runs_resp.json().get("workflow_runs")):
                            wf_warns.append(f"'{cfg.github_workflow_file}' exists but has no recorded runs yet")

                    rw_resp = gh_session.get(f"{repo_url}/actions/workflows/{rb_wf_q}", headers=gh_headers, timeout=5)
                    if rw_resp.status_code != 200:
                        wf_issues.append(f"Rollback workflow '{cfg.rollback_workflow_file}' not found (HTTP {rw_resp.status_code})")
                    else:
                        content_resp = gh_session.get(
                            f"{repo_url}/contents/.github/workflows/{rb_wf_q}?ref={quote(cfg.github_branch, safe='')}",
                            headers=gh_headers,
                            timeout=5,
                        )
                        if content_resp.status_code == 200:
                            raw_b64 = content_resp.json().get("content", "")
                            try:
                                yaml_text = base64.b64decode(raw_b64).decode("utf-8", errors="ignore")
                                if "workflow_dispatch" not in yaml_text:
                                    wf_issues.append(f"'{cfg.rollback_workflow_file}' is missing a workflow_dispatch trigger")
                            except Exception:
                                pass
                except requests.RequestException as e:
                    wf_issues.append(f"Network error checking workflows: {type(e).__name__}")

                if wf_issues:
                    checks.append(_check(
                        "github_workflows",
                        "GitHub Workflows",
                        "FAIL",
                        "; ".join(wf_issues),
                        f"Add {cfg.github_workflow_file} and {cfg.rollback_workflow_file} (with workflow_dispatch) to .github/workflows/ on '{cfg.github_branch}'.",
                    ))
                elif wf_warns:
                    checks.append(_check(
                        "github_workflows",
                        "GitHub Workflows",
                        "WARN",
                        "; ".join(wf_warns),
                        f"Push a commit to '{cfg.github_branch}' to trigger your first workflow run.",
                    ))
                else:
                    checks.append(_check(
                        "github_workflows",
                        "GitHub Workflows",
                        "PASS",
                        f"Both '{cfg.github_workflow_file}' and '{cfg.rollback_workflow_file}' (workflow_dispatch) are active.",
                    ))

            # 6. Secrets & Variables check
            if not repo_ok:
                checks.append(_check(
                    "github_secrets_vars",
                    "GitHub Secrets & Variables",
                    "FAIL",
                    "Skipped because GitHub connection failed.",
                    "Resolve the GitHub connection check first.",
                ))
            else:
                sv_issues: list[str] = []
                sv_warns: list[str] = []
                try:
                    sec_resp = gh_session.get(f"{repo_url}/actions/secrets", headers=gh_headers, timeout=5)
                    if sec_resp.status_code == 200:
                        present = {s.get("name") for s in sec_resp.json().get("secrets", [])}
                        missing_secs = [s for s in REQUIRED_GITHUB_SECRETS if s not in present]
                        if missing_secs:
                            sv_issues.append(f"Missing GitHub secrets: {', '.join(missing_secs)}")
                    else:
                        sv_warns.append("Token lacks permission to list Actions secrets (verify secrets manually in GitHub)")

                    var_resp = gh_session.get(f"{repo_url}/actions/variables", headers=gh_headers, timeout=5)
                    if var_resp.status_code == 200:
                        present_vars = {v.get("name"): v.get("value") for v in var_resp.json().get("variables", [])}
                        if not present_vars.get("ECR_REPOSITORY"):
                            sv_issues.append("Missing GitHub repository variable: ECR_REPOSITORY")
                        if not present_vars.get("APP_PORT"):
                            sv_warns.append("GitHub variable APP_PORT not set (workflows will default to 5000)")
                    else:
                        sv_warns.append("Token lacks permission to list Actions variables")
                except requests.RequestException as e:
                    sv_warns.append(f"Error checking secrets/variables: {type(e).__name__}")

                if sv_issues:
                    checks.append(_check(
                        "github_secrets_vars",
                        "GitHub Secrets & Variables",
                        "FAIL",
                        "; ".join(sv_issues) + (f" | {'; '.join(sv_warns)}" if sv_warns else ""),
                        "Add the missing secrets/variables under GitHub Repo → Settings → Secrets and variables → Actions.",
                    ))
                elif sv_warns:
                    checks.append(_check(
                        "github_secrets_vars",
                        "GitHub Secrets & Variables",
                        "WARN",
                        "; ".join(sv_warns),
                        "Verify required secrets and variables in GitHub Repo → Settings → Actions.",
                    ))
                else:
                    checks.append(_check(
                        "github_secrets_vars",
                        "GitHub Secrets & Variables",
                        "PASS",
                        "All required GitHub Actions secrets and variables (ECR_REPOSITORY, APP_PORT) are configured.",
                    ))

    # 7. ECR_REPOSITORY format & ECR_REGISTRY known or learned
    learned_reg = getattr(provider, "learned_registry", None)
    if not learned_reg and db_ok and conn is not None:
        try:
            row_img = db_fetchone(
                conn,
                "SELECT image_uri FROM deployments WHERE image_uri IS NOT NULL AND image_uri LIKE '%/%' ORDER BY id DESC LIMIT 1",
            )
            if row_img and row_img.get("image_uri"):
                learned_reg = row_img["image_uri"].split("/", 1)[0]
        except Exception:
            pass

    effective_reg = cfg.ecr_registry or learned_reg
    if is_placeholder(cfg.ecr_repository):
        checks.append(_check(
            "ecr_config",
            "ECR Repository & Registry",
            "FAIL",
            "ECR_REPOSITORY contains a placeholder value.",
            "Set ECR_REPOSITORY in .env to a repository name only (e.g. my-app).",
        ))
    elif not cfg.use_mock and not cfg.ecr_repository:
        checks.append(_check(
            "ecr_config",
            "ECR Repository & Registry",
            "WARN",
            "ECR_REPOSITORY is not set in .env.",
            "Set ECR_REPOSITORY=your-repo-name (and optionally ECR_REGISTRY) in .env.",
        ))
    elif not cfg.use_mock and not effective_reg:
        checks.append(_check(
            "ecr_config",
            "ECR Repository & Registry",
            "WARN",
            f"ECR_REPOSITORY='{cfg.ecr_repository}' is valid, but ECR_REGISTRY is not set or learned yet (image_uri will be null).",
            "Set ECR_REGISTRY in .env (e.g. 123456789012.dkr.ecr.us-east-1.amazonaws.com) or trigger a deployment webhook.",
        ))
    else:
        checks.append(_check(
            "ecr_config",
            "ECR Repository & Registry",
            "PASS",
            f"ECR repository '{cfg.ecr_repository}' configured; registry: {effective_reg or 'mock'}.",
        ))

    # 8. APP_HEALTH_URL reachable + port check
    if cfg.use_mock:
        checks.append(_check("app_health", "Application Health URL", "PASS", "Mock mode simulates healthy target."))
    elif not cfg.app_health_url:
        checks.append(_check(
            "app_health",
            "Application Health URL",
            "WARN",
            "APP_HEALTH_URL is not configured; live app health will show as Unknown.",
            "Set APP_HEALTH_URL (e.g. http://<EC2_HOST>:5000/health) in .env.",
        ))
    else:
        parsed_health = urlparse(cfg.app_health_url)
        port_warn = (
            parsed_health.port is None
            and cfg.app_port not in (80, 443)
            and parsed_health.scheme in ("http", "https")
        )
        try:
            t0 = time.perf_counter()
            h_resp = gh_session.get(cfg.app_health_url, timeout=5)
            lat_ms = int((time.perf_counter() - t0) * 1000)
            if 200 <= h_resp.status_code < 400:
                if port_warn:
                    checks.append(_check(
                        "app_health",
                        "Application Health URL",
                        "WARN",
                        f"Reachable (HTTP {h_resp.status_code}, {lat_ms} ms), but no port is specified in APP_HEALTH_URL while APP_PORT is {cfg.app_port}.",
                        f"Include the port explicitly if needed, e.g. http://<host>:{cfg.app_port}/health.",
                    ))
                else:
                    checks.append(_check(
                        "app_health",
                        "Application Health URL",
                        "PASS",
                        f"APP_HEALTH_URL returned HTTP {h_resp.status_code} in {lat_ms} ms.",
                    ))
            else:
                checks.append(_check(
                    "app_health",
                    "Application Health URL",
                    "FAIL",
                    f"APP_HEALTH_URL returned HTTP {h_resp.status_code} ({lat_ms} ms).",
                    "Ensure the deployed application container is running and its /health endpoint returns 200.",
                ))
        except requests.RequestException as e:
            extra = f" Also note no port is specified while APP_PORT={cfg.app_port}." if port_warn else ""
            checks.append(_check(
                "app_health",
                "Application Health URL",
                "FAIL",
                f"APP_HEALTH_URL is unreachable ({type(e).__name__}).{extra}",
                f"Verify EC2 security group allows port {cfg.app_port} and the app container is running.",
            ))

    # 9. DASHBOARD_API_URL / CORS localhost reminder
    public_url = os.environ.get("DASHBOARD_API_URL", "")
    cors_str = ",".join(cfg.cors_origins)
    looks_local = ("localhost" in cors_str or "127.0.0.1" in cors_str or "localhost" in public_url or "127.0.0.1" in public_url)
    if looks_local and not cfg.use_mock:
        checks.append(_check(
            "webhook_reachability",
            "Dashboard Webhook Reachability",
            "WARN",
            "CORS_ORIGINS or DASHBOARD_API_URL references localhost/127.0.0.1.",
            "GitHub-hosted runners cannot reach localhost. Expose DeployHub via a public server or tunnel (ngrok / Cloudflare Tunnel) and set GitHub secret DASHBOARD_API_URL to that HTTPS URL.",
        ))
    else:
        checks.append(_check(
            "webhook_reachability",
            "Dashboard Webhook Reachability",
            "PASS",
            "Dashboard origin configuration does not rely on localhost-only webhook routing.",
        ))

    # 10. Last webhook received
    if db_ok and conn is not None:
        latest_dep = db_fetchone(conn, "SELECT deployed_at, status FROM deployments ORDER BY id DESC LIMIT 1")
        if not latest_dep:
            checks.append(_check(
                "last_webhook",
                "Last Webhook / Deployment",
                "WARN",
                "No deployment webhook has been recorded in the database yet.",
                "Push to main to trigger a deployment, or use 'Import history from GitHub' on the Deployments page.",
            ))
        else:
            checks.append(_check(
                "last_webhook",
                "Last Webhook / Deployment",
                "PASS",
                f"Latest deployment recorded at {latest_dep['deployed_at']} (status: {latest_dep['status']}).",
            ))
    else:
        checks.append(_check(
            "last_webhook",
            "Last Webhook / Deployment",
            "FAIL",
            "Cannot check deployment history because database is unreachable.",
            "Fix the database connection first.",
        ))

    # 11. GitHub API Rate Limit Remaining
    if cfg.use_mock:
        checks.append(_check("github_rate_limit", "GitHub API Rate Limit", "PASS", "Not applicable in mock mode."))
    else:
        rl = rate_limit_info or getattr(provider, "last_rate_limit", None)
        if not rl and cfg.github_token and not is_placeholder(cfg.github_token):
            try:
                rl_resp = gh_session.get("https://api.github.com/rate_limit", headers=gh_headers, timeout=5)
                if rl_resp.status_code == 200:
                    core = rl_resp.json().get("resources", {}).get("core", {})
                    rl = {"remaining": core.get("remaining"), "limit": core.get("limit"), "reset": core.get("reset")}
            except requests.RequestException:
                rl = None

        if not rl or rl.get("remaining") is None:
            checks.append(_check(
                "github_rate_limit",
                "GitHub API Rate Limit",
                "WARN",
                "Could not determine GitHub API rate-limit remaining.",
                "Ensure GITHUB_TOKEN is valid and GitHub API is reachable.",
            ))
        else:
            rem = int(rl["remaining"])
            lim = int(rl.get("limit") or 5000)
            if rem == 0:
                checks.append(_check(
                    "github_rate_limit",
                    "GitHub API Rate Limit",
                    "FAIL",
                    f"GitHub API rate limit exhausted (0/{lim} remaining).",
                    "Wait until the rate limit window resets or use a dedicated token.",
                ))
            elif rem < 100:
                checks.append(_check(
                    "github_rate_limit",
                    "GitHub API Rate Limit",
                    "WARN",
                    f"GitHub API rate limit is low: {rem}/{lim} requests remaining.",
                    "Avoid rapid polling; ETag caching is enabled to conserve quota.",
                ))
            else:
                checks.append(_check(
                    "github_rate_limit",
                    "GitHub API Rate Limit",
                    "PASS",
                    f"GitHub API rate limit healthy: {rem}/{lim} requests remaining.",
                ))

    summary = {
        "pass": sum(1 for c in checks if c["status"] == "PASS"),
        "warn": sum(1 for c in checks if c["status"] == "WARN"),
        "fail": sum(1 for c in checks if c["status"] == "FAIL"),
    }

    return {
        "mode": mode,
        "engine": engine,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "checks": checks,
    }
