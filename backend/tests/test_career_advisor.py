import pytest
import asyncio

from app.schemas.career import CareerAdvisorRequest
from app.services.career_advisor_service import career_advisor_service

from fastapi.testclient import TestClient

from app.main import app
from app.core.llm import gemini_service


client = TestClient(app)

def test_normalize_candidate_skills():
    """Kiểm tra chuẩn hóa và loại bỏ kỹ năng trùng lặp."""

    skills = career_advisor_service._normalize_candidate_skills(
        ["Python", "python", "SQL"]
    )

    assert "Python" in skills
    assert "SQL" in skills
    assert len(skills) == 2
    new_skills = career_advisor_service._normalize_candidate_skills(
        ["HTML", "CSS", "Flask", "SQLite", "REST API"]
    )

    assert set(new_skills) == {
        "HTML",
        "CSS",
        "Flask",
        "SQLite",
        "REST API",
    }


def test_calculate_career_matches():
    """Kiểm tra tính điểm phù hợp của 9 nhóm nghề nghiệp."""

    matches = career_advisor_service._calculate_career_matches(
        ["Python", "SQL"]
    )

    expected_roles = {
        "data analyst",
        "business analyst",
        "software engineer",
        "backend developer",
        "frontend developer",
        "full stack developer",
        "cybersecurity analyst",
        "ai engineer",
        "tài chính",
    }

    actual_roles = {item["job_title"] for item in matches}

    assert len(matches) == 9
    assert actual_roles == expected_roles

    # Kết quả phải được sắp xếp theo điểm giảm dần.
    scores = [item["match_percentage"] for item in matches]
    assert scores == sorted(scores, reverse=True)

    # Đảm bảo điểm Data Analyst không bị thay đổi.
    data_analyst = next(
        item for item in matches
        if item["job_title"] == "data analyst"
    )

    assert data_analyst["match_percentage"] == 28.6
    assert "Python" in data_analyst["matched_skills"]
    assert "SQL" in data_analyst["matched_skills"]


def test_build_fallback_response():
    """Kiểm tra kết quả fallback khi không sử dụng Gemini."""

    request = CareerAdvisorRequest(
        skills=["Python", "SQL"],
        major="Công nghệ thông tin",
        study_year=2,
    )

    skills = career_advisor_service._normalize_candidate_skills(
        request.skills
    )

    matches = career_advisor_service._calculate_career_matches(
        skills
    )

    response = career_advisor_service._build_fallback_response(
        request,
        skills,
        matches,
    )

    assert response.is_mock is True
    assert len(response.career_recommendations) == 3
    assert response.career_profile
    assert response.learning_roadmap
    assert response.general_advice


def test_career_advisor_api_without_gemini(monkeypatch):
    """API phải trả fallback khi Gemini chưa được cấu hình."""

    monkeypatch.setattr(gemini_service, "_api_key", "")

    response = client.post(
        "/api/career/advisor",
        json={
            "skills": ["Python", "SQL"],
            "major": "Công nghệ thông tin",
            "study_year": 2,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["is_mock"] is True
    assert len(data["career_recommendations"]) == 3
    assert data["career_profile"]
    assert data["learning_roadmap"]