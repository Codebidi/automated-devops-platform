from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from .helpers import parse_pagination, paginate_list
from ..db import get_db, db_fetchone
from ..services.errors import NotFoundError

runs_bp = Blueprint("runs", __name__, url_prefix="/api")


def _sync_learned_registry(provider) -> None:
    """If ECR_REGISTRY is unset, learn it from the most recent webhook deployment image_uri."""
    if not hasattr(provider, "ecr_registry"):
        return
    if provider.ecr_registry or getattr(provider, "learned_registry", None):
        return
    try:
        conn = get_db()
        row = db_fetchone(
            conn,
            "SELECT image_uri FROM deployments WHERE image_uri IS NOT NULL AND image_uri LIKE '%/%' ORDER BY id DESC LIMIT 1",
        )
        if row and row.get("image_uri"):
            provider.learned_registry = row["image_uri"].split("/", 1)[0]
    except Exception:
        pass


@runs_bp.route("/runs", methods=["GET"])
def list_runs():
    """Returns paginated, filtered pipeline runs sorted newest first."""
    provider = current_app.config["PROVIDER"]
    _sync_learned_registry(provider)

    status = request.args.get("status")
    branch = request.args.get("branch")
    event = request.args.get("event")
    search = request.args.get("search")

    page, per_page = parse_pagination(request)

    all_runs = provider.list_runs(status=status, branch=branch, event=event, search=search)
    items, total = paginate_list(all_runs, page, per_page)

    return jsonify({
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }), 200

@runs_bp.route("/runs/<run_id>", methods=["GET"])
def get_run(run_id: str):
    """Returns detailed run metadata including its 4 pipeline stages."""
    provider = current_app.config["PROVIDER"]
    _sync_learned_registry(provider)
    run_data = provider.get_run(run_id)
    return jsonify(run_data), 200

@runs_bp.route("/runs/<run_id>/stages", methods=["GET"])
def get_stages(run_id: str):
    """Returns pipeline stages only for a specific run."""
    provider = current_app.config["PROVIDER"]
    stages = provider.get_stages(run_id)
    return jsonify({"stages": stages}), 200

@runs_bp.route("/runs/<run_id>/stages/<stage>/logs", methods=["GET"])
def get_stage_logs(run_id: str, stage: str):
    """Returns raw execution logs for a specific pipeline stage (developer+)."""
    if stage not in ["test", "build", "push", "deploy"]:
        raise NotFoundError(f"Invalid pipeline stage '{stage}'. Must be test, build, push, or deploy.")

    provider = current_app.config["PROVIDER"]
    logs = provider.get_logs(run_id, stage)
    return jsonify(logs), 200

@runs_bp.route("/branches", methods=["GET"])
def list_branches():
    """Returns distinct branch names present across runs."""
    provider = current_app.config["PROVIDER"]
    runs = provider.list_runs()
    branches = list(dict.fromkeys(r["branch"] for r in runs if r.get("branch")))
    return jsonify({"branches": branches}), 200
