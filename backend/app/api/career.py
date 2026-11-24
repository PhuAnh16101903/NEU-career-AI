from fastapi import APIRouter

from app.schemas.career import (
    CareerAdvisorRequest,
    CareerAdvisorResponse,
)
from app.services.career_advisor_service import career_advisor_service


router = APIRouter(
    prefix="/career",
    tags=["Career Advisor"],
)


@router.post(
    "/advisor",
    response_model=CareerAdvisorResponse,
    summary="Tư vấn định hướng nghề nghiệp",
)
async def career_advisor(
    request: CareerAdvisorRequest,
) -> CareerAdvisorResponse:
    """Phân tích hồ sơ và tư vấn hướng phát triển nghề nghiệp."""

    return await career_advisor_service.advise(request)