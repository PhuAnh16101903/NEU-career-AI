"""
Kiểm thử tự động cho các trường hợp biên (Edge Cases) & Sẵn sàng Deploy (Nhánh feat/qa-deploy).
"""

from io import BytesIO


def test_health_endpoint_ready_for_deploy(client):
    """Kiểm tra endpoint /health phục vụ giám sát khi deploy lên server."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_curriculum_items_structure(client):
    """Kiểm tra GET /api/curriculum: mỗi môn có đủ code, name, credits > 0 và skills_provided không rỗng."""
    res = client.get("/api/curriculum")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for course in data["courses"]:
        assert course["code"]
        assert course["name"]
        assert course["credits"] > 0
        assert len(course["skills_provided"]) > 0


def test_match_validation_empty_job_title(client):
    """Gửi POST /api/analysis/match với job_title='' -> kỳ vọng 422."""
    res = client.post(
        "/api/analysis/match",
        json={"job_title": "", "candidate_skills": ["Python"]},
    )
    assert res.status_code == 422


def test_interview_start_invalid_type(client):
    """Gửi POST /api/interview/start với interview_type sai -> kỳ vọng 422."""
    res = client.post(
        "/api/interview/start",
        json={
            "candidate_name": "Lê Thiên Phú",
            "target_role": "Data Analyst",
            "interview_type": "invalid_type_123",
        },
    )
    assert res.status_code == 422


def test_interview_chat_empty_answer(client):
    """Gửi POST /api/interview/chat với user_answer='' -> kỳ vọng 422."""
    res = client.post(
        "/api/interview/chat",
        json={"session_id": "sess_dummy", "user_answer": ""},
    )
    assert res.status_code == 422


def test_cv_upload_invalid_extensions(client):
    """Upload file sai đuôi (.png, .exe) vào /api/cv/upload -> kỳ vọng 400."""
    fake_png = BytesIO(b"fake png content")
    res = client.post(
        "/api/cv/upload",
        files={"file": ("malicious.png", fake_png, "image/png")},
    )
    assert res.status_code == 400
    assert "pdf" in res.json()["detail"].lower() or "docx" in res.json()["detail"].lower()
