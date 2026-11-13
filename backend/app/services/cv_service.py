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
)
from app.schemas.cv import (
    CandidateSkill,
    CVExtractionResponse,
    EducationItem,
    ProjectItem,
)

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
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        ignored = {
            "CV", "RESUME", "CURRICULUM VITAE",
            "THÔNG TIN CÁ NHÂN", "PERSONAL INFORMATION",
            "LIÊN HỆ", "CONTACT", "HỌC VẤN", "EDUCATION",
            "DỰ ÁN", "PROJECTS", "KINH NGHIỆM", "EXPERIENCE",
            "KĨ NĂNG", "KỸ NĂNG", "SKILLS",
        }

        def is_spaced_heading(value: str) -> bool:
            return bool(re.search(r"(?:[A-ZÀ-Ỹ]\s+){2,}[A-ZÀ-Ỹ]", value))

        def is_name_candidate(value: str, allow_one_word: bool = False) -> bool:
            normalized = re.sub(r"\s+", " ", value).strip().upper()
            word_count = len(value.split())

            if normalized in ignored:
                return False

            if word_count > 5 or (word_count < 2 and not allow_one_word):
                return False

            if re.search(r"[\d@:/,]", value):
                return False

            if _EMAIL.search(value) or _PHONE.search(value):
                return False

            if re.search(
                r"\b(sinh viên|student|developer|engineer|"
                r"lập trình viên|ứng viên|candidate|"
                r"tam trinh|mai động|hoàng mai|hà nội)\b",
                value,
                re.IGNORECASE,
            ):
                return False

            if value.lower().startswith(("http", "www.")):
                return False

            if is_spaced_heading(value):
                return False

            return True

        # Ưu tiên tên viết hoa bị tách thành hai dòng.
        for index in range(len(lines) - 1):
            first = lines[index]
            second = lines[index + 1]

            if (
                first == first.upper()
                and second == second.upper()
                and 1 <= len(first.split()) <= 3
                and 1 <= len(second.split()) <= 3
                and len(first) >= 5
                and len(second) >= 5
                and first.upper() not in ignored
                and second.upper() not in ignored
                and is_name_candidate(first)
                and is_name_candidate(second)
            ):
                return f"{first} {second}"

        # Kiểm tra các dòng đầu CV, hỗ trợ cả tên chỉ có một từ.
        for line in lines[:8]:
            if is_name_candidate(line, allow_one_word=True):
                return line

        return None


    @staticmethod
    def _extract_education(text: str) -> List[EducationItem]:
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        institution = None
        major = None
        gpa = None
        graduation_year = None

        for line in lines:
            # Nhận diện tên trường đại học, cao đẳng hoặc học viện.
            if re.search(
                r"\b(đại học|university|college|cao đẳng|học viện|institute)\b",
                line,
                re.IGNORECASE,
            ):
                institution = line
                break

        for line in lines:
            # Nhận diện ngành học.
            match = re.search(
                r"^(?:ngành|chuyên ngành|major)\s*[:\-]?\s*(.+)$",
                line,
                re.IGNORECASE,
            )
            if match:
                major = match.group(1).strip()
                break

        # Nhận diện GPA, ví dụ: GPA 3.4/4.0 hoặc GPA: 8.5.
        gpa_match = re.search(
            r"\bGPA\s*[:\-]?\s*(\d+(?:[.,]\d+)?)",
            text,
            re.IGNORECASE,
        )
        if gpa_match:
            gpa = float(gpa_match.group(1).replace(",", "."))

        # Chỉ lấy năm tốt nghiệp khi CV ghi rõ tốt nghiệp hoặc dự kiến tốt nghiệp.
        year_match = re.search(
            r"(?:dự kiến tốt nghiệp|tốt nghiệp|expected graduation|graduation)"
            r"\s*[:\-]?\s*(20\d{2})",
            text,
            re.IGNORECASE,
        )
        if year_match:
            graduation_year = int(year_match.group(1))

        # Schema yêu cầu phải có cả trường và ngành.
        if not institution or not major:
            return []

        return [
            EducationItem(
                institution=institution,
                major=major,
                gpa=gpa,
                graduation_year=graduation_year,
            )
        ]


    @staticmethod
    def _extract_projects(text: str) -> List[ProjectItem]:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        projects: List[ProjectItem] = []

        role_pattern = re.compile(
            r"^(?:vai trò|role)\s*[:\-]\s*(.+)$",
            re.IGNORECASE,
        )
        technology_pattern = re.compile(
            r"^(?:công nghệ|công nghệ sử dụng|technologies|tech stack)"
            r"\s*[:\-]\s*(.+)$",
            re.IGNORECASE,
        )

        section_headers = {
            "DỰ ÁN", "PROJECTS",
            "KĨ NĂNG", "KỸ NĂNG", "SKILLS",
            "HỌC VẤN", "EDUCATION",
            "KINH NGHIỆM", "EXPERIENCE",
            "LIÊN HỆ", "CONTACT",
            "LẬP TRÌNH", "CÔNG NGHỆ VÀ CÔNG CỤ",
            "KỸ NĂNG MỀM",
            "PYTHON", "JAVA", "C/C++",
            "JAVASCRIPT / TYPESCRIPT",
        }

        role_indexes = [
            index
            for index, line in enumerate(lines)
            if role_pattern.match(line)
        ]

        for position, role_index in enumerate(role_indexes):
            if role_index == 0:
                continue

            title = lines[role_index - 1]

            if title.upper() in section_headers:
                continue

            role_match = role_pattern.match(lines[role_index])
            role = role_match.group(1).strip() if role_match else None

            technology_index = role_index + 1
            if technology_index >= len(lines):
                continue

            technology_match = technology_pattern.match(
                lines[technology_index]
            )

            if not technology_match:
                continue

            technologies = [
                item.strip()
                for item in technology_match.group(1).split(",")
                if item.strip()
            ]

            # Dừng trước tên dự án tiếp theo.
            next_role_index = (
                role_indexes[position + 1]
                if position + 1 < len(role_indexes)
                else len(lines)
            )

            description_end = next_role_index - 1

            description_lines = []

            for line in lines[technology_index + 1:description_end]:
                if line.upper() in section_headers:
                    break

                if technology_pattern.match(line):
                    break

                description_lines.append(line)

            description = " ".join(description_lines).strip() or None

            projects.append(
                ProjectItem(
                    title=title,
                    role=role,
                    technologies=technologies,
                    description=description,
                )
            )

        return projects


    @staticmethod
    def parse_text(text: str, filename: str) -> CVExtractionResponse:
        email = _EMAIL.search(text)
        phone = _PHONE.search(text)

        skills = [
            CandidateSkill(name=s, category=category_of(s))
            for s in extract_skills(text)
        ]

        education = CVService._extract_education(text)
        projects = CVService._extract_projects(text)

        warnings: List[str] = []

        if not education:
            warnings.append("Chưa nhận diện được thông tin học vấn.")

        if not projects:
            warnings.append("Chưa nhận diện được dự án trong CV.")

        warnings.append("Chưa nhận diện được kinh nghiệm làm việc.")

        if not skills:
            warnings.append(
                "Không nhận diện được kỹ năng nào trong Skill Taxonomy."
            )

        return CVExtractionResponse(
            full_name=CVService._guess_name(text),
            email=email.group(0) if email else None,
            phone=re.sub(r"[\s.-]", "", phone.group(0)) if phone else None,
            education=education,
            projects=projects,
            skills=skills,
            raw_summary=f"Đã đọc {len(text)} ký tự từ file {filename}.",
            is_mock=True,
            warnings=warnings,
        )


    @staticmethod
    async def _extract_with_gemini(text: str) -> Dict[str, Any]:
        """
        Gửi nội dung CV đến Gemini và nhận dữ liệu JSON.
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
        """
        try:
            return CVExtractionResponse.model_validate({
                "full_name": data.get("full_name"),
                "email": data.get("email"),
                "phone": data.get("phone"),
                "education": data.get("education", []),
                "projects": data.get("projects", []),
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
            # Chỉ giữ kỹ năng được nhận diện trực tiếp từ nội dung CV

            skills = fallback.skills

            return ai_result.model_copy(update={
                "full_name": fallback.full_name or ai_result.full_name,
                "email": fallback.email or ai_result.email,
                "phone": fallback.phone or ai_result.phone,
                "skills": skills,
                "projects": ai_result.projects or fallback.projects,
                "raw_summary": (
                    f"Đã đọc {len(text)} ký tự từ file {filename} "
                    "và trích xuất bằng Gemini."
                ),
                "is_mock": False,
                "warnings": [
                    *ai_result.warnings,
                    *[
                        warning
                        for warning in fallback.warnings
                        if "Skill Taxonomy" in warning
                    ],
                ],
            })

        except LLMError as exc:
            # Gemini không khả dụng: giữ nguyên chức năng trích xuất cũ
            fallback = CVService.parse_text(text, filename)
            fallback.warnings.append(
                f"Không thể sử dụng Gemini; hệ thống chuyển sang trích xuất dự phòng. Chi tiết: {exc}"
            )
            return fallback



cv_service = CVService()
