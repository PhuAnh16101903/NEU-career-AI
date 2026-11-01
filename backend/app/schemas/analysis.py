from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class SkillGapRequest(BaseModel):
    job_title: str = Field(..., min_length=1, examples=["Junior Data Analyst"])
    target_job_description: Optional[str] = Field(
        None,
        description="Nội dung JD. Nếu có, yêu cầu được trích từ JD; nếu không, dùng bộ yêu cầu mặc định theo vị trí.",
        examples=["Yêu cầu thành thạo SQL, Python, Power BI, tư duy logic"],
    )
    candidate_skills: List[str] = Field(..., examples=[["Python", "Excel", "Tiếng Anh giao tiếp"]])


class RadarSkillCategory(BaseModel):
    category_name: str = Field(..., examples=["Công cụ"])
    candidate_score: int = Field(..., ge=0, le=100, examples=[70])
    job_requirement_score: int = Field(..., ge=0, le=100, examples=[100])


class RecommendedCourse(BaseModel):
    course_code: str = Field(..., examples=["THVP1102"])
    course_name: str = Field(..., examples=["Khai phá dữ liệu trong kinh doanh"])
    department: str = Field(..., examples=["Hệ thống thông tin quản lý"])
    credits: int = Field(..., examples=[3])
    skills_covered: List[str] = Field(..., description="Chỉ các kỹ năng còn thiếu mà môn này bù được")
    reason: str


class SkillGapResponse(BaseModel):
    overall_match_percentage: float = Field(..., ge=0, le=100, examples=[72.5])
    requirements_source: Literal["job_description", "role_preset"]
    required_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    unrecognized_skills: List[str] = Field(
        default_factory=list,
        description="Kỹ năng ứng viên nhập nhưng chưa có trong Skill Taxonomy, không được tính điểm.",
    )
    radar_chart_data: List[RadarSkillCategory] = []
    recommended_neu_courses: List[RecommendedCourse] = []
    general_advice: str
