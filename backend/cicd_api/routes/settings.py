import os
from dataclasses import replace
from pathlib import Path
from flask import Blueprint, jsonify, request, current_app

from ..config import Config
from ..services.factory import create_provider

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

@settings_bp.route("", methods=["GET"])
def get_settings():
    """Returns infrastructure settings, configuration flags, and audited secret names (admin only)."""
    cfg = current_app.config["APP_CONFIG"]
    provider = current_app.config["PROVIDER"]
    needs_token = current_app.config.get("NEEDS_GITHUB_TOKEN", False)

    secrets_data = provider.list_secret_names()
    secrets = secrets_data.get("secrets", [])

    repo_str = f"{cfg.github_owner}/{cfg.github_repo}" if (cfg.github_owner and cfg.github_repo) else "codebidi/ai-devops-platform"

    return jsonify({
        "repository": repo_str,
        "branch": cfg.github_branch,
        "region": cfg.aws_region,
        "ecr_repository": cfg.ecr_repository,
        "ec2_host": cfg.ec2_host,
        "secrets": secrets,
        "secrets_available": secrets_data.get("available", True),
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
    _persist_env_token(token)

    return jsonify({
        "success": True,
        "message": "GitHub token configured successfully. Now using live GitHub data.",
        "github_token_configured": True,
        "needs_github_token": False,
    }), 200


def _persist_env_token(token: str) -> None:
    # routes/settings.py -> routes/ -> cicd_api/ -> backend/.env
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    try:
        if env_path.is_file():
            lines = env_path.read_text(encoding="utf-8").splitlines()
            found = False
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.startswith("GITHUB_TOKEN=") or stripped == "GITHUB_TOKEN":
                    lines[i] = f"GITHUB_TOKEN={token}"
                    found = True
                    break
            if not found:
                lines.insert(1, f"GITHUB_TOKEN={token}")
            env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        else:
            env_path.write_text(f"GITHUB_TOKEN={token}\n", encoding="utf-8")
    except Exception:
        # Non-critical: token is already in memory, .env persistence is best-effort
        pass
