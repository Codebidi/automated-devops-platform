from flask import Blueprint, jsonify, current_app
from ..services.diagnostics import run_diagnostics

diagnostics_bp = Blueprint("diagnostics", __name__, url_prefix="/api/diagnostics")


@diagnostics_bp.route("", methods=["GET"])
def get_diagnostics():
    """Runs preflight diagnostics checks (admin only). Never exposes secret values."""
    result = run_diagnostics(current_app)
    return jsonify(result), 200
