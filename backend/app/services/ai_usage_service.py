
import logging
from typing import Optional

from app.core.database import SessionLocal
from app.models import AIUsageLog

logger = logging.getLogger(__name__)


def log_ai_usage(
    *,
    model: str,
    feature: str,
    status: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    latency_ms: Optional[float] = None,
    cost_usd: Optional[float] = None,
    error_type: Optional[str] = None,
) -> None:
    """Lưu metadata sử dụng AI; lỗi ghi log không ảnh hưởng chức năng chính."""
    db = None

    try:
        db = SessionLocal()
        usage = AIUsageLog(
            provider="gemini",
            model=model,
            feature=feature,
            status=status,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            cost_usd=cost_usd,
            error_type=error_type,
        )
        db.add(usage)
        db.commit()

    except Exception:
        if db is not None:
            db.rollback()
        logger.exception("Không thể lưu AI usage log")

    finally:
        if db is not None:
            db.close()
