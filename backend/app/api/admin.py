from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models import User
from app.schemas.admin import (
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


@router.get("/jobs", response_model=List[JobPostingOut], summary="[Quyền: admin] Xem mọi tin tuyển dụng để kiểm duyệt")
def list_jobs_for_moderation(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    return enterprise_service.list_jobs(db, status_filter=None)
