from typing import List, Optional

from pydantic import BaseModel, Field


class CandidateSkill(BaseModel):
    name: str = Field(..., examples=["Python"])
    category: str = Field(..., examples=["Kỹ năng chuyên môn"])
    level: Optional[str] = Field(None, examples=["Intermediate"])


class EducationItem(BaseModel):
    institution: str = Field(..., examples=["Đại học Kinh tế Quốc dân"])
    major: str = Field(..., examples=["Hệ thống thông tin quản lý"])
    gpa: Optional[float] = Field(None, examples=[3.5])
    graduation_year: Optional[int] = Field(None, examples=[2025])


class ExperienceItem(BaseModel):
    title: str = Field(..., examples=["Thực tập sinh Phân tích Dữ liệu"])
    company: str = Field(..., examples=["FPT Software"])
    duration: Optional[str] = Field(None, examples=["6 tháng"])
    description: Optional[str] = Field(None, examples=["Phân tích dữ liệu bằng SQL và Power BI"])


class CVExtractionResponse(BaseModel):
    full_name: Optional[str] = Field(None, examples=["Lê Thiên Phú"])
    email: Optional[str] = Field(None, examples=["phu@st.neu.edu.vn"])
    phone: Optional[str] = Field(None, examples=["0912345678"])
    education: List[EducationItem] = []
    skills: List[CandidateSkill] = []
    experiences: List[ExperienceItem] = []
    raw_summary: Optional[str] = Field(None, description="Tóm tắt ngắn về quá trình đọc file")
    is_mock: bool = Field(
        True,
        description="True khi một phần kết quả (học vấn, kinh nghiệm) chưa được bóc tách thật và để trống.",
    )
    warnings: List[str] = Field(default_factory=list, description="Các phần chưa trích xuất được")
