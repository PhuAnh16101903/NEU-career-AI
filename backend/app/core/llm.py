import json
import logging
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

            self._client = genai.Client(api_key=self._api_key)
        return self._client

    async def _generate(self, prompt: str, json_mode: bool) -> str:
        client = self._get_client()
        config = None
        if json_mode:
            from google.genai import types

            config = types.GenerateContentConfig(response_mime_type="application/json")
        try:
            response = await client.aio.models.generate_content(
                model=self._model, contents=prompt, config=config
            )
        except Exception as exc:  # SDK ném nhiều loại lỗi khác nhau
            logger.exception("Gọi Gemini thất bại")
            raise LLMError(f"Gọi Gemini thất bại: {exc}") from exc
        if not response.text:
            raise LLMError("Gemini trả về phản hồi rỗng")
        return response.text

    async def generate_text(self, prompt: str) -> str:
        """Phản hồi văn bản thuần (chatbot phỏng vấn, tóm tắt CV...)."""
        return await self._generate(prompt, json_mode=False)

    async def generate_json(self, prompt: str) -> Dict[str, Any]:
        """Phản hồi JSON hợp lệ (bóc tách CV, chấm điểm...). Ném LLMError nếu không parse được."""
        raw = await self._generate(prompt, json_mode=True)
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise LLMError(f"Phản hồi không phải JSON hợp lệ: {raw[:200]}") from exc


gemini_service = GeminiService()
