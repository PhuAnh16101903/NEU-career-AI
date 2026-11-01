from typing import Literal, Optional

from pydantic import BaseModel, Field

ActorRole = Literal["student", "enterprise", "admin"]


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, examples=["phu@st.neu.edu.vn"])
    password: str = Field(..., min_length=6, examples=["123456"])
    full_name: str = Field(..., min_length=1, examples=["Lê Thiên Phú"])
    role: Literal["student", "enterprise"] = Field(
        "student",
        description="Vai trò đăng ký: `student` (Sinh viên NEU) hoặc `enterprise` (Doanh nghiệp).",
    )
    company_name: Optional[str] = Field(
        None,
        description="Tên công ty (bắt buộc nếu đăng ký vai trò `enterprise`).",
        examples=["FPT Software"],
    )
    student_major: Optional[str] = Field(
        None,
        description="Chuyên ngành tại NEU (dành cho `student`).",
        examples=["Hệ thống thông tin quản lý"],
    )


class LoginRequest(BaseModel):
    email: str = Field(..., examples=["phu@st.neu.edu.vn"])
    password: str = Field(..., examples=["123456"])


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: ActorRole
    company_name: Optional[str] = None
    student_major: Optional[str] = None
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
