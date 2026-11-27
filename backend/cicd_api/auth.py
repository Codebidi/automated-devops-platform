from typing import Literal

RoleName = Literal["viewer", "developer", "admin"]

ROLE_LEVELS: dict[str, int] = {
    "viewer": 1,
    "developer": 2,
    "admin": 3,
}

# Endpoints accessible without authentication
PUBLIC_ENDPOINTS: set[str] = {
    "health.health_check",
    "auth.login",
    "webhooks.deployment_webhook",
}

# Endpoints requiring elevated roles (endpoints not listed require at least 'viewer')
ENDPOINT_ROLES: dict[str, str] = {
    # developer+
    "runs.get_stage_logs": "developer",
    # admin+
    "deployments.rollback": "admin",
    "deployments.import_deployments": "admin",
    "diagnostics.get_diagnostics": "admin",
    "users.list_users": "admin",
    "users.create_user": "admin",
    "users.update_user": "admin",
    "settings.get_settings": "admin",
    "settings.set_github_token": "admin",
    "settings.update_repository": "admin",
}

def get_minimum_role_for_endpoint(endpoint: str | None) -> str:
    """Returns minimum required role for a given endpoint. Secure by default: unlisted endpoints require 'viewer'."""
    if not endpoint:
        return "viewer"
    return ENDPOINT_ROLES.get(endpoint, "viewer")

def has_required_role(user_role: str | None, minimum_role: str) -> bool:
    """Checks whether the user's role satisfies the required minimum role level."""
    if not user_role:
        return False
    user_level = ROLE_LEVELS.get(user_role, 0)
    required_level = ROLE_LEVELS.get(minimum_role, 1)
    return user_level >= required_level
