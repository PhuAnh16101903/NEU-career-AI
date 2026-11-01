from fastapi import APIRouter
from app.schemas.analysis import SkillGapRequest, SkillGapResponse
from app.services.matching_service import matching_service

router = APIRouter(prefix="/analysis", tags=["So khớp Kỹ năng & Môn học NEU"])

@router.post("/match", response_model=SkillGapResponse, summary="Tính toán Skill Gap & Gợi ý môn học NEU")
async def analyze_match(request: SkillGapRequest):
    return await matching_service.analyze_skill_gap(request)
