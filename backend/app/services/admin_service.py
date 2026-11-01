from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ServiceError
from app.models import InterviewSession, JobApplication, JobPosting, User
from app.schemas.admin import (
    JobModerationRequest,
    SystemStatsResponse,
    UserStatusUpdateRequest,
)
from app.schemas.auth import UserOut
from app.schemas.enterprise import JobPostingOut
from app.services.auth_service import to_user_out


class AdminService:
    @staticmethod
    def get_system_stats(db: Session) -> SystemStatsResponse:
        total_users = db.scalar(select(func.count()).select_from(User)) or 0
        total_students = (
            db.scalar(select(func.count()).select_from(User).where(User.role == "student")) or 0
        )
        total_enterprises = (
            db.scalar(select(func.count()).select_from(User).where(User.role == "enterprise")) or 0
        )
        total_admins = (
            db.scalar(select(func.count()).select_from(User).where(User.role == "admin")) or 0
        )
        total_jobs = db.scalar(select(func.count()).select_from(JobPosting)) or 0
        approved_jobs = (
            db.scalar(
                select(func.count()).select_from(JobPosting).where(JobPosting.status == "approved")
            )
            or 0
        )
        pending_jobs = (
            db.scalar(
                select(func.count()).select_from(JobPosting).where(JobPosting.status == "pending")
            )
            or 0
        )
        total_applications = db.scalar(select(func.count()).select_from(JobApplication)) or 0
        total_interviews = db.scalar(select(func.count()).select_from(InterviewSession)) or 0

        return SystemStatsResponse(
            total_users=total_users,
            total_students=total_students,
            total_enterprises=total_enterprises,
            total_admins=total_admins,
            total_jobs=total_jobs,
            approved_jobs=approved_jobs,
            pending_jobs=pending_jobs,
            total_applications=total_applications,
            total_interviews=total_interviews,
        )

    @staticmethod
    def list_users(db: Session, role: Optional[str] = None) -> List[UserOut]:
        stmt = select(User).order_by(User.created_at.asc())
        if role:
            stmt = stmt.where(User.role == role)
        users = db.scalars(stmt).all()
        return [to_user_out(u) for u in users]

    @staticmethod
    def update_user_status(
        db: Session, admin_user: User, target_user_id: str, req: UserStatusUpdateRequest
    ) -> UserOut:
        user = db.get(User, target_user_id)
        if user is None:
            raise ServiceError(404, f"Không tìm thấy người dùng '{target_user_id}'")
        if user.id == admin_user.id and not req.is_active:
            raise ServiceError(400, "Quản trị viên không thể tự khóa tài khoản của chính mình")

        user.is_active = req.is_active
        db.commit()
        db.refresh(user)
        return to_user_out(user)

    @staticmethod
    def moderate_job(db: Session, job_id: str, req: JobModerationRequest) -> JobPostingOut:
        job = db.get(JobPosting, job_id)
        if job is None:
            raise ServiceError(404, f"Không tìm thấy tin tuyển dụng '{job_id}'")

        job.status = req.status
        db.commit()
        db.refresh(job)
        return JobPostingOut(
            id=job.id,
            enterprise_id=job.enterprise_id,
            title=job.title,
            company_name=job.company_name,
            description=job.description,
            required_skills=list(job.required_skills or []),
            status=job.status,  # type: ignore[arg-type]
            created_at=job.created_at,
        )


admin_service = AdminService()
