#!/usr/bin/env python3
"""Management CLI for DeployHub: check, create-admin, purge-demo-users."""
import argparse
import getpass
import sys
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash

from cicd_api import create_app
from cicd_api.db import (
    _is_postgres,
    db_commit,
    db_execute,
    db_fetchone,
    find_demo_users,
    get_db,
    insert_returning_id,
    purge_demo_users,
)
from cicd_api.security import validate_password_policy, validate_username_policy
from cicd_api.services.diagnostics import run_diagnostics


def cmd_check(args) -> int:
    app = create_app()
    with app.app_context():
        report = run_diagnostics(app)

    print(f"DeployHub Preflight Check (mode={report['mode']}, engine={report['engine']})")
    print("-" * 72)
    for c in report["checks"]:
        badge = f"[{c['status']:4s}]"
        print(f"{badge} {c['name']}: {c['message']}")
        if c["status"] != "PASS" and c.get("fix"):
            print(f"       Fix: {c['fix']}")
    print("-" * 72)
    s = report["summary"]
    print(f"Summary: {s['pass']} PASS, {s['warn']} WARN, {s['fail']} FAIL")
    return 1 if s["fail"] > 0 else 0


def cmd_create_admin(args) -> int:
    app = create_app()
    cfg = app.config["APP_CONFIG"]

    username = (args.username or cfg.admin_username or "admin").strip()
    if not validate_username_policy(username):
        print("Error: Username must be 3-32 characters (letters, numbers, . _ -).", file=sys.stderr)
        return 1

    password = args.password or cfg.admin_password
    if not password:
        password = getpass.getpass(f"Password for admin '{username}': ")

    if not validate_password_policy(password):
        print("Error: Password must be 10-128 characters and include both letters and numbers.", file=sys.stderr)
        return 1

    use_pg = _is_postgres(cfg)
    now_iso = datetime.now(timezone.utc).isoformat()
    with app.app_context():
        conn = get_db(None if use_pg else cfg.database_path)
        existing = db_fetchone(conn, "SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username,))
        phash = generate_password_hash(password)
        if existing:
            db_execute(
                conn,
                "UPDATE users SET password_hash = ?, role = 'admin', is_active = 1, token_version = token_version + 1 WHERE id = ?",
                (phash, existing["id"]),
            )
            db_commit(conn)
            print(f"Updated existing user '{username}' as active admin.")
        else:
            insert_returning_id(
                conn,
                "INSERT INTO users (username, full_name, password_hash, role, is_active, token_version, created_at) "
                "VALUES (?, ?, ?, 'admin', 1, 1, ?)",
                (username, "System Administrator", phash, now_iso),
            )
            db_commit(conn)
            print(f"Created admin user '{username}'.")
    return 0


def cmd_purge_demo_users(args) -> int:
    app = create_app()
    cfg = app.config["APP_CONFIG"]
    use_pg = _is_postgres(cfg)

    with app.app_context():
        conn = get_db(None if use_pg else cfg.database_path)
        found = find_demo_users(conn)
        if not found:
            print("No known demo users with default demo passwords found.")
            return 0

        print(f"Found demo accounts with default passwords: {', '.join(found)}")
        if not args.yes:
            ans = input("Delete these demo accounts? [y/N]: ").strip().lower()
            if ans not in ("y", "yes"):
                print("Aborted.")
                return 0

        deleted = purge_demo_users(conn)
        print(f"Deleted demo accounts: {', '.join(deleted)}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="DeployHub management CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("check", help="Run preflight diagnostics")

    p_admin = sub.add_parser("create-admin", help="Create or update an admin user")
    p_admin.add_argument("--username", help="Admin username")
    p_admin.add_argument("--password", help="Admin password")

    p_purge = sub.add_parser("purge-demo-users", help="Delete known demo accounts using default demo passwords")
    p_purge.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt")

    args = parser.parse_args()
    if args.command == "check":
        return cmd_check(args)
    if args.command == "create-admin":
        return cmd_create_admin(args)
    if args.command == "purge-demo-users":
        return cmd_purge_demo_users(args)
    return 1


if __name__ == "__main__":
    sys.exit(main())
