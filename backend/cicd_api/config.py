import logging
import os
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_SECRET_KEY = "default-insecure-secret-key-32-chars-long"
PLACEHOLDER_SUBSTRINGS = ("your-", "changeme", "change-me", "xxxx")

REQUIRED_GITHUB_SECRETS = (
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "EC2_HOST",
    "EC2_USER",
    "EC2_SSH_KEY",
    "WEBHOOK_SECRET",
    "DASHBOARD_API_URL",
)


def is_placeholder(value: str | None) -> bool:
    """Returns True if value contains any known placeholder token."""
    if not value:
        return False
    low = value.lower()
    return any(p in low for p in PLACEHOLDER_SUBSTRINGS)


def _load_env_file(env_path: Path) -> None:
    """Simple .env reader without third-party dependencies. Real env vars always win."""
    if not env_path.is_file():
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip()
                if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                    if len(v) >= 2:
                        v = v[1:-1]
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass


def normalize_ecr_config(raw_repo: str | None, raw_registry: str | None) -> tuple[str | None, str]:
    """Splits a full ECR URI into (registry, repository_name) and drops any image tag."""
    registry = raw_registry.strip().rstrip("/") if raw_registry and raw_registry.strip() else None
    repo = raw_repo.strip().strip("/") if raw_repo and raw_repo.strip() else ""

    if not repo:
        return registry, ""

    if "/" in repo:
        first, rest = repo.split("/", 1)
        if "." in first or ":" in first or first == "localhost":
            parsed_registry = first.rstrip("/")
            parsed_repo = rest.split(":", 1)[0].strip("/")
            logger.warning(
                "ECR_REPOSITORY contained a full URI; normalized to registry=%s repository=%s",
                parsed_registry,
                parsed_repo,
            )
            if not registry:
                registry = parsed_registry
            return registry, parsed_repo

    if ":" in repo:
        parsed_repo = repo.split(":", 1)[0].strip("/")
        logger.warning(
            "ECR_REPOSITORY contained a tag; stripped tag to repository=%s",
            parsed_repo,
        )
        return registry, parsed_repo

    return registry, repo


@dataclass(frozen=True)
class Config:
    use_mock: bool = True
    github_token: str | None = None
    github_owner: str | None = None
    github_repo: str | None = None
    github_branch: str = "main"
    github_workflow_file: str = "deploy.yml"
    rollback_workflow_file: str = "rollback.yml"
    aws_region: str = "us-east-1"
    ecr_registry: str | None = None
    ecr_repository: str = ""
    ec2_host: str = ""
    app_health_url: str | None = None
    app_port: int = 5000
    api_key: str | None = None
    webhook_secret: str | None = None
    secret_key: str = DEFAULT_SECRET_KEY
    token_ttl_hours: int = 8
    admin_username: str = "admin"
    admin_password: str | None = None
    cors_origins: tuple[str, ...] = ("http://localhost:5173",)
    database_path: str = "data/cicd.db"
    database_url: str | None = None
    cache_ttl_seconds: int = 10
    port: int = 8000

    @classmethod
    def from_env(cls, overrides: dict | None = None, env_files: list[Path] | None = None) -> "Config":
        """Loads Config from environment variables and optional .env files."""
        return load_config(overrides=overrides, env_files=env_files)


def validate_real_mode(cfg: Config, raise_on_error: bool = False) -> list[str]:
    """Validates required settings for real mode. Returns a list of one-line error messages."""
    errors: list[str] = []

    if not cfg.github_token or is_placeholder(cfg.github_token):
        errors.append("GITHUB_TOKEN is missing or contains a placeholder value.")
    if not cfg.github_owner or is_placeholder(cfg.github_owner):
        errors.append("GITHUB_OWNER is missing or contains a placeholder value.")
    if not cfg.github_repo or is_placeholder(cfg.github_repo):
        errors.append("GITHUB_REPO is missing or contains a placeholder value.")
    if len(cfg.secret_key) < 32 or cfg.secret_key in (DEFAULT_SECRET_KEY, "default") or is_placeholder(cfg.secret_key):
        errors.append("SECRET_KEY must be at least 32 characters and not a default or placeholder value.")
    if not cfg.webhook_secret or is_placeholder(cfg.webhook_secret):
        errors.append("WEBHOOK_SECRET is missing or contains a placeholder value.")
    if cfg.app_health_url:
        if is_placeholder(cfg.app_health_url) or not (
            cfg.app_health_url.startswith("http://") or cfg.app_health_url.startswith("https://")
        ):
            errors.append("APP_HEALTH_URL must start with http:// or https:// and not be a placeholder.")

    if raise_on_error and errors:
        raise ValueError("; ".join(errors))
    return errors


