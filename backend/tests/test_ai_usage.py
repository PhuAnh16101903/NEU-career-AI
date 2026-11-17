from unittest.mock import patch

from app.models import AIUsageLog
from app.services.ai_usage_service import log_ai_usage


def test_log_ai_usage_saves_model_and_tokens(client):
    log_ai_usage(
        model="gemini-3.5-flash-lite",
        feature="cv",
        status="success",
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=150,
        latency_ms=1200,
    )

    from app.core.database import SessionLocal

    with SessionLocal() as db:
        usage = (
            db.query(AIUsageLog)
            .filter(AIUsageLog.feature == "cv")
            .order_by(AIUsageLog.created_at.desc())
            .first()
        )

        assert usage is not None
        assert usage.model == "gemini-3.5-flash-lite"
        assert usage.status == "success"
        assert usage.prompt_tokens == 100
        assert usage.completion_tokens == 50
        assert usage.total_tokens == 150


def test_log_ai_usage_does_not_raise_when_database_fails():
    with patch(
        "app.services.ai_usage_service.SessionLocal",
        side_effect=Exception("Database unavailable"),
    ):
        # Không được phát sinh exception ra ngoài.
        log_ai_usage(
            model="gemini-3.5-flash-lite",
            feature="cv",
            status="failed",
            error_type="LLMError",
        )