from ..config import Config
from .mock_provider import MockProvider
from .github_provider import GitHubProvider

def create_provider(cfg: Config, session=None):
    """Factory to create either MockProvider or GitHubProvider based on configuration."""
    if cfg.use_mock:
        return MockProvider()

    return GitHubProvider(
        token=cfg.github_token or "",
        owner=cfg.github_owner or "",
        repo=cfg.github_repo or "",
        workflow_file=cfg.github_workflow_file,
        rollback_workflow_file=cfg.rollback_workflow_file,
        cache_ttl_seconds=cfg.cache_ttl_seconds,
        session=session,
    )
