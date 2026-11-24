import pytest
from unittest.mock import AsyncMock

from app.core.errors import LLMError
from app.core.prompts import render_prompt

AI_EVALUATION = {
    "current_evaluation": {
        "situation_score": 8,
        "task_score": 8,
        "action_score": 9,
        "result_score": 9,
        "feedback": "Câu trả lời có đầy đủ bối cảnh, hành động và kết quả.",
    },
    "interviewer_reply": "Bạn đã sử dụng công cụ nào để phân tích dữ liệu?",
    "is_finished": False,
}

STRONG = (
    "Trong dự án môn học năm 2024, em được giao nhiệm vụ phụ trách phân tích dữ liệu. "
    "Em đã xây dựng báo cáo Power BI và đề xuất thay đổi quy trình, kết quả là giảm 30% thời gian xử lý."
)


def start(client):
    res = client.post("/api/interview/start", json={"candidate_name": "An", "target_role": "Data Analyst"})
    assert res.status_code == 200
    return res.json()["session_id"]


def chat(client, session_id, answer):
    return client.post("/api/interview/chat", json={"session_id": session_id, "user_answer": answer})


def test_full_interview_flow_persists_and_finishes(client):
    sid = start(client)
    finished = False
    for _ in range(10):
        body = chat(client, sid, STRONG).json()
        if body["is_finished"]:
            finished = True
            assert "trung bình" in body["overall_summary"]
            break
    assert finished


def test_unknown_session_returns_404(client):
    assert chat(client, "sess_khongtontai", "xin chào").status_code == 404


def test_finished_session_cannot_continue(client):
    sid = start(client)
    while not chat(client, sid, STRONG).json()["is_finished"]:
        pass
    assert chat(client, sid, "thêm một câu nữa").status_code == 409


def test_star_score_depends_on_answer(client):
    sid = start(client)
    weak = chat(client, sid, "ok").json()["current_evaluation"]
    strong = chat(client, sid, STRONG).json()["current_evaluation"]
    assert strong["result_score"] > weak["result_score"]
    assert strong["action_score"] > weak["action_score"]


def test_empty_answer_rejected(client):
    sid = start(client)
    assert chat(client, sid, "").status_code == 422


def test_render_prompt_fills_placeholders():
    cv_prompt = render_prompt("cv_extraction", raw_cv_text="NỘI DUNG CV")
    assert "NỘI DUNG CV" in cv_prompt and "{{" not in cv_prompt and "BẠN 3" not in cv_prompt

    gap_prompt = render_prompt(
        "skill_gap_analysis",
        job_title="Junior Data Analyst",
        requirements_source="job_description",
        required_skills="Python, SQL, Power BI",
        matched_skills="Python, SQL",
        missing_skills="Power BI",
        unrecognized_skills="",
        match_percentage=66.7,
        recommended_courses="CNTT1105 - Cơ sở dữ liệu và SQL nâng cao",
        job_description="Yêu cầu Python, SQL, Power BI",
    )
    assert "Python, SQL, Power BI" in gap_prompt
    assert "Junior Data Analyst" in gap_prompt
    assert "{{" not in gap_prompt

    interview_prompt = render_prompt(
        "star_interview_agent",
        target_role="Data Analyst",
        question="Hãy giới thiệu bản thân",
        user_answer="Em là sinh viên năm 4 NEU",
        conversation_history='[{"role":"assistant","content":"Hãy giới thiệu bản thân"}]',
        turn_index=1,
        max_turns=4,
    )
    assert "Data Analyst" in interview_prompt and "sinh viên năm 4" in interview_prompt and "{{" not in interview_prompt


def test_render_prompt_missing_variable_raises():
    with pytest.raises(KeyError):
        render_prompt("cv_extraction")


def test_ai_interview_success(client, monkeypatch):
    sid = start(client)

    mock_generate = AsyncMock(return_value=AI_EVALUATION)
    monkeypatch.setattr(
        "app.services.interview_service.gemini_service.generate_json",
        mock_generate,
    )

    response = chat(client, sid, STRONG)

    assert response.status_code == 200

    body = response.json()
    assert body["is_mock"] is False
    assert body["is_finished"] is False
    assert body["interviewer_reply"] == AI_EVALUATION["interviewer_reply"]
    assert body["current_evaluation"]["situation_score"] == 8
    assert body["current_evaluation"]["action_score"] == 9

    mock_generate.assert_awaited_once()


def test_ai_interview_fallback_when_gemini_fails(client, monkeypatch):
    sid = start(client)

    mock_generate = AsyncMock(
        side_effect=LLMError("Gemini không khả dụng")
    )
    monkeypatch.setattr(
        "app.services.interview_service.gemini_service.generate_json",
        mock_generate,
    )

    response = chat(client, sid, STRONG)

    assert response.status_code == 200

    body = response.json()
    assert body["is_mock"] is True
    assert body["is_finished"] is False
    assert body["current_evaluation"] is not None
    assert body["interviewer_reply"] != AI_EVALUATION["interviewer_reply"]

    mock_generate.assert_awaited_once()


def test_ai_interview_fallback_when_gemini_returns_invalid_json(client, monkeypatch):
    sid = start(client)

    mock_generate = AsyncMock(
        return_value={
            "current_evaluation": {},
            "interviewer_reply": "",
            "is_finished": "no",
        }
    )
    monkeypatch.setattr(
        "app.services.interview_service.gemini_service.generate_json",
        mock_generate,
    )

    response = chat(client, sid, STRONG)

    assert response.status_code == 200

    body = response.json()
    assert body["is_mock"] is True
    assert body["current_evaluation"] is not None
    assert body["interviewer_reply"] != ""

    mock_generate.assert_awaited_once()
