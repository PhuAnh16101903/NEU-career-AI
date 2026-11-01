from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """Bảng tài khoản người dùng hỗ trợ 3 Actor: `student`, `enterprise`, `admin`."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    # 3 Actor: "student" (Sinh viên NEU), "enterprise" (Doanh nghiệp), "admin" (Quản trị viên)
    role: Mapped[str] = mapped_column(String(32), index=True)
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    student_major: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class JobPosting(Base):
    """Bảng tin tuyển dụng (JD) do Actor Doanh nghiệp (`enterprise`) đăng tải."""

    __tablename__ = "job_postings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    enterprise_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    company_name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    # Danh sách kỹ năng chuẩn trích xuất từ JD qua Skill Taxonomy
    required_skills: Mapped[List[str]] = mapped_column(JSON, default=list)
    # Trạng thái kiểm duyệt của Admin: "pending" | "approved" | "rejected"
    status: Mapped[str] = mapped_column(String(32), default="approved", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class JobApplication(Base):
    """Bảng hồ sơ ứng tuyển của Actor Sinh viên (`student`) vào tin tuyển dụng của Doanh nghiệp."""

    __tablename__ = "job_applications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    job_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("job_postings.id", ondelete="CASCADE"), index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    student_name: Mapped[str] = mapped_column(String(255))
    student_email: Mapped[str] = mapped_column(String(255))
    candidate_skills: Mapped[List[str]] = mapped_column(JSON, default=list)
    match_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    matched_skills: Mapped[List[str]] = mapped_column(JSON, default=list)
    missing_skills: Mapped[List[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    candidate_name: Mapped[str] = mapped_column(String(255))
    target_role: Mapped[str] = mapped_column(String(255))
    turn_index: Mapped[int] = mapped_column(Integer, default=1)
    is_finished: Mapped[bool] = mapped_column(default=False)
    # Danh sách {"role": "assistant|user", "content": str}
    history: Mapped[List[Any]] = mapped_column(JSON, default=list)
    # Danh sách điểm STAR của từng câu trả lời
    evaluations: Mapped[List[Any]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
