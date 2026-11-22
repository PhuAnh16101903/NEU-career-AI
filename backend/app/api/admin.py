from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models import AIUsageLog, User
from app.schemas.admin import (
    AIUsageFeatureStats,
    AIUsageLogListResponse,
    AIUsageLogResponse,
    AIUsageStatsResponse,
    JobModerationRequest,
    SystemStatsResponse,
    UserStatusUpdateRequest,
)
from app.schemas.auth import ActorRole, UserOut
from app.schemas.enterprise import JobPostingOut
from app.services.admin_service import admin_service
from app.services.enterprise_service import enterprise_service

router = APIRouter(prefix="/admin", tags=["Quản trị Hệ thống (Admin)"])


@router.get(
    "/stats",
    response_model=SystemStatsResponse,
    summary="[Quyền: admin] Thống kê tổng quan toàn hệ thống (Sinh viên, Doanh nghiệp, Tin tuyển dụng, Phỏng vấn)",
)
def get_admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    return admin_service.get_system_stats(db)


@router.get(
    "/jobs",
    response_model=List[JobPostingOut],
    summary="[Quyền: admin] Xem toàn bộ tin tuyển dụng",
)
def list_all_jobs(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    return enterprise_service.list_jobs(db, status_filter=None)


@router.get(
    "/users",
    response_model=List[UserOut],
    summary="[Quyền: admin] Xem danh sách toàn bộ tài khoản người dùng (hỗ trợ lọc theo role)",
)
def list_all_users(
    role: Optional[ActorRole] = Query(None, description="Lọc theo vai trò: student, enterprise, admin"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    return admin_service.list_users(db, role=role)


@router.patch(
    "/users/{user_id}/status",
    response_model=UserOut,
    summary="[Quyền: admin] Khóa hoặc mở khóa tài khoản Sinh viên / Doanh nghiệp",
)
def update_user_active_status(
    user_id: str,
    request: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("admin")),
):
    return admin_service.update_user_status(db, admin_user, user_id, request)


@router.patch(
    "/jobs/{job_id}/status",
    response_model=JobPostingOut,
    summary="[Quyền: admin] Kiểm duyệt (approved / rejected) tin tuyển dụng của Doanh nghiệp",
)
def moderate_enterprise_job(
    job_id: str,
    request: JobModerationRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    return admin_service.moderate_job(db, job_id, request)


@router.get(
    "/ai-usage/stats",
    response_model=AIUsageStatsResponse,
    summary="[Quyền: admin] Thống kê tổng quan sử dụng AI",
)
def get_ai_usage_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    total_requests = db.query(func.count(AIUsageLog.id)).scalar() or 0

    successful_requests = (
        db.query(func.count(AIUsageLog.id))
        .filter(AIUsageLog.status == "success")
        .scalar()
        or 0
    )

    failed_requests = (
        db.query(func.count(AIUsageLog.id))
        .filter(AIUsageLog.status == "failed")
        .scalar()
        or 0
    )

    prompt_tokens = (
        db.query(func.coalesce(func.sum(AIUsageLog.prompt_tokens), 0)).scalar()
    )

    completion_tokens = (
        db.query(func.coalesce(func.sum(AIUsageLog.completion_tokens), 0)).scalar()
    )

    total_tokens = (
        db.query(func.coalesce(func.sum(AIUsageLog.total_tokens), 0)).scalar()
    )

    average_latency = (
        db.query(func.avg(AIUsageLog.latency_ms))
        .filter(AIUsageLog.latency_ms.isnot(None))
        .scalar()
    )

    success_rate = (
        successful_requests / total_requests * 100
        if total_requests > 0
        else 0.0
    )

    return AIUsageStatsResponse(
        total_requests=total_requests,
        successful_requests=successful_requests,
        failed_requests=failed_requests,
        success_rate=round(success_rate, 2),
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        average_latency_ms=(
            round(average_latency, 2)
            if average_latency is not None
            else None
        ),
        estimated_cost_usd=None,
    )



@router.get(
    "/ai-usage/by-feature",
    response_model=List[AIUsageFeatureStats],
    summary="[Quyền: admin] Thống kê sử dụng AI theo chức năng",
)
def get_ai_usage_by_feature(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    rows = (
        db.query(
            AIUsageLog.feature.label("feature"),
            func.count(AIUsageLog.id).label("total_requests"),
            func.sum(
                case(
                    (AIUsageLog.status == "success", 1),
                    else_=0,
                )
            ).label("successful_requests"),
            func.sum(
                case(
                    (AIUsageLog.status == "failed", 1),
                    else_=0,
                )
            ).label("failed_requests"),
            func.coalesce(
                func.sum(AIUsageLog.total_tokens), 0
            ).label("total_tokens"),
            func.avg(AIUsageLog.latency_ms).label("average_latency_ms"),
        )
        .group_by(AIUsageLog.feature)
        .order_by(AIUsageLog.feature)
        .all()
    )

    return [
        AIUsageFeatureStats(
            feature=row.feature,
            total_requests=row.total_requests,
            successful_requests=row.successful_requests,
            failed_requests=row.failed_requests,
            total_tokens=row.total_tokens,
            average_latency_ms=(
                round(row.average_latency_ms, 2)
                if row.average_latency_ms is not None
                else None
            ),
        )
        for row in rows
    ]



@router.get(
    "/ai-usage/logs",
    response_model=AIUsageLogListResponse,
    summary="[Quyền: admin] Xem lịch sử sử dụng AI (có phân trang và bộ lọc)",
)
def get_ai_usage_logs(
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(
        10,
        ge=1,
        le=100,
        description="Số bản ghi mỗi trang (tối đa 100)",
    ),
    feature: Optional[str] = Query(
        None,
        description="Lọc theo chức năng: cv, matching, interview, career_advisor, general",
    ),
    status: Optional[str] = Query(
        None,
        pattern="^(success|failed)$",
        description="Lọc theo trạng thái: success hoặc failed",
    ),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    query = db.query(AIUsageLog)

    # Lọc theo chức năng
    if feature:
        query = query.filter(AIUsageLog.feature == feature)

    # Lọc theo trạng thái
    if status:
        query = query.filter(AIUsageLog.status == status)

    # Đếm tổng số bản ghi sau khi áp dụng bộ lọc
    total = query.count()

    # Lấy dữ liệu theo thứ tự mới nhất trước
    rows = (
        query.order_by(AIUsageLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        AIUsageLogResponse(
            id=str(row.id),
            provider=row.provider,
            model=row.model,
            feature=row.feature,
            status=row.status,
            prompt_tokens=row.prompt_tokens,
            completion_tokens=row.completion_tokens,
            total_tokens=row.total_tokens,
            latency_ms=row.latency_ms,
            cost_usd=row.cost_usd,
            error_type=row.error_type,
            created_at=row.created_at.isoformat(),
        )
        for row in rows
    ]

    return AIUsageLogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
