import time
import requests
from datetime import datetime, timezone
from ..config import Config

def check_app_health(cfg: Config) -> dict:
    """Probes APP_HEALTH_URL with a 5s timeout. Mock mode returns healthy."""
    now_iso = datetime.now(timezone.utc).isoformat()

    if cfg.use_mock:
        return {
            "status": "healthy",
            "http_status": 200,
            "latency_ms": 14,
            "checked_at": now_iso,
        }

    url = cfg.app_health_url
    try:
        t0 = time.perf_counter()
        resp = requests.get(url, timeout=5)
        latency = int((time.perf_counter() - t0) * 1000)

        status = "healthy" if (200 <= resp.status_code < 400) else "unhealthy"
        return {
            "status": status,
            "http_status": resp.status_code,
            "latency_ms": latency,
            "checked_at": now_iso,
        }
    except (requests.Timeout, requests.ConnectionError, requests.RequestException):
        return {
            "status": "unhealthy",
            "http_status": None,
            "latency_ms": None,
            "checked_at": now_iso,
        }
    except Exception:
        return {
            "status": "unknown",
            "http_status": None,
            "latency_ms": None,
            "checked_at": now_iso,
        }
