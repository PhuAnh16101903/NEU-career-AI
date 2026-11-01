from typing import Literal

from pydantic import BaseModel, Field


class UserStatusUpdateRequest(BaseModel):
    is_active: bool = Field(..., description="True = mở khóa tài khoản, False = khóa tài khoản")


class JobModerationRequest(BaseModel):
    status: Literal["approved", "rejected"] = Field(
        ..., description="Trạng thái duyệt tin tuyển dụng của Doanh nghiệp"
    )


class SystemStatsResponse(BaseModel):
    total_users: int
    total_students: int
    total_enterprises: int
    total_admins: int
    total_jobs: int
    approved_jobs: int
    pending_jobs: int
    total_applications: int
    total_interviews: int
