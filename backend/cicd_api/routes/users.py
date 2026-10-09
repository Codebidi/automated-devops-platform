from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash
from ..db import get_db
from ..security import (
    validate_username_policy,
    validate_password_policy,
)

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

@users_bp.route("", methods=["GET"])
def list_users():
    """Lists all registered users (admin only, passwords/hashes omitted)."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, username, full_name, role, is_active, token_version, created_at, last_login_at "
        "FROM users ORDER BY id ASC"
    ).fetchall()

    users = []
    for r in rows:
        u = dict(r)
        u["is_active"] = bool(u["is_active"])
        users.append(u)

    return jsonify({"items": users, "total": len(users)}), 200

@users_bp.route("", methods=["POST"])
def create_user():
    """Creates a new user account with role assignment (admin only)."""
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    full_name = str(data.get("full_name", "")).strip()
    role = str(data.get("role", "")).strip().lower()
    password = str(data.get("password", ""))

    if not validate_username_policy(username):
        return jsonify({"error": "Username must be 3-32 characters of letters, numbers, '.', '_', or '-'"}), 400

    if not full_name:
        return jsonify({"error": "Full name is required"}), 400

    if role not in ("viewer", "developer", "admin"):
        return jsonify({"error": "Role must be one of: viewer, developer, admin"}), 400

    if not validate_password_policy(password):
        return jsonify({"error": "Password must be 10-128 characters and contain both letters and numbers"}), 400

    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ? COLLATE NOCASE",
        (username,),
    ).fetchone()
    if existing:
        return jsonify({"error": f"Username '{username}' already exists"}), 409

    now_iso = datetime.now(timezone.utc).isoformat()
    pw_hash = generate_password_hash(password)

    cur = conn.execute(
        "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
        "VALUES (?, ?, ?, ?, 1, 1, ?)",
        (username, full_name, pw_hash, role, now_iso),
    )
    conn.commit()
    new_id = cur.lastrowid

    return jsonify({
        "id": new_id,
        "username": username,
        "full_name": full_name,
        "role": role,
        "is_active": True,
        "token_version": 1,
        "created_at": now_iso,
        "last_login_at": None,
    }), 201

@users_bp.route("/<int:user_id>", methods=["PATCH"])
def update_user(user_id: int):
    """Updates user properties (admin only). Revokes sessions on role, status, or password change."""
    conn = get_db()
    target = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not target:
        return jsonify({"error": f"User with id {user_id} not found"}), 404

    target = dict(target)
    current_user = getattr(g, "current_user", {})
    data = request.get_json(silent=True) or {}

    new_full_name = data.get("full_name")
    new_role = data.get("role")
    new_is_active = data.get("is_active")
    new_password = data.get("password")

    # Guard: admin cannot change their own role or active status
    is_self = (current_user.get("id") == user_id)
    if is_self:
        if new_role is not None and new_role.lower() != target["role"]:
            return jsonify({"error": "Admins cannot change their own role"}), 409
        if new_is_active is not None and int(bool(new_is_active)) != target["is_active"]:
            return jsonify({"error": "Admins cannot change their own active status"}), 409

    # Guard: last active admin cannot be demoted or deactivated
    demoting = (new_role is not None and new_role.lower() != "admin" and target["role"] == "admin")
    deactivating = (new_is_active is not None and not bool(new_is_active) and target["is_active"] == 1)
    if (demoting or deactivating) and target["role"] == "admin" and target["is_active"] == 1:
        active_admins_count = conn.execute(
            "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1"
        ).fetchone()[0]
        if active_admins_count <= 1:
            return jsonify({"error": "Cannot demote or deactivate the last active admin"}), 409

    updates = {}
    revocation_needed = False

    if new_full_name is not None:
        clean_fn = str(new_full_name).strip()
        if not clean_fn:
            return jsonify({"error": "Full name cannot be empty"}), 400
        updates["full_name"] = clean_fn

    if new_role is not None:
        clean_role = str(new_role).strip().lower()
        if clean_role not in ("viewer", "developer", "admin"):
            return jsonify({"error": "Role must be one of: viewer, developer, admin"}), 400
        if clean_role != target["role"]:
            updates["role"] = clean_role
            revocation_needed = True

    if new_is_active is not None:
        clean_active = 1 if bool(new_is_active) else 0
        if clean_active != target["is_active"]:
            updates["is_active"] = clean_active
            revocation_needed = True

    if new_password is not None:
        clean_pw = str(new_password)
        if not validate_password_policy(clean_pw):
            return jsonify({"error": "Password must be 10-128 characters and contain both letters and numbers"}), 400
        updates["password_hash"] = generate_password_hash(clean_pw)
        revocation_needed = True

    if revocation_needed:
        updates["token_version"] = target["token_version"] + 1

    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        params = list(updates.values()) + [user_id]
        conn.execute(f"UPDATE users SET {set_clause} WHERE id = ?", params)
        conn.commit()

    updated_row = conn.execute(
        "SELECT id, username, full_name, role, is_active, token_version, created_at, last_login_at "
        "FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()

    res = dict(updated_row)
    res["is_active"] = bool(res["is_active"])
    return jsonify(res), 200
