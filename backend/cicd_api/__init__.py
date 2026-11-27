from dataclasses import replace
import logging
from flask import Flask, request, jsonify, g
from werkzeug.exceptions import HTTPException
from .config import Config, load_config, validate_real_mode
from .db import init_db, seed_database, get_db, close_db, db_execute, db_fetchone, get_active_repository
from .security import decode_auth_token, verify_api_key_constant_time
from .auth import PUBLIC_ENDPOINTS, get_minimum_role_for_endpoint, has_required_role
from .services.factory import create_provider
from .services.mock_provider import MockProvider
from .services.errors import ApiError

from .routes.health import health_bp
from .routes.auth import auth_bp
from .routes.users import users_bp
from .routes.runs import runs_bp
from .routes.stats import stats_bp
from .routes.deployments import deployments_bp
from .routes.settings import settings_bp
from .routes.webhooks import webhooks_bp
from .routes.diagnostics import diagnostics_bp

logger = logging.getLogger(__name__)

def create_app(overrides: dict | None = None) -> Flask:
    """Application factory: loads config, sets up database, registers routes and security hooks."""
    cfg = load_config(overrides)

    app = Flask(__name__)
    app.config["APP_CONFIG"] = cfg

    # If in real mode but missing token, start with MockProvider and flag it
    if not cfg.use_mock and not cfg.github_token:
        app.config["PROVIDER"] = MockProvider()
        app.config["NEEDS_GITHUB_TOKEN"] = True
    else:
        app.config["PROVIDER"] = create_provider(cfg)
        app.config["NEEDS_GITHUB_TOKEN"] = False

    # Initialize database tables and demo/initial data
    init_db(app)
    seed_database(app)

    # Restore active repository from database when not explicitly overridden
    if not overrides or ("github_owner" not in overrides and "github_repo" not in overrides):
        with app.app_context():
            active_repo = get_active_repository(get_db())
            if active_repo and (active_repo["owner"] != cfg.github_owner or active_repo["repo"] != cfg.github_repo):
                cfg = replace(cfg, github_owner=active_repo["owner"], github_repo=active_repo["repo"])
                app.config["APP_CONFIG"] = cfg
                if cfg.use_mock or cfg.github_token:
                    app.config["PROVIDER"] = create_provider(cfg)

    if not cfg.use_mock:
        for err_msg in validate_real_mode(cfg):
            logger.warning("Real mode config issue: %s", err_msg)

    # Register blueprints under /api
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(runs_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(deployments_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(webhooks_bp)
    app.register_blueprint(diagnostics_bp)

    # Database connection teardown
    app.teardown_appcontext(close_db)

    @app.before_request
    def enforce_authentication_and_authorization():
        # Skip security checks on CORS preflight requests
        if request.method == "OPTIONS":
            return app.make_default_options_response()

        # Public endpoints (e.g. /health, /auth/login, /webhooks/deployment)
        if request.endpoint in PUBLIC_ENDPOINTS:
            return None

        # Allow unmatched endpoints to proceed to Flask's standard 404 handler
        if request.endpoint is None:
            return None

        cfg_current: Config = app.config["APP_CONFIG"]

        # X-API-Key may authenticate ONLY the rollback endpoint as an automation identity
        api_key = request.headers.get("X-API-Key")
        if request.endpoint == "deployments.rollback" and api_key is not None:
            if cfg_current.api_key and verify_api_key_constant_time(api_key, cfg_current.api_key):
                g.current_user = {
                    "id": 0,
                    "username": "api-key-automation",
                    "full_name": "API Key Automation",
                    "role": "admin",
                    "is_active": 1,
                }
                return None
            else:
                return jsonify({"error": "Invalid API key"}), 401

        # Standard Bearer token authentication
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401

        token = auth_header[7:].strip()
        max_age = cfg_current.token_ttl_hours * 3600
        token_data = decode_auth_token(token, cfg_current.secret_key, max_age)
        if not token_data:
            return jsonify({"error": "Invalid or expired authorization token"}), 401

        # Reload user from DB on each request to verify status and fresh role
        conn = get_db()
        user_row = db_fetchone(
            conn,
            "SELECT id, username, full_name, role, is_active, token_version FROM users WHERE id = ?",
            (token_data["uid"],),
        )

        if not user_row or user_row["is_active"] != 1 or user_row["token_version"] != token_data["tv"]:
            return jsonify({"error": "Session is invalid or has expired"}), 401

        g.current_user = user_row

        # Enforce role-based access control (default minimum role is viewer)
        required_role = get_minimum_role_for_endpoint(request.endpoint)
        if not has_required_role(g.current_user.get("role"), required_role):
            return jsonify({"error": "Forbidden: insufficient permissions"}), 403

        return None

    @app.after_request
    def set_security_headers_and_cors(response):
        # Mandatory security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"

        # Strict origin-restricted CORS
        origin = request.headers.get("Origin")
        cfg_current: Config = app.config.get("APP_CONFIG")
        if origin and cfg_current and origin in cfg_current.cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-API-Key"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS"

        return response

    # Centralized JSON error handlers (no HTML stack traces leaked)
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        return jsonify({"error": e.description}), e.code

    @app.errorhandler(ApiError)
    def handle_api_error(e):
        return jsonify({"error": e.message}), e.status_code

    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        logger.error("Unhandled server exception: %s", str(e), exc_info=False)
        return jsonify({"error": "Internal server error"}), 500

    return app
