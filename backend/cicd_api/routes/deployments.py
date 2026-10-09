from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from ..db import get_db

deployments_bp = Blueprint("deployments", __name__, url_prefix="/api/deployments")

@deployments_bp.route("", methods=["GET"])
def list_deployments():
    """Lists historical deployment releases newest first with can_rollback indicator."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, run_id, commit_sha, commit_message, author, image_tag, image_uri, status, health, deployed_at, is_current, rolled_back_from "
        "FROM deployments ORDER BY id DESC"
    ).fetchall()

    items = []
    for r in rows:
        d = dict(r)
        d["is_current"] = bool(d["is_current"])
        d["can_rollback"] = (d["status"] == "success" and not d["is_current"])
        items.append(d)

    return jsonify(items), 200

@deployments_bp.route("/current", methods=["GET"])
def get_current_deployment():
    """Returns the currently active production release."""
    conn = get_db()
    row = conn.execute(
        "SELECT id, run_id, commit_sha, commit_message, author, image_tag, image_uri, status, health, deployed_at, is_current, rolled_back_from "
        "FROM deployments WHERE is_current = 1 ORDER BY id DESC LIMIT 1"
    ).fetchone()

    if not row:
        return jsonify(None), 200

    d = dict(row)
    d["is_current"] = True
    d["can_rollback"] = False
    return jsonify(d), 200

@deployments_bp.route("/<int:deployment_id>/rollback", methods=["POST"])
def rollback(deployment_id: int):
    """Executes or dispatches production rollback (admin or X-API-Key)."""
    cfg = current_app.config["APP_CONFIG"]
    conn = get_db()

    target = conn.execute("SELECT * FROM deployments WHERE id = ?", (deployment_id,)).fetchone()
    if not target:
        return jsonify({"error": f"Deployment {deployment_id} not found"}), 404

    target = dict(target)

    if target["status"] != "success":
        return jsonify({"error": "Cannot rollback to an unsuccessful release"}), 409

    if target["is_current"] == 1:
        return jsonify({"error": "Target deployment is already active in production"}), 409

    if cfg.use_mock:
        conn.execute("UPDATE deployments SET is_current = 0 WHERE is_current = 1")
        now_iso = datetime.now(timezone.utc).isoformat()
        cur = conn.execute(
            "INSERT INTO deployments (run_id, commit_sha, commit_message, author, image_tag, image_uri, status, health, deployed_at, is_current, rolled_back_from) "
            "VALUES (?, ?, ?, ?, ?, ?, 'success', 'healthy', ?, 1, ?)",
            (
                target["run_id"],
                target["commit_sha"],
                target["commit_message"],
                target["author"],
                target["image_tag"],
                target["image_uri"],
                now_iso,
                str(target["id"]),
            ),
        )
        conn.commit()

        new_row = conn.execute("SELECT * FROM deployments WHERE id = ?", (cur.lastrowid,)).fetchone()
        res = dict(new_row)
        res["is_current"] = True
        res["can_rollback"] = False
        return jsonify({
            "status": "success",
            "message": f"Successfully rolled back to deployment #{target['id']} ({target['image_tag']})",
            "deployment": res,
        }), 200

    # Real mode: dispatch GitHub Actions rollback workflow
    provider = current_app.config["PROVIDER"]
    res = provider.dispatch_rollback(target["image_tag"], target["id"])
    return jsonify({
        "status": "accepted",
        "message": f"Rollback workflow dispatched for image {target['image_tag']}",
        "deployment_id": target["id"],
        "image_tag": target["image_tag"],
    }), 202
