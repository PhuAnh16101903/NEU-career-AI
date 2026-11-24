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



from typing import List, Optional

from pydantic import BaseModel


class AIUsageStatsResponse(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

    average_latency_ms: Optional[float] = None
    estimated_cost_usd: Optional[float] = None


class AIUsageFeatureStats(BaseModel):
    feature: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_tokens: int
    average_latency_ms: Optional[float] = None


class AIUsageLogResponse(BaseModel):
    id: str
    provider: str
    model: str
    feature: str
    status: str

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

    latency_ms: Optional[float] = None
    cost_usd: Optional[float] = None
    error_type: Optional[str] = None
    created_at: str


class AIUsageLogListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AIUsageLogResponse]
