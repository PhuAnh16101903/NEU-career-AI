def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str, password: str = "123456") -> dict:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()


def test_seeded_three_actors_can_login_with_123456(client):
    """Kiểm tra cả 3 Actor mẫu (Sinh viên, Doanh nghiệp, Admin) đăng nhập được bằng mật khẩu 123456."""
    student_auth = _login(client, "phu@st.neu.edu.vn", "123456")
    assert student_auth["user"]["role"] == "student"
    assert student_auth["user"]["full_name"] == "Lê Thiên Phú"

    enterprise_auth = _login(client, "hr@fpt.com", "123456")
    assert enterprise_auth["user"]["role"] == "enterprise"
    assert enterprise_auth["user"]["company_name"] == "FPT Software"

    admin_auth = _login(client, "admin@neu.edu.vn", "123456")
    assert admin_auth["user"]["role"] == "admin"

    # Kiểm tra /api/auth/me trả về đúng thông tin từ Bearer Token
    me = client.get("/api/auth/me", headers=_auth_header(student_auth["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "phu@st.neu.edu.vn"
    assert me.json()["full_name"] == "Lê Thiên Phú"


def test_register_new_student_and_reject_duplicate_email(client):
    res = client.post(
        "/api/auth/register",
        json={
            "email": "sv_moi@st.neu.edu.vn",
            "password": "123456",
            "full_name": "Trần Minh Khoa",
            "role": "student",
            "student_major": "Khoa học dữ liệu",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["user"]["role"] == "student"

    # Đăng ký trùng email -> 409
    dup = client.post(
        "/api/auth/register",
        json={
            "email": "sv_moi@st.neu.edu.vn",
            "password": "123456",
            "full_name": "Trần Minh Khoa",
            "role": "student",
        },
    )
    assert dup.status_code == 409


def test_rbac_blocks_unauthorized_and_wrong_roles(client):
    student_token = _login(client, "phu@st.neu.edu.vn")["access_token"]
    enterprise_token = _login(client, "hr@fpt.com")["access_token"]

    # 1. Chưa đăng nhập gọi API cần quyền -> 401
    unauth = client.get("/api/admin/stats")
    assert unauth.status_code == 401

    # 2. Sinh viên cố gọi API đăng tin của Doanh nghiệp -> 403 Forbidden
    sv_post_job = client.post(
        "/api/enterprise/jobs",
        headers=_auth_header(student_token),
        json={
            "title": "Data Analyst",
            "description": "Yêu cầu thành thạo SQL và Python.",
        },
    )
    assert sv_post_job.status_code == 403

    # 3. Sinh viên & Doanh nghiệp cố gọi API quản trị của Admin -> 403 Forbidden
    assert client.get("/api/admin/stats", headers=_auth_header(student_token)).status_code == 403
    assert client.get("/api/admin/users", headers=_auth_header(enterprise_token)).status_code == 403


def test_full_three_actor_workflow_enterprise_student_admin(client):
    """
    Luồng khép kín 3 Actor:
    1. Doanh nghiệp đăng tin tuyển dụng mới -> tự động bóc tách kỹ năng từ JD.
    2. Sinh viên ứng tuyển vào tin đó -> tự động tính % độ khớp, chống nộp trùng và xem lại lịch sử.
    3. Doanh nghiệp xem danh sách ứng viên xếp hạng theo % độ khớp.
    4. Admin xem thống kê toàn hệ thống và kiểm duyệt tin tuyển dụng.
    """
    student_token = _login(client, "phu@st.neu.edu.vn")["access_token"]
    enterprise_token = _login(client, "hr@fpt.com")["access_token"]
    admin_token = _login(client, "admin@neu.edu.vn")["access_token"]

    # 1. Doanh nghiệp đăng tin tuyển dụng
    job_res = client.post(
        "/api/enterprise/jobs",
        headers=_auth_header(enterprise_token),
        json={
            "title": "Fintech Data Analyst",
            "description": "Phân tích dữ liệu tài chính bằng Python, SQL và Power BI.",
        },
    )
    assert job_res.status_code == 201, job_res.text
    job = job_res.json()
    job_id = job["id"]
    assert set(job["required_skills"]) == {"Python", "SQL", "Power BI"}

    # 2. Sinh viên nộp hồ sơ ứng tuyển lần 1 (đang có Python -> 33.3%)
    apply_res = client.post(
        f"/api/enterprise/jobs/{job_id}/apply",
        headers=_auth_header(student_token),
        json={"candidate_skills": ["Python"]},
    )
    assert apply_res.status_code == 201, apply_res.text
    application = apply_res.json()
    assert application["student_email"] == "phu@st.neu.edu.vn"
    assert application["student_name"] == "Lê Thiên Phú"
    assert application["match_percentage"] == 33.3
    assert len(application["recommended_neu_courses"]) >= 1

    # Sinh viên nộp lại lần 2 sau khi học thêm SQL -> cập nhật lại hồ sơ (66.7%), không bị trùng dòng
    apply_res_2 = client.post(
        f"/api/enterprise/jobs/{job_id}/apply",
        headers=_auth_header(student_token),
        json={"candidate_skills": ["Python", "SQL"]},
    )
    assert apply_res_2.status_code == 201
    assert apply_res_2.json()["match_percentage"] == 66.7

    # Sinh viên xem lịch sử ứng tuyển của mình
    my_apps = client.get("/api/enterprise/my-applications", headers=_auth_header(student_token))
    assert my_apps.status_code == 200
    assert any(a["job_id"] == job_id and a["match_percentage"] == 66.7 for a in my_apps.json())

    # 3. Doanh nghiệp xem danh sách ứng viên đã nộp vào tin tuyển dụng (chỉ có 1 bản ghi của Lê Thiên Phú)
    candidates_res = client.get(
        f"/api/enterprise/jobs/{job_id}/candidates",
        headers=_auth_header(enterprise_token),
    )
    assert candidates_res.status_code == 200
    candidates = candidates_res.json()
    assert len(candidates) == 1
    assert candidates[0]["student_email"] == "phu@st.neu.edu.vn"
    assert candidates[0]["match_percentage"] == 66.7

    # 4. Admin xem thống kê toàn hệ thống và kiểm duyệt tin
    stats_res = client.get("/api/admin/stats", headers=_auth_header(admin_token))
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_students"] >= 1
    assert stats["total_enterprises"] >= 1
    assert stats["total_admins"] >= 1
    assert stats["total_applications"] >= 1

    mod_res = client.patch(
        f"/api/admin/jobs/{job_id}/status",
        headers=_auth_header(admin_token),
        json={"status": "rejected"},
    )
    assert mod_res.status_code == 200
    assert mod_res.json()["status"] == "rejected"


def test_search_filter_and_session_detail_endpoints(client):
    """Kiểm tra lọc từ khóa trên /curriculum, /enterprise/jobs và xem chi tiết phiên phỏng vấn."""
    # Lọc môn học NEU theo từ khóa SQL
    cur_res = client.get("/api/curriculum", params={"q": "SQL"})
    assert cur_res.status_code == 200
    assert cur_res.json()["total"] == 1
    assert cur_res.json()["courses"][0]["code"] == "CNTT1105"

    # Lọc tin tuyển dụng theo từ khóa BPMN
    jobs_res = client.get("/api/enterprise/jobs", params={"q": "BPMN"})
    assert jobs_res.status_code == 200
    assert len(jobs_res.json()) >= 1

    # Khởi tạo phỏng vấn và lấy lại lịch sử qua GET /api/interview/{session_id}
    start = client.post(
        "/api/interview/start",
        json={"candidate_name": "Lê Thiên Phú", "target_role": "Data Analyst"},
    ).json()
    detail = client.get(f"/api/interview/{start['session_id']}")
    assert detail.status_code == 200
    assert detail.json()["candidate_name"] == "Lê Thiên Phú"
    assert len(detail.json()["history"]) == 1
