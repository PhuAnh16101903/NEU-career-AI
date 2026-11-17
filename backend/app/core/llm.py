import json
import logging
import time
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.errors import LLMError, LLMNotConfiguredError

logger = logging.getLogger(__name__)


class GeminiService:
    """
    Bọc Google Gemini. Client được tạo lười (lần gọi đầu tiên) nên import module này không
    tốn tài nguyên và không lỗi khi chưa có API key.

    Lỗi luôn được ném ra dưới dạng LLMError; caller tự quyết định fallback, không bao giờ
    nhận chuỗi lỗi giả làm câu trả lời của AI.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = settings.GEMINI_API_KEY if api_key is None else api_key
        self._model = model or settings.GEMINI_MODEL
        self._client = None

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key and self._api_key.strip())

    def _get_client(self):
        if not self.is_configured:
            raise LLMNotConfiguredError("Chưa cấu hình GEMINI_API_KEY trong file .env")
        if self._client is None:
            from google import genai
            from google.genai import types

            http_options = types.HttpOptions(
                timeout=30_000,
                retry_options=types.HttpRetryOptions(
                    attempts=1,
                ),
            )

            self._client = genai.Client(
                api_key=self._api_key,
                http_options=http_options,
            )
        return self._client



    async def _generate(
        self,
        prompt: str,
        json_mode: bool,
        feature: str = "general",
    ) -> Any:
        started_at = time.perf_counter()

        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0

        try:
            # Khởi tạo client bên trong try để ghi nhận cả lỗi thiếu API key.
            client = self._get_client()
            config = None

            if json_mode:
                from google.genai import types

                config = types.GenerateContentConfig(
                    response_mime_type="application/json"
                )

            response = await client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=config,
            )

            latency_ms = (time.perf_counter() - started_at) * 1000

            usage = getattr(response, "usage_metadata", None)

            prompt_tokens = getattr(usage, "prompt_token_count", 0) or 0
            completion_tokens = getattr(usage, "candidates_token_count", 0) or 0
            total_tokens = getattr(usage, "total_token_count", 0) or 0

            if not response.text:
                raise LLMError("Gemini trả về phản hồi rỗng")

            # JSON phải được parse thành công trước khi ghi nhận success.
            if json_mode:
                result = json.loads(response.text)
            else:
                result = response.text

            from app.services.ai_usage_service import log_ai_usage

            log_ai_usage(
                model=self._model,
                feature=feature,
                status="success",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
            )

            return result


        except Exception as exc:
            latency_ms = (time.perf_counter() - started_at) * 1000

            # Lấy thông tin lỗi chi tiết từ Google GenAI nếu có.
            http_status = getattr(exc, "code", None)
            api_status = getattr(exc, "status", None)
            error_message = getattr(exc, "message", None) or str(exc)

            # Không để API Key xuất hiện trong log.
            if self._api_key:
                error_message = error_message.replace(
                    self._api_key,
                    "[REDACTED]",
                )

            # Giới hạn độ dài và loại bỏ xuống dòng trong thông báo lỗi.
            error_message = " ".join(str(error_message).split())[:1000]

            logger.error(
                "Gemini request failed | feature=%s model=%s "
                "exception=%s http_status=%s api_status=%s message=%s",
                feature,
                self._model,
                type(exc).__name__,
                http_status,
                api_status,
                error_message,
            )

            from app.services.ai_usage_service import log_ai_usage

            log_ai_usage(
                model=self._model,
                feature=feature,
                status="failed",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
                error_type=type(exc).__name__,
            )

            if isinstance(exc, (LLMError, LLMNotConfiguredError)):
                raise

            if isinstance(exc, json.JSONDecodeError):
                raise LLMError(
                    f"Phản hồi không phải JSON hợp lệ: {error_message}"
                ) from exc

            raise LLMError(
                f"Gọi Gemini thất bại: {error_message}"
            ) from exc


    async def generate_text(
        self,
        prompt: str,
        feature: str = "general",
    ) -> str:
        """Phản hồi văn bản thuần (chatbot phỏng vấn, tóm tắt CV...)."""
        return await self._generate(
            prompt,
            json_mode=False,
            feature=feature,
        )



    async def generate_json(
        self,
        prompt: str,
        feature: str = "general",
    ) -> Dict[str, Any]:
        """Phản hồi JSON hợp lệ (bóc tách CV, chấm điểm...)."""
        return await self._generate(
            prompt,
            json_mode=True,
            feature=feature,
        )


gemini_service = GeminiService()
