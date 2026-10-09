from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from ..db import get_db
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
        # In mock mode, if secret is absent but signature was passed, or reject if unconfigured
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
    rolled_back_from = payload.get("rolled_back_from")
    commit_sha = str(payload.get("commit_sha", "unknown"))
    commit_message = str(payload.get("commit_message", "Automated deployment"))
    author = str(payload.get("author", "GitHub Actions"))
    image_uri = payload.get("image_uri")
    run_id = str(payload.get("run_id")) if payload.get("run_id") is not None else None

    if rolled_back_from:
        orig = conn.execute("SELECT * FROM deployments WHERE id = ?", (rolled_back_from,)).fetchone()
        if orig:
            orig = dict(orig)
            commit_sha = orig.get("commit_sha", commit_sha)
            commit_message = orig.get("commit_message", commit_message)
            author = orig.get("author", author)
            image_uri = orig.get("image_uri", image_uri)
            if not run_id:
                run_id = orig.get("run_id")

    # A successful deployment becomes the single current one; failed/in_progress must not replace current
    is_current = 1 if status == "success" else 0
    if is_current == 1:
        conn.execute("UPDATE deployments SET is_current = 0 WHERE is_current = 1")

    now_iso = str(payload.get("deployed_at") or datetime.now(timezone.utc).isoformat())

    cur = conn.execute(
        "INSERT INTO deployments (run_id, commit_sha, commit_message, author, image_tag, image_uri, status, health, deployed_at, is_current, rolled_back_from) "
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
            str(rolled_back_from) if rolled_back_from else None,
        ),
    )
    conn.commit()

    saved_row = conn.execute("SELECT * FROM deployments WHERE id = ?", (cur.lastrowid,)).fetchone()
    res = dict(saved_row)
    res["is_current"] = bool(res["is_current"])
    return jsonify(res), 200
