from dataclasses import dataclass
from typing import Literal

StageName = Literal["test", "build", "push", "deploy"]
StageStatus = Literal["success", "failed", "running", "skipped", "pending"]

STAGE_DEFINITIONS = [
    {"id": "test", "name": "Lint + Test"},
    {"id": "build", "name": "Build Docker Image"},
    {"id": "push", "name": "Push to ECR"},
    {"id": "deploy", "name": "Deploy to EC2"},
]

STAGE_ORDER: list[StageName] = ["test", "build", "push", "deploy"]

@dataclass
class Stage:
    id: StageName
    name: str
    status: StageStatus
    duration_seconds: int | None
    started_at: str | None
    finished_at: str | None

def normalize_stage_progression(stages: list[dict], is_pull_request: bool = False) -> list[dict]:
    """Ensures sequential stage rules:
    - If a stage fails, later stages become 'skipped'.
    - If is_pull_request is True, only test stage runs; later stages are 'skipped'.
    """
    result = []
    has_failed = False

    for item in stages:
        stage_id = item.get("id")
        current_status = item.get("status", "pending")

        if is_pull_request and stage_id != "test":
            current_status = "skipped"
        elif has_failed:
            current_status = "skipped"
        elif current_status == "failed":
            has_failed = True

        result.append({
            "id": stage_id,
            "name": item.get("name", stage_id),
            "status": current_status,
            "duration_seconds": item.get("duration_seconds"),
            "started_at": item.get("started_at"),
            "finished_at": item.get("finished_at"),
        })

    return result
