def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def _login(client, email):
    response = client.post("/api/auth/login", json={"email": email, "password": "123456"})
    assert response.status_code == 200, response.text
    return response.json()


def test_moderation_listing_requires_admin_and_includes_pending_jobs(client):
    student = _auth_header(_login(client, "phu@st.neu.edu.vn")["access_token"])
    enterprise = _auth_header(_login(client, "hr@fpt.com")["access_token"])
    admin = _auth_header(_login(client, "admin@neu.edu.vn")["access_token"])
    assert client.get("/api/admin/jobs").status_code == 401
    assert client.get("/api/admin/jobs", headers=student).status_code == 403
    assert client.get("/api/admin/jobs", headers=enterprise).status_code == 403
    created = client.post("/api/enterprise/jobs", headers=enterprise, json={
        "title": "Moderation listing test",
        "description": "Analyze datasets using SQL and Python.",
        "required_skills": ["SQL", "Python"],
    })
    assert created.status_code == 201, created.text
    job = created.json()
    # Seed a pending record independently of the current auto-publish rule.
    from app.core.database import SessionLocal
    from app.models import JobPosting
    with SessionLocal() as db:
        record = db.get(JobPosting, job["id"])
        record.status = "pending"
        db.commit()
    response = client.get("/api/admin/jobs", headers=admin)
    assert response.status_code == 200, response.text
    assert any(item["id"] == job["id"] and item["status"] == "pending" for item in response.json())
    public = client.get("/api/enterprise/jobs")
    assert all(item["id"] != job["id"] for item in public.json())
