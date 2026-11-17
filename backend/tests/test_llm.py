
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.errors import LLMError, LLMNotConfiguredError
from app.core.llm import GeminiService


@pytest.mark.anyio
async def test_generate_text_logs_success():
    service = GeminiService(api_key="test-key", model="test-model")

    response = MagicMock()
    response.text = "Hello"
    response.usage_metadata = None

    client = MagicMock()
    client.aio.models.generate_content = AsyncMock(return_value=response)
    service._client = client

    with patch(
        "app.services.ai_usage_service.log_ai_usage"
    ) as mock_log:
        result = await service.generate_text(
            "Test prompt",
            feature="general",
        )

    assert result == "Hello"
    mock_log.assert_called_once()

    logged = mock_log.call_args.kwargs
    assert logged["status"] == "success"
    assert logged["model"] == "test-model"



@pytest.mark.anyio
async def test_generate_json_rejects_invalid_json():
    service = GeminiService(api_key="test-key", model="test-model")

    response = MagicMock()
    response.text = "This is not JSON"
    response.usage_metadata = None

    client = MagicMock()
    client.aio.models.generate_content = AsyncMock(return_value=response)
    service._client = client

    with patch(
        "app.services.ai_usage_service.log_ai_usage"
    ) as mock_log:
        with pytest.raises(LLMError):
            await service.generate_json(
                "Test prompt",
                feature="cv",
            )

    mock_log.assert_called_once()
    assert mock_log.call_args.kwargs["status"] == "failed"
    assert mock_log.call_args.kwargs["error_type"] == "JSONDecodeError"



@pytest.mark.anyio
async def test_generate_fails_when_api_key_is_missing():
    service = GeminiService(api_key="", model="test-model")

    with patch(
        "app.services.ai_usage_service.log_ai_usage"
    ) as mock_log:
        with pytest.raises(LLMNotConfiguredError):
            await service.generate_text(
                "Test prompt",
                feature="general",
            )

    mock_log.assert_called_once()
    assert mock_log.call_args.kwargs["status"] == "failed"
    assert mock_log.call_args.kwargs["error_type"] == "LLMNotConfiguredError"



@pytest.mark.anyio
async def test_generate_logs_gemini_server_error(caplog):
    from google.genai.errors import ServerError

    service = GeminiService(api_key="test-key", model="test-model")

    client = MagicMock()
    client.aio.models.generate_content = AsyncMock(
        side_effect=ServerError(
            code=503,
            response_json={
                "error": {
                    "message": "Service unavailable",
                    "status": "UNAVAILABLE",
                }
            },
        )
    )
    service._client = client

    with patch(
        "app.services.ai_usage_service.log_ai_usage"
    ) as mock_log:
        with pytest.raises(LLMError):
            await service.generate_text(
                "Test prompt",
                feature="matching",
            )

    mock_log.assert_called_once()

    logged = mock_log.call_args.kwargs
    assert logged["status"] == "failed"
    assert logged["error_type"] == "ServerError"

    assert "http_status=503" in caplog.text
    assert "Service unavailable" in caplog.text
