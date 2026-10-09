from datetime import datetime, timezone
from flask import Blueprint, jsonify, current_app
from ..services.health_service import check_app_health

health_bp = Blueprint("health", __name__, url_prefix="/api")

@health_bp.route("/health", methods=["GET"])
def health_check():
    """Public health check endpoint returning system status and operating mode."""
    cfg = current_app.config["APP_CONFIG"]
    return jsonify({
        "status": "ok",
        "mode": "mock" if cfg.use_mock else "real",
        "time": datetime.now(timezone.utc).isoformat(),
    }), 200

@health_bp.route("/app-health", methods=["GET"])
def app_health():
    """Probes deployed application health endpoint with 5s timeout."""
    cfg = current_app.config["APP_CONFIG"]
    res = check_app_health(cfg)
    return jsonify(res), 200
