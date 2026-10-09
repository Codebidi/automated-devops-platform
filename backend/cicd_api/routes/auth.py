from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app, g
from ..db import get_db
from ..security import (
    check_password_safely,
    generate_auth_token,
    is_login_throttled,
    record_login_failure,
    reset_login_throttle,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticates credentials, applies brute-force throttling, and issues timed JWT token."""
    cfg = current_app.config["APP_CONFIG"]
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    client_ip = request.remote_addr or "127.0.0.1"

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if is_login_throttled(username, client_ip):
        return jsonify({"error": "Too many failed login attempts. Please try again in 15 minutes."}), 429

    conn = get_db()
    user_row = conn.execute(
        "SELECT id, username, full_name, password_hash, role, is_active, token_version, created_at, last_login_at "
        "FROM users WHERE username = ? COLLATE NOCASE",
        (username,),
    ).fetchone()

    password_hash = user_row["password_hash"] if user_row else None
    is_valid_pw = check_password_safely(password, password_hash)

    if not user_row or not is_valid_pw:
        record_login_failure(username, client_ip)
        return jsonify({"error": "Invalid username or password"}), 401

    if user_row["is_active"] != 1:
        record_login_failure(username, client_ip)
        return jsonify({"error": "Invalid username or password"}), 401

    reset_login_throttle(username, client_ip)

    now_iso = datetime.now(timezone.utc).isoformat()
    conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now_iso, user_row["id"]))
    conn.commit()

    token = generate_auth_token(user_row["id"], user_row["token_version"], cfg.secret_key)
    expires_in = cfg.token_ttl_hours * 3600

    user_data = {
        "id": user_row["id"],
        "username": user_row["username"],
        "full_name": user_row["full_name"],
        "role": user_row["role"],
        "is_active": bool(user_row["is_active"]),
        "created_at": user_row["created_at"],
        "last_login_at": now_iso,
    }

    return jsonify({
        "token": token,
        "expires_in": expires_in,
        "user": user_data,
    }), 200

@auth_bp.route("/me", methods=["GET"])
def me():
    """Returns currently authenticated user profile."""
    current_user = getattr(g, "current_user", None)
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    safe_user = {k: v for k, v in current_user.items() if k != "password_hash"}
    safe_user["is_active"] = bool(safe_user.get("is_active", 1))
    return jsonify({"user": safe_user}), 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Stateless client logout acknowledgment."""
    return jsonify({"status": "ok", "message": "Successfully logged out"}), 200
