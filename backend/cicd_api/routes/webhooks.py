from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from ..db import get_db, db_execute, db_fetchone, insert_returning_id, validate_run_id, validate_rolled_back_from
from ..security import verify_webhook_signature

webhooks_bp = Blueprint("webhooks", __name__, url_prefix="/api/webhooks")

@webhooks_bp.route("/deployment", methods=["POST"])
def deployment_webhook():
    """Receives deployment completion reports from GitHub Actions with HMAC verification."""
    cfg = current_app.config["APP_CONFIG"]
    raw_body = request.get_data()
    sig_header = request.headers.get("X-Signature-256")

    if not cfg.webhook_secret:
        if not cfg.use_mock:
            return jsonify({"error": "Webhook secret not configured in real mode"}), 503
        if sig_header:
            return jsonify({"error": "Invalid webhook signature"}), 401
    else:
        if not verify_webhook_signature(raw_body, sig_header, cfg.webhook_secret):
            return jsonify({"error": "Invalid webhook signature"}), 401

    payload = request.get_json(silent=True) or {}

    image_tag = payload.get("image_tag")
    if not image_tag or not isinstance(image_tag, str) or not image_tag.strip():
        return jsonify({"error": "Field 'image_tag' is required"}), 400

    status = payload.get("status")
    if status not in ("success", "failed", "in_progress"):
        return jsonify({"error": "Field 'status' must be one of: success, failed, in_progress"}), 400

    health = payload.get("health", "unknown")
    if health not in ("healthy", "unhealthy", "unknown"):
        return jsonify({"error": "Field 'health' must be one of: healthy, unhealthy, unknown"}), 400

    conn = get_db()

    # Input hardening: validate run_id (must be int, 0 < v < 2**63, not bool)
    run_id = validate_run_id(payload.get("run_id"))

    # Input hardening: validate rolled_back_from (must reference existing deployment)
    rolled_back_from = validate_rolled_back_from(conn, payload.get("rolled_back_from"))

    commit_sha = str(payload.get("commit_sha", "unknown"))
    commit_message = str(payload.get("commit_message", "Automated deployment"))
    author = str(payload.get("author", "GitHub Actions"))
    image_uri = payload.get("image_uri")

    if rolled_back_from:
        orig = db_fetchone(conn, "SELECT * FROM deployments WHERE id = ?", (rolled_back_from,))
        if orig:
            commit_sha = orig.get("commit_sha", commit_sha)
            commit_message = orig.get("commit_message", commit_message)
            author = orig.get("author", author)
            image_uri = orig.get("image_uri", image_uri)
            if not run_id:
                run_id = orig.get("run_id")

    # A successful deployment becomes the single current one
    is_current = 1 if status == "success" else 0
    if is_current == 1:
        db_execute(conn, "UPDATE deployments SET is_current = 0 WHERE is_current = 1")

    now_iso = str(payload.get("deployed_at") or datetime.now(timezone.utc).isoformat())

    new_id = insert_returning_id(
        conn,
        "INSERT INTO deployments (run_id, commit_sha, commit_message, author, image_tag, image_uri, "
        "status, health, deployed_at, is_current, rolled_back_from) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            run_id,
            commit_sha,
            commit_message,
            author,
            image_tag,
            image_uri,
            status,
            health,
            now_iso,
            is_current,
            rolled_back_from,
        ),
    )
    conn.commit()

    saved = db_fetchone(conn, "SELECT * FROM deployments WHERE id = ?", (new_id,))
    saved["is_current"] = bool(saved["is_current"])
    return jsonify(saved), 201
