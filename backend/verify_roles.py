import urllib.request
import json

BASE = "http://127.0.0.1:8000"

def login(username, password):
    req = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def get(path, token):
    req = urllib.request.Request(
        f"{BASE}{path}",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

print("=" * 60)
print("VERIFYING ROLES AGAINST LIVE BACKEND")
print("=" * 60)

# 1. Admin login
adm = login("admin", "Admin@12345")
adm_token = adm["token"]
print("1. Admin authenticated:", adm["user"]["username"], "Role:", adm["user"]["role"])
assert adm["user"]["role"] == "admin"

# 2. Developer login
dev = login("developer", "Dev@123456")
dev_token = dev["token"]
print("2. Developer authenticated:", dev["user"]["username"], "Role:", dev["user"]["role"])
assert dev["user"]["role"] == "developer"

# 3. Viewer login
view = login("viewer", "View@12345")
view_token = view["token"]
print("3. Viewer authenticated:", view["user"]["username"], "Role:", view["user"]["role"])
assert view["user"]["role"] == "viewer"

# 4. Check user management endpoint /api/users
adm_users_status, _ = get("/api/users", adm_token)
dev_users_status, _ = get("/api/users", dev_token)
view_users_status, _ = get("/api/users", view_token)

print(f"Users endpoint (/api/users):")
print(f"   Admin status: {adm_users_status} (Expected 200)")
print(f"   Developer status: {dev_users_status} (Expected 403)")
print(f"   Viewer status: {view_users_status} (Expected 403)")

assert adm_users_status == 200
assert dev_users_status == 403
assert view_users_status == 403

# 5. Check stage logs endpoint
adm_log_status, _ = get("/api/runs/run-25/stages/test/logs", adm_token)
dev_log_status, _ = get("/api/runs/run-25/stages/test/logs", dev_token)
view_log_status, _ = get("/api/runs/run-25/stages/test/logs", view_token)

print(f"Stage logs endpoint (/api/runs/.../logs):")
print(f"   Admin status: {adm_log_status} (Expected 200)")
print(f"   Developer status: {dev_log_status} (Expected 200)")
print(f"   Viewer status: {view_log_status} (Expected 403)")

assert adm_log_status == 200
assert dev_log_status == 200
assert view_log_status == 403

print("\nALL ROLE RULES VERIFIED SUCCESSFULLY!")
