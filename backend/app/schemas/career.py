from typing import List, Optional

from pydantic import BaseModel, Field


class CareerAdvisorRequest(BaseModel):
    """Thông tin đầu vào để tư vấn định hướng nghề nghiệp."""

    skills: List[str] = Field(
        default_factory=list,
        description="Danh sách kỹ năng lấy từ CV hoặc nhập thủ công.",
    )
    major: Optional[str] = Field(None, description="Ngành học của sinh viên.")
    study_year: Optional[int] = Field(
        None, ge=1, le=6, description="Năm học hiện tại."
    )
    interests: List[str] = Field(
        default_factory=list,
        description="Lĩnh vực nghề nghiệp sinh viên quan tâm.",
    )
    career_goals: Optional[str] = Field(
        None, description="Mục tiêu nghề nghiệp."
    )
    education: List[str] = Field(
        default_factory=list,
        description="Thông tin học vấn liên quan."
    )
    experiences: List[str] = Field(
        default_factory=list,
        description="Kinh nghiệm học tập, làm việc và dự án."
    )


class CareerRecommendation(BaseModel):
    """Một hướng nghề nghiệp được đề xuất."""

    job_title: str
    suitability_reason: str
    required_skills: List[str] = Field(default_factory=list)
    skills_to_develop: List[str] = Field(default_factory=list)


class CareerAdvisorResponse(BaseModel):
    """Kết quả tư vấn định hướng nghề nghiệp."""

    career_profile: str
    career_recommendations: List[CareerRecommendation] = Field(
        default_factory=list
    )
    skill_development: List[str] = Field(default_factory=list)
    learning_roadmap: List[str] = Field(default_factory=list)
    recommended_courses: List[str] = Field(default_factory=list)
    general_advice: str
    is_mock: bool = True