from unittest.mock import AsyncMock

from app.core.errors import LLMError
from app.services.matching_service import gemini_service


def post_match(client, **overrides):
    payload = {
        "job_title": "Junior Data Analyst",
        "candidate_skills": ["Python", "Excel", "Tiếng Anh giao tiếp"],
    }
    payload.update(overrides)
    return client.post("/api/analysis/match", json=payload)


def test_match_uses_role_preset(client):
    res = post_match(client)
    assert res.status_code == 200
    body = res.json()
    assert body["requirements_source"] == "role_preset"
    assert {"Python", "Excel", "Tiếng Anh"} <= set(body["matched_skills"])
    assert "SQL" in body["missing_skills"]
    assert 0 < body["overall_match_percentage"] < 100
    # Gợi ý môn học chỉ liệt kê kỹ năng thiếu mà môn đó thật sự bù được
    sql_course = next(c for c in body["recommended_neu_courses"] if c["course_code"] == "CNTT1105")
    assert "SQL" in sql_course["skills_covered"]
    assert set(sql_course["skills_covered"]) <= set(body["missing_skills"])
    assert body["radar_chart_data"]


def test_match_uses_job_description_when_given(client):
    res = post_match(client, target_job_description="Cần thành thạo SQL và Tableau", candidate_skills=["SQL"])
    body = res.json()
    assert body["requirements_source"] == "job_description"
    assert body["required_skills"] == ["SQL", "Tableau"]
    assert body["overall_match_percentage"] == 50.0
    assert body["missing_skills"] == ["Tableau"]


def test_match_short_skill_does_not_match_by_substring(client):
    # "r" từng khớp nhầm với bất kỳ yêu cầu nào chứa chữ r
    res = post_match(client, candidate_skills=["r", "c"])
    body = res.json()
    assert body["matched_skills"] == []
    assert set(body["unrecognized_skills"]) == {"r", "c"}


def test_match_unknown_role_without_jd_returns_422(client):
    res = post_match(client, job_title="Nghề không tồn tại")
    assert res.status_code == 422


def test_curriculum_lists_courses(client):
    body = client.get("/api/curriculum").json()
    assert body["total"] == len(body["courses"]) > 0


def test_match_uses_gemini_advice(client, monkeypatch):
    fake_ai_result = {
        "skill_gap_analysis": "Bạn đã có nền tảng Python và Excel, nhưng cần cải thiện SQL.",
        "learning_roadmap": [
            "Bước 1: Ôn tập SQL cơ bản.",
            "Bước 2: Thực hành truy vấn dữ liệu.",
        ],
        "course_explanations": [
            {
                "course_code": "CNTT1105",
                "explanation": "Môn học giúp củng cố SQL và thiết kế cơ sở dữ liệu.",
            },
            {
                "course_code": "INVALID999",
                "explanation": "Môn học không tồn tại.",
            },
        ],
        "general_advice": "Hãy thực hành SQL qua các dự án phân tích dữ liệu.",
    }

    mock_generate_json = AsyncMock(return_value=fake_ai_result)
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    res = post_match(client)

    assert res.status_code == 200
    body = res.json()

    # Gemini bổ sung phần tư vấn.
    assert body["skill_gap_analysis"] == fake_ai_result["skill_gap_analysis"]
    assert body["learning_roadmap"] == fake_ai_result["learning_roadmap"]
    assert body["general_advice"] == fake_ai_result["general_advice"]

    # Chỉ giữ giải thích môn học backend đã đề xuất.
    course_codes = {
        item["course_code"]
        for item in body["course_explanations"]
    }
    assert "CNTT1105" in course_codes
    assert "INVALID999" not in course_codes

    # Gemini không được thay đổi kết quả Matching.
    assert body["overall_match_percentage"] == 42.9
    assert "SQL" in body["missing_skills"]

    mock_generate_json.assert_awaited_once()


def test_match_falls_back_when_gemini_fails(client, monkeypatch):
    mock_generate_json = AsyncMock(
        side_effect=LLMError("Gemini không khả dụng")
    )
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    res = post_match(client)

    assert res.status_code == 200
    body = res.json()

    # Kết quả Matching vẫn được trả về.
    assert body["requirements_source"] == "role_preset"
    assert body["overall_match_percentage"] > 0
    assert body["missing_skills"]

    # Sử dụng lời khuyên dự phòng khi Gemini lỗi.
    assert body["general_advice"]
    assert body["skill_gap_analysis"] == ""
    assert body["learning_roadmap"] == []
    assert body["course_explanations"] == []

    mock_generate_json.assert_awaited_once()

def test_match_falls_back_when_gemini_returns_invalid_structure(client, monkeypatch):
    mock_generate_json = AsyncMock(return_value="invalid response")
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    res = post_match(client)

    assert res.status_code == 200
    body = res.json()

    assert body["overall_match_percentage"] == 42.9
    assert body["general_advice"]
    assert body["skill_gap_analysis"] == ""
    assert body["learning_roadmap"] == []
    assert body["course_explanations"] == []

    mock_generate_json.assert_awaited_once()
