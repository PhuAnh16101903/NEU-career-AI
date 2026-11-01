import pytest

from app.core.prompts import render_prompt

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
        candidate_skills="Python, SQL",
        job_description="Yêu cầu Python, SQL, Power BI",
    )
    assert "Python, SQL" in gap_prompt and "{{" not in gap_prompt

    interview_prompt = render_prompt(
        "star_interview_agent",
        target_role="Data Analyst",
        question="Hãy giới thiệu bản thân",
        user_answer="Em là sinh viên năm 4 NEU",
    )
    assert "Data Analyst" in interview_prompt and "sinh viên năm 4" in interview_prompt and "{{" not in interview_prompt


def test_render_prompt_missing_variable_raises():
    with pytest.raises(KeyError):
        render_prompt("cv_extraction")