def load_config(overrides: dict | None = None, env_files: list[Path] | None = None) -> Config:
    """Reads configuration from environment variables once into a frozen dataclass."""
    if env_files is None:
        backend_env = Path(__file__).resolve().parent.parent / ".env"
        root_env = Path(__file__).resolve().parent.parent.parent / ".env"
        env_files = [backend_env, root_env]

    for ef in env_files:
        _load_env_file(ef)

    use_mock = os.environ.get("USE_MOCK", "true").lower() in ("true", "1", "yes")
    if overrides and "use_mock" in overrides:
        use_mock = bool(overrides["use_mock"])

    raw_ecr_repo = os.environ.get("ECR_REPOSITORY")
    raw_ecr_reg = os.environ.get("ECR_REGISTRY")
    if overrides:
        if "ecr_repository" in overrides:
            raw_ecr_repo = overrides["ecr_repository"]
        if "ecr_registry" in overrides:
            raw_ecr_reg = overrides["ecr_registry"]

    if not raw_ecr_repo and use_mock:
        raw_ecr_repo = "codebidi-platform"

    ecr_registry, ecr_repository = normalize_ecr_config(raw_ecr_repo, raw_ecr_reg)

    app_health_raw = os.environ.get("APP_HEALTH_URL")
    if app_health_raw is not None:
        app_health_raw = app_health_raw.strip() or None
    elif use_mock:
        app_health_raw = "http://localhost:8080/health"

    app_port_raw = os.environ.get("APP_PORT", "5000")
    try:
        app_port = int(app_port_raw)
    except ValueError:
        app_port = 5000

    values = {
        "use_mock": use_mock,
        "github_token": os.environ.get("GITHUB_TOKEN") or None,
        "github_owner": os.environ.get("GITHUB_OWNER") or None,
        "github_repo": os.environ.get("GITHUB_REPO") or None,
        "github_branch": os.environ.get("GITHUB_BRANCH", "main"),
        "github_workflow_file": os.environ.get("GITHUB_WORKFLOW_FILE", "deploy.yml"),
        "rollback_workflow_file": os.environ.get("ROLLBACK_WORKFLOW_FILE", "rollback.yml"),
        "aws_region": os.environ.get("AWS_REGION", "us-east-1"),
        "ecr_registry": ecr_registry,
        "ecr_repository": ecr_repository,
        "ec2_host": os.environ.get("EC2_HOST", "ec2-54-210-92-14.compute-1.amazonaws.com" if use_mock else ""),
        "app_health_url": app_health_raw,
        "app_port": app_port,
        "api_key": os.environ.get("API_KEY") or None,
        "webhook_secret": os.environ.get("WEBHOOK_SECRET") or None,
        "secret_key": os.environ.get("SECRET_KEY", DEFAULT_SECRET_KEY),
        "token_ttl_hours": int(os.environ.get("TOKEN_TTL_HOURS", 8)),
        "admin_username": os.environ.get("ADMIN_USERNAME", "admin"),
        "admin_password": os.environ.get("ADMIN_PASSWORD") or None,
        "cors_origins": tuple(
            origin.strip()
            for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ),
        "database_path": os.environ.get("DATABASE_PATH", "data/cicd.db"),
        "database_url": os.environ.get("DATABASE_URL") or None,
        "cache_ttl_seconds": int(os.environ.get("CACHE_TTL_SECONDS", 10)),
        "port": int(os.environ.get("PORT", 8000)),
    }

    if overrides:
        for k, v in overrides.items():
            if k not in ("ecr_repository", "ecr_registry"):
                values[k] = v

    cfg = Config(**values)

    # Validate DATABASE_URL prefix if provided
    if cfg.database_url is not None:
        if not (cfg.database_url.startswith("postgresql://") or cfg.database_url.startswith("postgres://")):
            raise ValueError(
                "DATABASE_URL must start with postgresql:// or postgres://"
            )

    if len(cfg.secret_key) < 32 or cfg.secret_key in (DEFAULT_SECRET_KEY, "default") or is_placeholder(cfg.secret_key):
        raise ValueError(
            "Fail fast: SECRET_KEY must be at least 32 characters long and not use a default or placeholder value."
        )

    return cfg
