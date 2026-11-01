class ServiceError(Exception):
    """Lỗi nghiệp vụ do service ném ra; main.py chuyển thành JSON response có status code tương ứng."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class LLMError(Exception):
    """Lỗi khi gọi mô hình ngôn ngữ (chưa cấu hình key, API lỗi, phản hồi không hợp lệ...)."""


class LLMNotConfiguredError(LLMError):
    """Chưa cấu hình GEMINI_API_KEY."""
