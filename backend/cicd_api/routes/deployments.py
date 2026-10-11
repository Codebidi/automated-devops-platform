from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from ..db import get_db, db_execute, db_fetchone, db_fetchall, insert_returning_id

deployments_bp = Blueprint("deployments", __name__, url_prefix="/api/deployments")

@deployments_bp.route("", methods=["GET"])
def list_deployments():
    """Lists historical deployment releases newest first with can_rollback indicator."""
    conn = get_db()
    rows = db_fetchall(
        conn,
        "SELECT id, run_id, commit_sha, commit_message, author, image_tag, image_uri, "
        "status, health, deployed_at, is_current, rolled_back_from "
        "FROM deployments ORDER BY id DESC",
    )
    items = []
    for d in rows:
        d["is_current"] = bool(d["is_current"])
        d["can_rollback"] = (d["status"] == "success" and not d["is_current"])
        items.append(d)

    return jsonify(items), 200

@deployments_bp.route("/current", methods=["GET"])
def get_current_deployment():
    """Returns the currently active production release."""
    conn = get_db()
    row = db_fetchone(
        conn,
        "SELECT id, run_id, commit_sha, commit_message, author, image_tag, image_uri, "
        "status, health, deployed_at, is_current, rolled_back_from "
        "FROM deployments WHERE is_current = 1 ORDER BY id DESC LIMIT 1",
    )
    if not row:
        return jsonify(None), 200

    row["is_current"] = True
    row["can_rollback"] = False
    return jsonify(row), 200

@deployments_bp.route("/<int:deployment_id>/rollback", methods=["POST"])
def rollback(deployment_id: int):
    """Executes or dispatches production rollback (admin or X-API-Key)."""
    cfg = current_app.config["APP_CONFIG"]
    conn = get_db()

    target = db_fetchone(conn, "SELECT * FROM deployments WHERE id = ?", (deployment_id,))
    if not target:
        return jsonify({"error": f"Deployment {deployment_id} not found"}), 404

    if target["status"] != "success":
        return jsonify({"error": "Cannot rollback to an unsuccessful release"}), 409

    if target["is_current"] == 1:
        return jsonify({"error": "Target deployment is already active in production"}), 409

    if cfg.use_mock:
        db_execute(conn, "UPDATE deployments SET is_current = 0 WHERE is_current = 1")
        now_iso = datetime.now(timezone.utc).isoformat()
        new_id = insert_returning_id(
            conn,
            "INSERT INTO deployments (run_id, commit_sha, commit_message, author, image_tag, image_uri, "
            "status, health, deployed_at, is_current, rolled_back_from) "
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

        new_row = db_fetchone(conn, "SELECT * FROM deployments WHERE id = ?", (new_id,))
        new_row["is_current"] = True
        new_row["can_rollback"] = False
        return jsonify({
            "status": "success",
            "message": f"Successfully rolled back to deployment #{target['id']} ({target['image_tag']})",
            "deployment": new_row,
        }), 200

    # Real mode: dispatch GitHub Actions rollback workflow
    provider = current_app.config["PROVIDER"]
    provider.dispatch_rollback(target["image_tag"], target["id"])
    return jsonify({
        "status": "accepted",
        "message": f"Rollback workflow dispatched for image {target['image_tag']}",
        "deployment_id": target["id"],
        "image_tag": target["image_tag"],
    }), 202
