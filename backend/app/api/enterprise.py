from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models import User
from app.schemas.enterprise import (
    JobApplicationOut,
    JobApplyRequest,
    JobCreateRequest,
    JobPostingOut,
)
from app.services.enterprise_service import enterprise_service

router = APIRouter(prefix="/enterprise", tags=["Doanh nghiệp & Tuyển dụng"])


@router.get(
    "/jobs",
    response_model=List[JobPostingOut],
    summary="Danh sách tin tuyển dụng đã được duyệt (hỗ trợ tìm kiếm theo từ khóa q)",
)
def list_approved_jobs(
    q: Optional[str] = Query(None, description="Từ khóa tìm theo vị trí, tên công ty hoặc kỹ năng"),
    db: Session = Depends(get_db),
):
    return enterprise_service.list_jobs(db, status_filter="approved", q=q)


@router.post(
    "/jobs",
    response_model=JobPostingOut,
    status_code=201,
    summary="[Quyền: enterprise, admin] Doanh nghiệp đăng tin tuyển dụng mới (tự động trích kỹ năng từ JD)",
)
def create_job_posting(
    request: JobCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("enterprise", "admin")),
):
    return enterprise_service.create_job(db, current_user, request)


@router.delete(
    "/jobs/{job_id}",
    summary="[Quyền: enterprise sở hữu, admin] Xóa tin tuyển dụng",
)
def delete_job_posting(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("enterprise", "admin")),
):
    return enterprise_service.delete_job(db, current_user, job_id)


@router.post(
    "/jobs/{job_id}/apply",
    response_model=JobApplicationOut,
    status_code=201,
    summary="[Quyền: student] Sinh viên nộp hồ sơ vào tin tuyển dụng (tự động chấm % độ khớp & gợi ý môn NEU)",
)
def apply_to_enterprise_job(
    job_id: str,
    request: JobApplyRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_roles("student")),
):
    return enterprise_service.apply_to_job(db, student, job_id, request)


@router.get(
    "/my-applications",
    response_model=List[JobApplicationOut],
    summary="[Quyền: student] Xem lịch sử các công việc Sinh viên đã ứng tuyển",
)
def get_my_applications(
    db: Session = Depends(get_db),
    student: User = Depends(require_roles("student")),
):
    return enterprise_service.list_student_applications(db, student)


@router.get(
    "/jobs/{job_id}/candidates",
    response_model=List[JobApplicationOut],
    summary="[Quyền: enterprise sở hữu, admin] Xem danh sách Sinh viên ứng tuyển xếp hạng theo % độ khớp",
)
def list_candidates_for_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("enterprise", "admin")),
):
    return enterprise_service.list_job_candidates(db, current_user, job_id)
