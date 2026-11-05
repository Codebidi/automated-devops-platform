import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_SECRET_KEY = "default-insecure-secret-key-32-chars-long"

def _load_env_file(env_path: Path) -> None:
    """Simple .env reader without third-party dependencies."""
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
                v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass

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
    ecr_repository: str = "123456789012.dkr.ecr.us-east-1.amazonaws.com/codebidi-platform"
    ec2_host: str = "ec2-54-210-92-14.compute-1.amazonaws.com"
    app_health_url: str = "http://localhost:8080/health"
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

def load_config(overrides: dict | None = None) -> Config:
    """Reads configuration from environment variables once into a frozen dataclass."""
    env_file = Path(__file__).resolve().parent.parent / ".env"
    _load_env_file(env_file)

    values = {
        "use_mock": os.environ.get("USE_MOCK", "true").lower() in ("true", "1", "yes"),
        "github_token": os.environ.get("GITHUB_TOKEN"),
        "github_owner": os.environ.get("GITHUB_OWNER"),
        "github_repo": os.environ.get("GITHUB_REPO"),
        "github_branch": os.environ.get("GITHUB_BRANCH", "main"),
        "github_workflow_file": os.environ.get("GITHUB_WORKFLOW_FILE", "deploy.yml"),
        "rollback_workflow_file": os.environ.get("ROLLBACK_WORKFLOW_FILE", "rollback.yml"),
        "aws_region": os.environ.get("AWS_REGION", "us-east-1"),
        "ecr_repository": os.environ.get("ECR_REPOSITORY", "123456789012.dkr.ecr.us-east-1.amazonaws.com/codebidi-platform"),
        "ec2_host": os.environ.get("EC2_HOST", "ec2-54-210-92-14.compute-1.amazonaws.com"),
        "app_health_url": os.environ.get("APP_HEALTH_URL", "http://localhost:8080/health"),
        "api_key": os.environ.get("API_KEY"),
        "webhook_secret": os.environ.get("WEBHOOK_SECRET"),
        "secret_key": os.environ.get("SECRET_KEY", DEFAULT_SECRET_KEY),
        "token_ttl_hours": int(os.environ.get("TOKEN_TTL_HOURS", 8)),
        "admin_username": os.environ.get("ADMIN_USERNAME", "admin"),
        "admin_password": os.environ.get("ADMIN_PASSWORD"),
        "cors_origins": tuple(
            origin.strip()
            for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ),
        "database_path": os.environ.get("DATABASE_PATH", "data/cicd.db"),
        "database_url": os.environ.get("DATABASE_URL"),
        "cache_ttl_seconds": int(os.environ.get("CACHE_TTL_SECONDS", 10)),
        "port": int(os.environ.get("PORT", 8000)),
    }

    if overrides:
        values.update(overrides)

    cfg = Config(**values)

    # Validate DATABASE_URL prefix if provided
    if cfg.database_url is not None:
        if not (cfg.database_url.startswith("postgresql://") or cfg.database_url.startswith("postgres://")):
            raise ValueError(
                "DATABASE_URL must start with postgresql:// or postgres://"
            )

    # Note: GITHUB_TOKEN is no longer fail-fast validated at startup.
    # It can be configured at runtime via the Settings UI.
    # The provider factory handles the missing-token case gracefully.

    if len(cfg.secret_key) < 32 or cfg.secret_key == DEFAULT_SECRET_KEY or cfg.secret_key == "default":
        raise ValueError(
            "Fail fast: SECRET_KEY must be at least 32 characters long and not use the default value."
        )

    return cfg
