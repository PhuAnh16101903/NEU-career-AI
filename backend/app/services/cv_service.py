import re
from io import BytesIO
from typing import Any, Dict, List, Optional

from starlette.concurrency import run_in_threadpool
from pydantic import ValidationError

from app.core.errors import LLMError, ServiceError
from app.core.llm import gemini_service
from app.core.prompts import render_prompt
from app.data.skill_taxonomy import (
    category_of,
    extract_skills,
    normalize_skill,
)
from app.schemas.cv import CandidateSkill, CVExtractionResponse

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
# Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx, cho phép dấu cách . -
_PHONE = re.compile(r"(?<!\d)(?:\+?84|0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}(?!\d)")


class CVService:
    @staticmethod
    def _extract_pdf(file_bytes: bytes) -> str:
        from pypdf import PdfReader

        try:
            reader = PdfReader(BytesIO(file_bytes))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception as exc:
            raise ServiceError(422, f"Không đọc được file PDF: {exc}") from exc

    @staticmethod
    def _extract_docx(file_bytes: bytes) -> str:
        from docx import Document

        try:
            document = Document(BytesIO(file_bytes))
        except Exception as exc:
            raise ServiceError(422, f"Không đọc được file DOCX: {exc}") from exc
        lines = [p.text for p in document.paragraphs]
        for table in document.tables:
            for row in table.rows:
                lines.extend(cell.text for cell in row.cells)
        return "\n".join(lines)

    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> str:
        name = filename.lower()
        if name.endswith(".pdf"):
            text = CVService._extract_pdf(file_bytes)
        elif name.endswith(".docx"):
            text = CVService._extract_docx(file_bytes)
        else:
            raise ServiceError(400, "Chỉ hỗ trợ file định dạng .pdf hoặc .docx")
        if not text.strip():
            raise ServiceError(
                422, "File không chứa văn bản đọc được (có thể là CV dạng ảnh scan, cần OCR)."
            )
        return text

    @staticmethod
    def _guess_name(text: str) -> Optional[str]:
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            # Tên thường là dòng đầu tiên: ngắn, không số, không email.
            if len(line.split()) <= 5 and not re.search(r"[\d@]", line):
                return line
            break
        return None

    @staticmethod
    def parse_text(text: str, filename: str) -> CVExtractionResponse:
        email = _EMAIL.search(text)
        phone = _PHONE.search(text)
        skills = [CandidateSkill(name=s, category=category_of(s)) for s in extract_skills(text)]

        warnings: List[str] = [
            "Học vấn và kinh nghiệm chưa được bóc tách (cần tích hợp LLM/NER tại cv_service.parse_text)."
        ]
        if not skills:
            warnings.append("Không nhận diện được kỹ năng nào trong Skill Taxonomy.")

        return CVExtractionResponse(
            full_name=CVService._guess_name(text),
            email=email.group(0) if email else None,
            phone=re.sub(r"[\s.-]", "", phone.group(0)) if phone else None,
            skills=skills,
            raw_summary=f"Đã đọc {len(text)} ký tự từ file {filename}.",
            is_mock=True,
            warnings=warnings,
        )

    @staticmethod
    async def _extract_with_gemini(text: str) -> Dict[str, Any]:
        """
        Gửi nội dung CV đến Gemini và nhận dữ liệu JSON.

        Hàm chỉ chịu trách nhiệm gọi AI.
        Việc kiểm tra, chuẩn hóa và kết hợp dữ liệu sẽ được xử lý ở bước tiếp theo.
        """
        prompt = render_prompt(
            "cv_extraction",
            raw_cv_text=text,
        )

        result = await gemini_service.generate_json(prompt)

        if not isinstance(result, dict):
            raise LLMError("Gemini không trả về một JSON object hợp lệ.")

        return result

    @staticmethod
    def _validate_gemini_result(data: Dict[str, Any]) -> CVExtractionResponse:
        """
        Kiểm tra và chuyển JSON từ Gemini thành CVExtractionResponse.
        Không cho dữ liệu sai cấu trúc đi vào API.
        """
        try:
            return CVExtractionResponse.model_validate({
                "full_name": data.get("full_name"),
                "email": data.get("email"),
                "phone": data.get("phone"),
                "education": data.get("education", []),
                "skills": data.get("skills", []),
                "experiences": data.get("experiences", []),
                "raw_summary": "Đã trích xuất thông tin CV bằng Gemini.",
                "is_mock": False,
                "warnings": [],
            })
        except ValidationError as exc:
            raise LLMError(
                f"Dữ liệu CV Gemini trả về không đúng cấu trúc: {exc}"
            ) from exc


    @staticmethod
    async def parse_cv(file_bytes: bytes, filename: str) -> CVExtractionResponse:
        """
        Đọc CV và trích xuất thông tin bằng Gemini.
        Nếu Gemini không khả dụng, sử dụng bộ trích xuất dự phòng.
        """
        text = await run_in_threadpool(CVService.extract_text, file_bytes, filename)

        try:
            # Bước 1: Gọi Gemini để phân tích CV
            ai_data = await CVService._extract_with_gemini(text)

            # Bước 2: Kiểm tra dữ liệu AI trả về
            ai_result = CVService._validate_gemini_result(ai_data)

            # Bước 3: Trích xuất bổ sung bằng phương pháp hiện tại
            fallback = CVService.parse_text(text, filename)

            # Ưu tiên thông tin liên hệ được nhận diện bằng regex
            # Kỹ năng từ Taxonomy được giữ lại; kỹ năng AI bổ sung nếu chưa có
            skills_by_name = {
                skill.name.casefold(): skill
                for skill in fallback.skills
            }

            for skill in ai_result.skills:
                canonical = normalize_skill(skill.name)

                if canonical is None:
                    continue

                skills_by_name.setdefault(
                    canonical.casefold(),
                    CandidateSkill(
                        name=canonical,
                        category=category_of(canonical),
                        level=skill.level,
                    ),
                )

            return ai_result.model_copy(update={
                "full_name": fallback.full_name or ai_result.full_name,
                "email": fallback.email or ai_result.email,
                "phone": fallback.phone or ai_result.phone,
                "skills": list(skills_by_name.values()),
                "raw_summary": (
                    f"Đã đọc {len(text)} ký tự từ file {filename} "
                    "và trích xuất bằng Gemini."
                ),
                "is_mock": False,
                "warnings": ai_result.warnings,
            })

        except LLMError as exc:
            # Gemini không khả dụng: giữ nguyên chức năng trích xuất cũ
            fallback = CVService.parse_text(text, filename)
            fallback.warnings.append(
                f"Không thể sử dụng Gemini; hệ thống chuyển sang trích xuất dự phòng. Chi tiết: {exc}"
            )
            return fallback



cv_service = CVService()
