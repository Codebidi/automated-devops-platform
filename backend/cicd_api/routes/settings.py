import os
import re
from dataclasses import replace
from pathlib import Path
from flask import Blueprint, jsonify, request, current_app, g

from ..config import Config, REQUIRED_GITHUB_SECRETS
from ..db import get_db, list_repositories, upsert_active_repository, record_audit_log
from ..services.factory import create_provider

_REPO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

@settings_bp.route("", methods=["GET"])
def get_settings():
    """Returns infrastructure settings, configuration flags, and audited secret names (admin only)."""
    cfg = current_app.config["APP_CONFIG"]
    provider = current_app.config["PROVIDER"]
    needs_token = current_app.config.get("NEEDS_GITHUB_TOKEN", False)

    secrets_data = provider.list_secret_names()
    available = secrets_data.get("available", True)
    raw_secrets = secrets_data.get("secrets", [])

    if available and not cfg.use_mock:
        present_names = {s.get("name") for s in raw_secrets if s.get("name")}
        secrets = [
            {"name": req, "configured": req in present_names}
            for req in REQUIRED_GITHUB_SECRETS
        ]
    elif not available:
        secrets = [
            {"name": req, "configured": False}
            for req in REQUIRED_GITHUB_SECRETS
        ]
    else:
        secrets = raw_secrets

    repo_str = f"{cfg.github_owner}/{cfg.github_repo}" if (cfg.github_owner and cfg.github_repo) else (
        "codebidi/ai-devops-platform" if cfg.use_mock else ""
    )

    conn = get_db()
    saved_repos = list_repositories(conn)

    return jsonify({
        "repository": repo_str,
        "repositories": saved_repos,
        "branch": cfg.github_branch,
        "region": cfg.aws_region,
        "ecr_registry": cfg.ecr_registry,
        "ecr_repository": cfg.ecr_repository,
        "ec2_host": cfg.ec2_host,
        "app_health_url": cfg.app_health_url,
        "app_port": cfg.app_port,
        "secrets": secrets,
        "secrets_available": available,
        "api_key_configured": bool(cfg.api_key),
        "webhook_secret_configured": bool(cfg.webhook_secret),
        "github_token_configured": bool(cfg.github_token),
        "use_mock": cfg.use_mock,
        "needs_github_token": needs_token,
    }), 200


@settings_bp.route("/github-token", methods=["POST"])
def set_github_token():
    """Accept a GitHub Personal Access Token at runtime, swap the provider to real GitHub, and persist to .env."""
    cfg: Config = current_app.config["APP_CONFIG"]

    body = request.get_json(silent=True) or {}
    token = (body.get("token") or "").strip()

    if not token:
        return jsonify({"error": "Token is required"}), 400

    if not token.startswith(("ghp_", "github_pat_", "gho_", "ghu_", "ghs_", "ghr_")):
        return jsonify({"error": "Invalid GitHub token format. Token should start with ghp_, github_pat_, etc."}), 400

    # Create new frozen config with the token applied
    new_cfg = replace(cfg, github_token=token)
    current_app.config["APP_CONFIG"] = new_cfg

    # Swap provider to the real GitHubProvider
    try:
        new_provider = create_provider(new_cfg)
        # Quick validation: try to list runs (will throw if token is bad)
        new_provider.list_runs()
        current_app.config["PROVIDER"] = new_provider
        current_app.config["NEEDS_GITHUB_TOKEN"] = False
    except Exception as e:
        # Rollback to old config
        current_app.config["APP_CONFIG"] = cfg
        err_msg = str(e)
        if "Bad credentials" in err_msg or "authentication" in err_msg.lower():
            return jsonify({"error": "GitHub token is invalid or has insufficient permissions. Please check and try again."}), 401
        return jsonify({"error": f"Failed to connect to GitHub: {err_msg}"}), 502

    # Persist token to .env file
    _persist_env_vars({"GITHUB_TOKEN": token})

    return jsonify({
        "success": True,
        "message": "GitHub token configured successfully. Now using live GitHub data.",
        "github_token_configured": True,
        "needs_github_token": False,
    }), 200


@settings_bp.route("/repository", methods=["POST"])
def update_repository():
    """Update target GitHub owner/repo at runtime, swap provider, and persist to backend/.env (admin only)."""
    cfg: Config = current_app.config["APP_CONFIG"]

    body = request.get_json(silent=True) or {}
    raw_repo = (body.get("repository") or "").strip().strip("/")
    if raw_repo.startswith("https://github.com/"):
        raw_repo = raw_repo[len("https://github.com/"):].strip("/")
    if raw_repo.endswith(".git"):
        raw_repo = raw_repo[:-4]

    if not _REPO_PATTERN.match(raw_repo):
        return jsonify({"error": "Repository must be in 'owner/repo' format (e.g. Codebidi/my-app)."}), 400

    owner, repo = raw_repo.split("/", 1)
    new_cfg = replace(cfg, github_owner=owner, github_repo=repo)
    current_app.config["APP_CONFIG"] = new_cfg

    if new_cfg.use_mock or new_cfg.github_token:
        current_app.config["PROVIDER"] = create_provider(new_cfg)

    conn = get_db()
    saved_repo = upsert_active_repository(
        conn,
        owner=owner,
        repo=repo,
        branch=new_cfg.github_branch,
        workflow_file=new_cfg.github_workflow_file,
        rollback_workflow_file=new_cfg.rollback_workflow_file,
    )
    actor = (getattr(g, "current_user", None) or {}).get("username", "admin")
    record_audit_log(conn, actor=actor, action="update_repository", target=f"{owner}/{repo}")

    _persist_env_vars({"GITHUB_OWNER": owner, "GITHUB_REPO": repo})

    return jsonify({
        "success": True,
        "repository": f"{owner}/{repo}",
        "saved_repository": saved_repo,
        "message": f"Repository updated to {owner}/{repo}.",
    }), 200


def _persist_env_vars(updates: dict[str, str]) -> None:
    # routes/settings.py -> routes/ -> cicd_api/ -> backend/.env
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    try:
        lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.is_file() else []
        remaining = dict(updates)
        for i, line in enumerate(lines):
            stripped = line.strip()
            for key, val in list(remaining.items()):
                if stripped.startswith(f"{key}=") or stripped == key:
                    lines[i] = f"{key}={val}"
                    os.environ[key] = val
                    del remaining[key]
                    break
        for key, val in remaining.items():
            lines.append(f"{key}={val}")
            os.environ[key] = val
        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except Exception:
        # Non-critical: config is already updated in memory, .env persistence is best-effort
        pass
