import re
import hmac
import time
import hashlib
from typing import Any
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash

# Pre-computed hash to prevent username enumeration timing attacks
DUMMY_PASSWORD_HASH = generate_password_hash("DummyTimingProtectionPassword123")

# In-memory login attempt tracker: key (username_lower, ip) -> list of failure timestamps
_failed_attempts: dict[tuple[str, str], list[float]] = {}
THROTTLE_WINDOW_SECONDS = 900  # 15 minutes
MAX_FAILED_ATTEMPTS = 5

def check_password_safely(password: str, password_hash: str | None) -> bool:
    """Verifies a password against a hash, performing a dummy check if user is not found."""
    if not password_hash:
        check_password_hash(DUMMY_PASSWORD_HASH, password)
        return False
    return check_password_hash(password_hash, password)

def validate_password_policy(password: str) -> bool:
    """Password policy: 10-128 chars, must contain letters and numbers."""
    if not password or not (10 <= len(password) <= 128):
        return False
    has_letter = bool(re.search(r"[A-Za-z]", password))
    has_digit = bool(re.search(r"\d", password))
    return has_letter and has_digit

def validate_username_policy(username: str) -> bool:
    """Username policy: 3-32 chars of letters/numbers/._-."""
    if not username or not (3 <= len(username) <= 32):
        return False
    return bool(re.match(r"^[A-Za-z0-9._-]+$", username))

def generate_auth_token(user_id: int, token_version: int, secret_key: str) -> str:
    """Signs user id and per-user token_version using URLSafeTimedSerializer."""
    serializer = URLSafeTimedSerializer(secret_key, salt="cicd-auth-token")
    return serializer.dumps({"uid": user_id, "tv": token_version})

def decode_auth_token(token: str, secret_key: str, max_age_seconds: int) -> dict[str, Any] | None:
    """Decodes and validates token signature and freshness."""
    serializer = URLSafeTimedSerializer(secret_key, salt="cicd-auth-token")
    try:
        data = serializer.loads(token, max_age=max_age_seconds)
        if isinstance(data, dict) and "uid" in data and "tv" in data:
            return data
    except (BadSignature, SignatureExpired, Exception):
        return None
    return None

def is_login_throttled(username: str, ip: str) -> bool:
    """Checks whether the username+IP combination has exceeded 5 failed attempts in 15 minutes."""
    key = (username.strip().lower(), ip.strip())
    now = time.time()
    attempts = [t for t in _failed_attempts.get(key, []) if now - t < THROTTLE_WINDOW_SECONDS]
    _failed_attempts[key] = attempts
    return len(attempts) >= MAX_FAILED_ATTEMPTS

def record_login_failure(username: str, ip: str) -> None:
    """Records a failed login attempt for the given username+IP."""
    key = (username.strip().lower(), ip.strip())
    now = time.time()
    attempts = [t for t in _failed_attempts.get(key, []) if now - t < THROTTLE_WINDOW_SECONDS]
    attempts.append(now)
    _failed_attempts[key] = attempts

def reset_login_throttle(username: str, ip: str) -> None:
    """Clears failed login attempt history on successful authentication."""
    key = (username.strip().lower(), ip.strip())
    _failed_attempts.pop(key, None)

def verify_api_key_constant_time(provided: str | None, expected: str | None) -> bool:
    """Constant-time comparison for API key."""
    if not provided or not expected:
        return False
    return hmac.compare_digest(provided.strip(), expected.strip())

def verify_webhook_signature(raw_body: bytes, signature_header: str | None, secret: str | None) -> bool:
    """Verifies X-Signature-256 header in constant time."""
    if not signature_header or not secret:
        return False
    expected_hex = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    expected_sig = f"sha256={expected_hex}"
    return hmac.compare_digest(signature_header.strip(), expected_sig)
