import re
import uuid
from typing import List

from sqlalchemy.orm import Session

from app.core.errors import ServiceError
from app.models import InterviewSession
from app.schemas.interview import (
    ChatMessageRequest,
    ChatMessageResponse,
    InterviewSessionDetailResponse,
    StartInterviewRequest,
    STAREvaluation,
)

FOLLOW_UP_QUESTIONS: List[str] = [
    "Bạn hãy kể về một dự án thực tế bạn từng làm, khó khăn lớn nhất gặp phải và cách bạn đã vượt qua nó?",
    "Nếu trong nhóm xảy ra bất đồng ý kiến về giải pháp kỹ thuật, bạn sẽ xử lý như thế nào?",
    "Lộ trình phát triển nghề nghiệp của bạn trong 2 năm tới sau khi tốt nghiệp là gì?",
]

# Từ khóa gợi ý từng thành phần STAR trong câu trả lời (heuristic tạm thời).
_STAR_CUES = {
    "situation": ["khi ", "trong dự án", "hồi ", "lúc ", "bối cảnh", "tình huống", "năm ", "tại "],
    "task": ["nhiệm vụ", "phụ trách", "chịu trách nhiệm", "mục tiêu", "vai trò", "được giao"],
    "action": ["em đã", "tôi đã", "mình đã", "thực hiện", "xây dựng", "triển khai", "phân tích", "đề xuất", "áp dụng"],
    "result": ["kết quả", "đạt ", "giảm", "tăng", "hoàn thành", "tiết kiệm", "thành công"],
}
_STAR_TIPS = {
    "situation": "Nêu rõ bối cảnh/tình huống cụ thể (ở đâu, khi nào).",
    "task": "Làm rõ nhiệm vụ và vai trò riêng của bạn.",
    "action": "Mô tả cụ thể bạn đã làm gì, theo từng bước.",
    "result": "Nêu kết quả, ưu tiên số liệu đo lường được.",
}


def evaluate_star(answer: str) -> STAREvaluation:
    """
    Chấm STAR theo heuristic (độ dài + từ khóa), để kết quả phụ thuộc vào câu trả lời thật.
    TODO (nhóm AI): thay bằng LLM với prompt `star_interview_agent` và rubric chi tiết.
    """
    text = answer.lower()
    length_factor = min(len(answer.split()) / 60, 1.0)
    scores = {}
    for dimension, cues in _STAR_CUES.items():
        hits = sum(1 for cue in cues if cue in text)
        if dimension == "result" and re.search(r"\d", text):
            hits += 1
        scores[dimension] = min(10, 2 + round(3 * length_factor) + 3 * min(hits, 2))

    weak = [_STAR_TIPS[d] for d, s in scores.items() if s <= 4]
    feedback = " ".join(weak) if weak else "Câu trả lời đủ các thành phần STAR, hãy bổ sung thêm số liệu cụ thể."
    return STAREvaluation(
        situation_score=scores["situation"],
        task_score=scores["task"],
        action_score=scores["action"],
        result_score=scores["result"],
        feedback=feedback,
    )


class InterviewService:
    @staticmethod
    def start_session(db: Session, req: StartInterviewRequest) -> ChatMessageResponse:
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        first_question = (
            f"Chào {req.candidate_name}! Tôi là AI mô phỏng nhà tuyển dụng cho vị trí {req.target_role}. "
            f"Bạn hãy giới thiệu ngắn gọn về bản thân và lý do bạn quan tâm đến vị trí này?"
        )
        db.add(
            InterviewSession(
                id=session_id,
                candidate_name=req.candidate_name,
                target_role=req.target_role,
                turn_index=1,
                is_finished=False,
                history=[{"role": "assistant", "content": first_question}],
                evaluations=[],
            )
        )
        db.commit()
        return ChatMessageResponse(
            session_id=session_id, turn_index=1, interviewer_reply=first_question, is_finished=False
        )

    @staticmethod
    def get_session(db: Session, session_id: str) -> InterviewSessionDetailResponse:
        session = db.get(InterviewSession, session_id)
        if session is None:
            raise ServiceError(404, f"Không tìm thấy phiên phỏng vấn '{session_id}'")
        return InterviewSessionDetailResponse(
            session_id=session.id,
            candidate_name=session.candidate_name,
            target_role=session.target_role,
            turn_index=session.turn_index,
            is_finished=session.is_finished,
            history=list(session.history or []),
            evaluations=[STAREvaluation(**e) for e in (session.evaluations or [])],
            created_at=session.created_at,
        )

    @staticmethod
    def handle_chat(db: Session, req: ChatMessageRequest) -> ChatMessageResponse:
        """
        TODO (nhóm AI): thay phần chọn câu hỏi bằng agent LLM (prompt `star_interview_agent`)
        có sinh câu hỏi đào sâu dựa trên câu trả lời. Khung lưu phiên và API giữ nguyên.
        """
        session = db.get(InterviewSession, req.session_id)
        if session is None:
            raise ServiceError(404, f"Không tìm thấy phiên phỏng vấn '{req.session_id}'")
        if session.is_finished:
            raise ServiceError(409, "Phiên phỏng vấn đã kết thúc, hãy bắt đầu phiên mới.")

        evaluation = evaluate_star(req.user_answer)
        history = [*session.history, {"role": "user", "content": req.user_answer}]
        evaluations = [*session.evaluations, evaluation.model_dump()]

        turn = session.turn_index
        summary = None
        if turn <= len(FOLLOW_UP_QUESTIONS):
            reply = f"Cảm ơn câu trả lời của bạn. Câu hỏi tiếp theo:\n{FOLLOW_UP_QUESTIONS[turn - 1]}"
            session.turn_index = turn + 1
            finished = False
        else:
            reply = "Buổi phỏng vấn mô phỏng đã hoàn thành! Cảm ơn bạn đã tham gia."
            finished = True
            session.is_finished = True
            all_scores = [
                e[key]
                for e in evaluations
                for key in ("situation_score", "task_score", "action_score", "result_score")
            ]
            summary = f"Điểm STAR trung bình qua {len(evaluations)} câu trả lời: {sum(all_scores) / len(all_scores):.1f}/10."

        history.append({"role": "assistant", "content": reply})
        session.history = history
        session.evaluations = evaluations
        db.commit()

        return ChatMessageResponse(
            session_id=session.id,
            turn_index=session.turn_index,
            interviewer_reply=reply,
            is_finished=finished,
            current_evaluation=evaluation,
            overall_summary=summary,
        )


interview_service = InterviewService()
