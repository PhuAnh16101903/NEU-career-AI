from typing import List

from pydantic import BaseModel, Field


class CourseItem(BaseModel):
    id: str = Field(..., examples=["neu_01"])
    code: str = Field(..., examples=["THVP1102"])
    name: str = Field(..., examples=["Khai phá dữ liệu trong kinh doanh"])
    credits: int = Field(..., examples=[3])
    major: str = Field(..., examples=["Hệ thống thông tin quản lý"])
    description: str
    skills_provided: List[str] = Field(
        ..., description="Tên kỹ năng chuẩn trong Skill Taxonomy", examples=[["SQL", "Power BI"]]
    )


class CurriculumListResponse(BaseModel):
    total: int
    courses: List[CourseItem]
