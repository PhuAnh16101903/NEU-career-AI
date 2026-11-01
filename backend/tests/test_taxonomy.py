from app.data.skill_taxonomy import extract_skills, normalize_skill, role_requirements


def test_normalize_aliases():
    assert normalize_skill("PowerBI") == "Power BI"
    assert normalize_skill("  tiếng anh giao tiếp ") == "Tiếng Anh"
    assert normalize_skill("không-phải-kỹ-năng") is None


def test_extract_does_not_match_substrings():
    skills = extract_skills("Thành thạo JavaScript và PostgreSQL")
    assert "JavaScript" in skills and "PostgreSQL" in skills
    # Không được khớp nhầm Java (trong JavaScript) hay SQL (trong PostgreSQL)
    assert "Java" not in skills
    assert "SQL" not in skills


def test_vietnamese_word_ba_is_not_a_skill():
    assert extract_skills("Em có ba năm kinh nghiệm") == []


def test_role_requirements():
    assert "SQL" in role_requirements("Junior Data Analyst")
    assert role_requirements("Nghề không tồn tại") is None
