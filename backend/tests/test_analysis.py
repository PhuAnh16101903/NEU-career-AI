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
