from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.interview import (
    ChatMessageRequest,
    ChatMessageResponse,
    InterviewSessionDetailResponse,
    StartInterviewRequest,
)
from app.services.interview_service import interview_service

router = APIRouter(prefix="/interview", tags=["Phỏng vấn thử & Chấm điểm STAR"])


@router.post("/start", response_model=ChatMessageResponse, summary="Khởi tạo phiên phỏng vấn mới")
def start_interview(request: StartInterviewRequest, db: Session = Depends(get_db)):
    return interview_service.start_session(db, request)


@router.get(
    "/{session_id}",
    response_model=InterviewSessionDetailResponse,
    summary="Lấy lại lịch sử hội thoại và bảng điểm STAR của một phiên phỏng vấn",
)
def get_interview_session(session_id: str, db: Session = Depends(get_db)):
    return interview_service.get_session(db, session_id)


@router.post(
    "/chat",
    response_model=ChatMessageResponse,
    summary="Gửi câu trả lời và nhận câu hỏi tiếp theo + điểm STAR",
)
async def chat_interview(request: ChatMessageRequest, db: Session = Depends(get_db)):
    return await interview_service.handle_chat(db, request)
