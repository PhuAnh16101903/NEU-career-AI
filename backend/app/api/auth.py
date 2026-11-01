from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth_service import auth_service, to_user_out

router = APIRouter(prefix="/auth", tags=["Xác thực & Phân quyền (3 Actor)"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=201,
    summary="Đăng ký tài khoản Sinh viên (student) hoặc Doanh nghiệp (enterprise)",
)
def register_account(request: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register(db, request)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Đăng nhập nhận Bearer Token (Mẫu: phu@st.neu.edu.vn / hr@fpt.com / admin@neu.edu.vn - MK: 123456)",
)
def login_account(request: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, request)


@router.get(
    "/me",
    response_model=UserOut,
    summary="Lấy thông tin tài khoản và vai trò (role) của người đang đăng nhập",
)
def get_me(current_user: User = Depends(get_current_user)):
    return to_user_out(current_user)
