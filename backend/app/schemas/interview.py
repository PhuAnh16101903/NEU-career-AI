from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class StartInterviewRequest(BaseModel):
    candidate_name: str = Field(..., min_length=1, examples=["Lê Thiên Phú"])
    target_role: str = Field(..., min_length=1, examples=["Business Analyst"])
    interview_type: Literal["technical", "behavioral", "mixed"] = Field("mixed", examples=["mixed"])
    job_description_snippet: Optional[str] = Field(
        None, examples=["Yêu cầu bóc tách yêu cầu khách hàng, viết tài liệu BRD"]
    )


class ChatMessageRequest(BaseModel):
    session_id: str = Field(..., examples=["sess_a1b2c3d4"])
    user_answer: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        examples=["Trong dự án môn học, em đã phỏng vấn trực tiếp 10 bạn sinh viên để lấy yêu cầu."],
    )


class STAREvaluation(BaseModel):
    situation_score: int = Field(..., ge=0, le=10)
    task_score: int = Field(..., ge=0, le=10)
    action_score: int = Field(..., ge=0, le=10)
    result_score: int = Field(..., ge=0, le=10)
    feedback: str


class ChatMessageResponse(BaseModel):
    session_id: str
    turn_index: int = Field(..., examples=[1])
    interviewer_reply: str
    is_finished: bool = False
    current_evaluation: Optional[STAREvaluation] = None
    overall_summary: Optional[str] = None
    is_mock: bool = Field(True, description="True khi câu hỏi/điểm số chưa do AI thật sinh ra.")


class InterviewSessionDetailResponse(BaseModel):
    session_id: str
    candidate_name: str
    target_role: str
    turn_index: int
    is_finished: bool
    history: List[Dict[str, Any]]
    evaluations: List[STAREvaluation]
    created_at: datetime
