"""
Live smoke test against the running backend at http://127.0.0.1:8000
Tests every major endpoint to verify Docker-readiness.
"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"
TOKEN = None
passed = []
failed = []

def req(method, path, body=None, headers=None, expected_status=200):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    if TOKEN:
        h["Authorization"] = f"Bearer {TOKEN}"
    try:
        r = urllib.request.Request(url, data=data, headers=h, method=method)
        with urllib.request.urlopen(r, timeout=5) as resp:
            status = resp.status
            body_bytes = resp.read()
    except urllib.error.HTTPError as e:
        status = e.code
        body_bytes = e.read()
    except Exception as e:
        failed.append(f"{method} {path} -- connection error: {e}")
        return None, None

    try:
        result = json.loads(body_bytes)
    except Exception:
        result = body_bytes.decode(errors="replace")

    label = f"{method} {path}"
    if status == expected_status:
        passed.append(f"  PASS {label} -> {status}")
    else:
        failed.append(f"  FAIL {label} -> got {status}, expected {expected_status}")
    return status, result

def check(condition, label):
    if condition:
        passed.append(f"  PASS {label}")
    else:
        failed.append(f"  FAIL {label}")

print("=" * 60)
print("LIVE API SMOKE TEST")
print("=" * 60)

# --- Health ---
print("\n[Health]")
_, h = req("GET", "/api/health")
check(isinstance(h, dict) and h.get("status") == "ok", "health returns {status:ok}")

# --- Auth ---
print("\n[Auth]")
_, login = req("POST", "/api/auth/login", {"username": "admin", "password": "Admin@12345"})
if login and "token" in login:
    TOKEN = login["token"]
    passed.append("  PASS login returns JWT token")
else:
    failed.append("  FAIL login did not return token")

_, me = req("GET", "/api/auth/me")
# /me returns {"user": {username, role, ...}}
me_user = me.get("user", {}) if isinstance(me, dict) else {}
check(me_user.get("username") == "admin", "me returns admin user")
check(me_user.get("role") == "admin", "me returns admin role")
check("password" not in str(me) and "hash" not in str(me), "me does not leak password hash")

_, bad = req("POST", "/api/auth/login", {"username": "admin", "password": "wrong"}, expected_status=401)
check(isinstance(bad, dict) and "error" in bad, "wrong password returns 401 with error")

# --- Runs ---
print("\n[Runs]")
_, runs = req("GET", "/api/runs")
check(isinstance(runs, dict) and "items" in runs, "runs returns paginated response with items")
check(isinstance(runs.get("items"), list), "runs.items is a list")
check(runs.get("total", 0) > 0, "at least one run exists")

_, paged = req("GET", "/api/runs?per_page=2&page=1")
check(isinstance(paged, dict) and len(paged.get("items", [])) <= 2, "pagination limits results")

if runs and runs.get("items"):
    run_id = runs["items"][0]["id"]
    _, single = req("GET", f"/api/runs/{run_id}")
    check(isinstance(single, dict) and "stages" in single, "single run has stages")
    _, stages = req("GET", f"/api/runs/{run_id}/stages")
    # /stages returns {"stages": [...]}
    stages_list = stages.get("stages", []) if isinstance(stages, dict) else stages
    check(isinstance(stages_list, list), "stages endpoint returns list")

req("GET", "/api/runs/999999999", expected_status=404)

# --- Deployments ---
print("\n[Deployments]")
_, deps = req("GET", "/api/deployments")
check(isinstance(deps, list), "deployments returns list")
_, cur = req("GET", "/api/deployments/current")
check(isinstance(cur, dict) and cur.get("is_current") == True, "current deployment has is_current=true")
check("commit_sha" in cur, "current deployment has commit_sha")
check("image_tag" in cur, "current deployment has image_tag")

# --- Stats ---
print("\n[Stats]")
_, stats = req("GET", "/api/stats")
check(isinstance(stats, dict), "stats returns dict")
for field in ("total_runs", "success_rate", "avg_duration_seconds", "recent"):
    check(field in stats, f"stats has field: {field}")
check(isinstance(stats.get("recent"), list), "stats.recent is a list")

# --- Users ---
print("\n[Users]")
_, users_resp = req("GET", "/api/users")
# /users returns {"items": [...], "total": N}
users_list = users_resp.get("items", []) if isinstance(users_resp, dict) else users_resp
check(isinstance(users_list, list) and len(users_list) >= 3, "at least 3 seeded users returned")
check(all("password" not in str(u) and "hash" not in str(u) for u in users_list), "users do not leak password hashes")

# Create a user (unique username per run avoids 409 on re-runs)
import time
_smoke_user = f"smoke_{int(time.time()) % 100000}"
_, created = req("POST", "/api/users", {
    "username": _smoke_user,
    "password": "SmokeTest@1234",
    "role": "viewer",
    "full_name": "Smoke Test User"
}, expected_status=201)
check(isinstance(created, dict) and created.get("username") == _smoke_user, "user create returns created user")

req("POST", "/api/users", {
    "username": "smoketest_user_007",
    "password": "SmokeTest@1234",
    "role": "viewer",
    "full_name": "Dupe"
}, expected_status=409)

# Duplicate case-insensitive username -> 409
req("POST", "/api/users", {
    "username": "SMOKETEST_USER_007",
    "password": "SmokeTest@1234",
    "role": "viewer",
    "full_name": "Dupe Case"
}, expected_status=409)

# Bad password policy -> 400
req("POST", "/api/users", {
    "username": "badpwuser",
    "password": "short",
    "role": "viewer",
    "full_name": "Bad"
}, expected_status=400)

# --- Settings ---
print("\n[Settings]")
_, settings = req("GET", "/api/settings")
check(isinstance(settings, dict), "settings returns dict")
check("secrets" in settings, "settings has secrets checklist")

# --- Rollback guard ---
print("\n[Rollback]")
_, cur2 = req("GET", "/api/deployments/current")
if cur2 and "id" in cur2:
    _, rb = req("POST", f"/api/deployments/{cur2['id']}/rollback", expected_status=409)
    check(isinstance(rb, dict) and "error" in rb, "rollback to already-current returns 409")

# --- CORS header present ---
print("\n[Security]")
try:
    r2 = urllib.request.Request(BASE + "/api/health", headers={"Origin": "http://localhost:5173"})
    with urllib.request.urlopen(r2, timeout=5) as resp:
        cors = resp.getheader("Access-Control-Allow-Origin", "")
    check(bool(cors), "CORS header present on allowed origin")
except Exception:
    failed.append("  FAIL CORS header check -- connection error")

# --- Unauthenticated rejected ---
saved_token = TOKEN
TOKEN = None
_, unauth = req("GET", "/api/users", expected_status=401)
check(isinstance(unauth, dict) and "error" in unauth, "unauthenticated request rejected with 401")
TOKEN = saved_token

# --- Summary ---
print(f"\n{'='*60}")
print(f"RESULTS: {len(passed)} passed, {len(failed)} failed")
print("="*60)
for p in passed:
    print(p)
if failed:
    print("\nFAILURES:")
    for f in failed:
        print(f)
    sys.exit(1)
else:
    print("\nALL LIVE TESTS PASSED")
