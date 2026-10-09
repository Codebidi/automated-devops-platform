from flask import Blueprint, jsonify, current_app
from ..db import get_db

stats_bp = Blueprint("stats", __name__, url_prefix="/api")

@stats_bp.route("/stats", methods=["GET"])
def get_stats():
    """Returns platform KPI metrics and chronological duration/status series for charts."""
    provider = current_app.config["PROVIDER"]
    runs = provider.list_runs()

    total_runs = len(runs)
    running = sum(1 for r in runs if r.get("status") == "running")
    successful = sum(1 for r in runs if r.get("status") == "success")
    success_rate = round((successful / total_runs) * 100, 1) if total_runs else 0.0

    completed = [r for r in runs if r.get("status") != "running" and r.get("duration_seconds") is not None]
    avg_duration = round(sum(r["duration_seconds"] for r in completed) / len(completed), 1) if completed else 0

    conn = get_db()
    current_dep_row = conn.execute(
        "SELECT * FROM deployments WHERE is_current = 1 ORDER BY id DESC LIMIT 1"
    ).fetchone()
    current_deployment = dict(current_dep_row) if current_dep_row else None

    last_dep_row = conn.execute(
        "SELECT deployed_at FROM deployments ORDER BY id DESC LIMIT 1"
    ).fetchone()
    last_deployment_at = last_dep_row["deployed_at"] if last_dep_row else None

    # Last 20 runs, reversed to oldest-to-newest for charts
    slice_20 = runs[:20]
    recent = []
    for r in reversed(slice_20):
        recent.append({
            "id": r["id"],
            "run_number": r["run_number"],
            "name": f"#{r['run_number']}",
            "duration": r.get("duration_seconds", 0),
            "duration_seconds": r.get("duration_seconds", 0),
            "status": r.get("status"),
        })

    return jsonify({
        "total_runs": total_runs,
        "running": running,
        "success_rate": success_rate,
        "avg_duration_seconds": avg_duration,
        "last_deployment_at": last_deployment_at,
        "current_deployment": current_deployment,
        "recent": recent,
    }), 200
