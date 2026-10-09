from flask import Blueprint, jsonify, current_app

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

@settings_bp.route("", methods=["GET"])
def get_settings():
    """Returns infrastructure settings, configuration flags, and audited secret names (admin only)."""
    cfg = current_app.config["APP_CONFIG"]
    provider = current_app.config["PROVIDER"]

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
    }), 200
