from typing import Optional

from fastapi import APIRouter, Query

from app.schemas.curriculum import CurriculumListResponse
from app.services.curriculum_service import curriculum_service

router = APIRouter(prefix="/curriculum", tags=["Chương trình đào tạo NEU"])


@router.get(
    "",
    response_model=CurriculumListResponse,
    summary="Lấy danh mục các môn học của NEU (hỗ trợ lọc theo từ khóa q và chuyên ngành major)",
)
async def get_neu_curriculum(
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo mã môn, tên môn hoặc kỹ năng"),
    major: Optional[str] = Query(None, description="Lọc theo tên chuyên ngành / khoa viện"),
):
    courses = curriculum_service.get_all_courses(q=q, major=major)
    return CurriculumListResponse(total=len(courses), courses=courses)
