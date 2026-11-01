from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.analysis import RecommendedCourse

JobStatus = Literal["pending", "approved", "rejected"]


class JobCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, examples=["Junior Data Analyst"])
    company_name: Optional[str] = Field(None, examples=["FPT Software"])
    description: str = Field(
        ...,
        min_length=10,
        examples=["Tuyển dụng Data Analyst thành thạo SQL, Python, Power BI và tư duy phân tích dữ liệu."],
    )
    required_skills: Optional[List[str]] = Field(
        None,
        description="Danh sách kỹ năng yêu cầu bổ sung (nếu để trống hệ thống tự trích xuất từ mô tả JD).",
        examples=[["SQL", "Python", "Power BI"]],
    )


class JobPostingOut(BaseModel):
    id: str
    enterprise_id: str
    title: str
    company_name: str
    description: str
    required_skills: List[str]
    status: JobStatus
    created_at: datetime


class JobApplyRequest(BaseModel):
    candidate_skills: List[str] = Field(
        ...,
        min_length=1,
        examples=[["Python", "SQL", "Excel"]],
        description="Danh sách kỹ năng hiện có của sinh viên (lấy từ CV hoặc nhập tay).",
    )


class JobApplicationOut(BaseModel):
    id: str
    job_id: str
    job_title: str
    company_name: str
    student_id: str
    student_name: str
    student_email: str
    candidate_skills: List[str]
    match_percentage: float
    matched_skills: List[str]
    missing_skills: List[str]
    recommended_neu_courses: List[RecommendedCourse] = []
    created_at: datetime
