import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import ServiceError
from app.data.skill_taxonomy import extract_skills, normalize_skill, role_requirements
from app.models import JobApplication, JobPosting, User
from app.schemas.analysis import RecommendedCourse
from app.schemas.enterprise import (
    JobApplicationOut,
    JobApplyRequest,
    JobCreateRequest,
    JobPostingOut,
)
from app.services.curriculum_service import curriculum_service


def _to_job_out(job: JobPosting) -> JobPostingOut:
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


class EnterpriseService:
    @staticmethod
    def list_jobs(
        db: Session,
        status_filter: Optional[str] = "approved",
        q: Optional[str] = None,
    ) -> List[JobPostingOut]:
        stmt = select(JobPosting).order_by(JobPosting.created_at.desc())
        if status_filter:
            stmt = stmt.where(JobPosting.status == status_filter)
        jobs = list(db.scalars(stmt).all())
        if q and q.strip():
            kw = q.strip().lower()
            jobs = [
                j
                for j in jobs
                if kw in j.title.lower()
                or kw in j.company_name.lower()
                or kw in j.description.lower()
                or any(kw in s.lower() for s in (j.required_skills or []))
            ]
        return [_to_job_out(j) for j in jobs]

    @staticmethod
    def create_job(db: Session, current_user: User, req: JobCreateRequest) -> JobPostingOut:
        company = (req.company_name or current_user.company_name or "").strip()
        if not company:
            raise ServiceError(422, "Vui lòng cung cấp tên doanh nghiệp (company_name)")

        # Tự động trích xuất kỹ năng chuẩn từ nội dung JD + kết hợp kỹ năng doanh nghiệp nhập thêm
        skills = list(extract_skills(req.description))
        for raw in req.required_skills or []:
            canonical = normalize_skill(raw)
            if canonical and canonical not in skills:
                skills.append(canonical)
            else:
                for extracted in extract_skills(raw):
                    if extracted not in skills:
                        skills.append(extracted)

        if not skills:
            preset = role_requirements(req.title)
            if preset:
                skills = list(preset)

        if not skills:
            raise ServiceError(
                422,
                "Không nhận diện được kỹ năng chuẩn nào trong mô tả JD. "
                "Vui lòng bổ sung kỹ năng cụ thể (ví dụ: SQL, Python, Power BI, Business Analysis...).",
            )

        job = JobPosting(
            id=f"job_{uuid.uuid4().hex[:10]}",
            enterprise_id=current_user.id,
            title=req.title.strip(),
            company_name=company,
            description=req.description.strip(),
            required_skills=skills,
            status="approved",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return _to_job_out(job)

    @staticmethod
    def delete_job(db: Session, current_user: User, job_id: str) -> dict:
        job = db.get(JobPosting, job_id)
        if job is None:
            raise ServiceError(404, f"Không tìm thấy tin tuyển dụng '{job_id}'")
        if current_user.role != "admin" and job.enterprise_id != current_user.id:
            raise ServiceError(403, "Bạn chỉ có quyền xóa tin tuyển dụng do doanh nghiệp của mình đăng")

        # Xóa dây chuyền các hồ sơ ứng tuyển của tin tuyển dụng này tránh dữ liệu mồ côi
        db.execute(delete(JobApplication).where(JobApplication.job_id == job_id))
        db.delete(job)
        db.commit()
        return {"message": f"Đã xóa tin tuyển dụng '{job.title}' ({job_id})"}

    @staticmethod
    def apply_to_job(
        db: Session, student: User, job_id: str, req: JobApplyRequest
    ) -> JobApplicationOut:
        job = db.get(JobPosting, job_id)
        if job is None:
            raise ServiceError(404, f"Không tìm thấy tin tuyển dụng '{job_id}'")
        if job.status != "approved":
            raise ServiceError(400, "Tin tuyển dụng này hiện chưa mở nhận hồ sơ")

        candidate_set = set()
        for raw in req.candidate_skills:
            canonical = normalize_skill(raw)
            if canonical:
                candidate_set.add(canonical)
            else:
                candidate_set.update(extract_skills(raw))

        required = list(job.required_skills or [])
        matched = [s for s in required if s in candidate_set]
        missing = [s for s in required if s not in candidate_set]
        match_pct = round(len(matched) / len(required) * 100, 1) if required else 100.0

        recommended = [
            RecommendedCourse(
                course_code=course.code,
                course_name=course.name,
                department=course.major,
                credits=course.credits,
                skills_covered=covered,
                reason=f"Bù kỹ năng ứng tuyển vào {job.company_name}: {', '.join(covered)}",
            )
            for course, covered in curriculum_service.find_courses_for_skills(missing)
        ]

        # Chống trùng lặp đơn ứng tuyển: nếu sinh viên đã nộp vào job_id này thì cập nhật lại
        existing = db.scalar(
            select(JobApplication).where(
                JobApplication.job_id == job.id,
                JobApplication.student_id == student.id,
            )
        )
        if existing is not None:
            existing.candidate_skills = sorted(candidate_set)
            existing.match_percentage = match_pct
            existing.matched_skills = matched
            existing.missing_skills = missing
            existing.created_at = datetime.now(timezone.utc)
            app_record = existing
        else:
            app_record = JobApplication(
                id=f"app_{uuid.uuid4().hex[:10]}",
                job_id=job.id,
                student_id=student.id,
                student_name=student.full_name,
                student_email=student.email,
                candidate_skills=sorted(candidate_set),
                match_percentage=match_pct,
                matched_skills=matched,
                missing_skills=missing,
            )
            db.add(app_record)

        db.commit()
        db.refresh(app_record)

        return JobApplicationOut(
            id=app_record.id,
            job_id=job.id,
            job_title=job.title,
            company_name=job.company_name,
            student_id=student.id,
            student_name=student.full_name,
            student_email=student.email,
            candidate_skills=app_record.candidate_skills,
            match_percentage=app_record.match_percentage,
            matched_skills=app_record.matched_skills,
            missing_skills=app_record.missing_skills,
            recommended_neu_courses=recommended,
            created_at=app_record.created_at,
        )

    @staticmethod
    def list_student_applications(db: Session, student: User) -> List[JobApplicationOut]:
        stmt = (
            select(JobApplication)
            .where(JobApplication.student_id == student.id)
            .order_by(JobApplication.created_at.desc())
        )
        apps = db.scalars(stmt).all()
        results: List[JobApplicationOut] = []
        for a in apps:
            job = db.get(JobPosting, a.job_id)
            missing = list(a.missing_skills or [])
            recommended = [
                RecommendedCourse(
                    course_code=course.code,
                    course_name=course.name,
                    department=course.major,
                    credits=course.credits,
                    skills_covered=covered,
                    reason=f"Bù kỹ năng còn thiếu: {', '.join(covered)}",
                )
                for course, covered in curriculum_service.find_courses_for_skills(missing)
            ]
            results.append(
                JobApplicationOut(
                    id=a.id,
                    job_id=a.job_id,
                    job_title=job.title if job else "Tin tuyển dụng đã đóng",
                    company_name=job.company_name if job else "",
                    student_id=a.student_id,
                    student_name=a.student_name,
                    student_email=a.student_email,
                    candidate_skills=list(a.candidate_skills or []),
                    match_percentage=a.match_percentage,
                    matched_skills=list(a.matched_skills or []),
                    missing_skills=missing,
                    recommended_neu_courses=recommended,
                    created_at=a.created_at,
                )
            )
        return results

    @staticmethod
    def list_job_candidates(
        db: Session, current_user: User, job_id: str
    ) -> List[JobApplicationOut]:
        job = db.get(JobPosting, job_id)
        if job is None:
            raise ServiceError(404, f"Không tìm thấy tin tuyển dụng '{job_id}'")
        if current_user.role != "admin" and job.enterprise_id != current_user.id:
            raise ServiceError(
                403, "Bạn chỉ được xem danh sách ứng viên của tin tuyển dụng thuộc doanh nghiệp mình"
            )

        stmt = (
            select(JobApplication)
            .where(JobApplication.job_id == job_id)
            .order_by(JobApplication.match_percentage.desc(), JobApplication.created_at.desc())
        )
        apps = db.scalars(stmt).all()
        return [
            JobApplicationOut(
                id=a.id,
                job_id=job.id,
                job_title=job.title,
                company_name=job.company_name,
                student_id=a.student_id,
                student_name=a.student_name,
                student_email=a.student_email,
                candidate_skills=list(a.candidate_skills or []),
                match_percentage=a.match_percentage,
                matched_skills=list(a.matched_skills or []),
                missing_skills=list(a.missing_skills or []),
                recommended_neu_courses=[],
                created_at=a.created_at,
            )
            for a in apps
        ]


enterprise_service = EnterpriseService()
