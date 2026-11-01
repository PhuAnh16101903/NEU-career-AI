import re
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ServiceError
from app.core.security import create_access_token, hash_password, verify_password
from app.models import JobPosting, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut

_EMAIL_RE = re.compile(r"^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$")


def to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,  # type: ignore[arg-type]
        company_name=user.company_name,
        student_major=user.student_major,
        is_active=user.is_active,
    )


class AuthService:
    @staticmethod
    def register(db: Session, req: RegisterRequest) -> TokenResponse:
        email = req.email.strip().lower()
        if not _EMAIL_RE.match(email):
            raise ServiceError(422, "Địa chỉ email không đúng định dạng")

        existing = db.scalar(select(User).where(User.email == email))
        if existing is not None:
            raise ServiceError(409, f"Email '{email}' đã được đăng ký trong hệ thống")

        if req.role == "enterprise" and not (req.company_name and req.company_name.strip()):
            raise ServiceError(422, "Tài khoản Doanh nghiệp bắt buộc phải có tên công ty (company_name)")

        user = User(
            id=f"usr_{uuid.uuid4().hex[:10]}",
            email=email,
            password_hash=hash_password(req.password),
            full_name=req.full_name.strip(),
            role=req.role,
            company_name=req.company_name.strip() if req.company_name else None,
            student_major=req.student_major.strip() if req.student_major else None,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user_id=user.id, email=user.email, role=user.role)
        return TokenResponse(access_token=token, user=to_user_out(user))

    @staticmethod
    def login(db: Session, req: LoginRequest) -> TokenResponse:
        email = req.email.strip().lower()
        user = db.scalar(select(User).where(User.email == email))
        if user is None or not verify_password(req.password, user.password_hash):
            raise ServiceError(401, "Email hoặc mật khẩu không chính xác")
        if not user.is_active:
            raise ServiceError(403, "Tài khoản của bạn đã bị khóa bởi Quản trị viên")

        token = create_access_token(user_id=user.id, email=user.email, role=user.role)
        return TokenResponse(access_token=token, user=to_user_out(user))


def seed_initial_data(db: Session) -> None:
    """
    Khởi tạo sẵn 3 tài khoản mẫu đại diện cho 3 Actor (mật khẩu chung: 123456)
    và 2 tin tuyển dụng mẫu của Doanh nghiệp để phục vụ kiểm thử & demo.
    """
    sample_users = [
        User(
            id="usr_student_phu",
            email="phu@st.neu.edu.vn",
            password_hash=hash_password("123456", salt="neu_student_salt"),
            full_name="Lê Thiên Phú",
            role="student",
            student_major="Hệ thống thông tin quản lý",
            is_active=True,
        ),
        User(
            id="usr_enterprise_fpt",
            email="hr@fpt.com",
            password_hash=hash_password("123456", salt="neu_enterprise_salt"),
            full_name="Phòng Tuyển dụng FPT Software",
            role="enterprise",
            company_name="FPT Software",
            is_active=True,
        ),
        User(
            id="usr_admin_neu",
            email="admin@neu.edu.vn",
            password_hash=hash_password("123456", salt="neu_admin_salt"),
            full_name="Quản trị viên NEU Career AI",
            role="admin",
            is_active=True,
        ),
    ]

    for sample in sample_users:
        exists = db.scalar(select(User).where(User.email == sample.email))
        if exists is None:
            db.add(sample)

    sample_jobs = [
        JobPosting(
            id="job_fpt_da_01",
            enterprise_id="usr_enterprise_fpt",
            title="Junior Data Analyst",
            company_name="FPT Software",
            description=(
                "Tham gia dự án phân tích dữ liệu doanh nghiệp. Yêu cầu thành thạo SQL, Python, "
                "trực quan hóa với Power BI hoặc Tableau, nắm vững Thống kê và Excel."
            ),
            required_skills=["SQL", "Python", "Power BI", "Tableau", "Thống kê", "Excel"],
            status="approved",
        ),
        JobPosting(
            id="job_fpt_ba_02",
            enterprise_id="usr_enterprise_fpt",
            title="Business Analyst Intern",
            company_name="FPT Software",
            description=(
                "Hỗ trợ khảo sát nghiệp vụ khách hàng, phân tích yêu cầu, vẽ quy trình BPMN, "
                "viết tài liệu BRD và truy vấn SQL cơ bản."
            ),
            required_skills=["Business Analysis", "Phân tích yêu cầu", "BPMN", "Viết tài liệu BRD", "SQL"],
            status="approved",
        ),
    ]

    for job in sample_jobs:
        if db.get(JobPosting, job.id) is None:
            db.add(job)

    db.commit()


auth_service = AuthService()
