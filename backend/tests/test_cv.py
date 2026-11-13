from io import BytesIO

from docx import Document
from unittest.mock import AsyncMock


def make_docx(lines):
    document = Document()
    for line in lines:
        document.add_paragraph(line)
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def make_pdf(lines):
    """Dựng PDF 1 trang tối thiểu (font Helvetica, chỉ ASCII) để test đường đọc PDF thật."""
    ops = ["BT", "/F1 12 Tf", "72 720 Td", "16 TL"]
    for line in lines:
        ops.append(f"({line}) Tj T*")
    ops.append("ET")
    stream = "\n".join(ops)
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = "%PDF-1.4\n"
    offsets = []
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{body}\nendobj\n"
    xref_pos = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    out += "".join(f"{off:010d} 00000 n \n" for off in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n"
    return out.encode("latin-1")


def test_upload_real_pdf(client):
    pdf = make_pdf(["Tran Van Binh", "Email: binh@st.neu.edu.vn", "Skills: Python, Tableau"])
    res = client.post("/api/cv/upload", files={"file": ("cv.pdf", pdf, "application/pdf")})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["full_name"] == "Tran Van Binh"
    assert body["email"] == "binh@st.neu.edu.vn"
    assert {s["name"] for s in body["skills"]} == {"Python", "Tableau"}


def test_upload_docx_extracts_real_content(client):
    content = make_docx(
        [
            "Nguyễn Thị Lan",
            "Email: lan.nt@st.neu.edu.vn | SĐT: 0912 345 678",
            "Kỹ năng: Python, SQL, PowerBI, làm việc nhóm",
        ]
    )
    res = client.post("/api/cv/upload", files={"file": ("cv.docx", content, DOCX_MIME)})
    assert res.status_code == 200
    body = res.json()
    assert body["full_name"] == "Nguyễn Thị Lan"
    assert body["email"] == "lan.nt@st.neu.edu.vn"
    assert body["phone"] == "0912345678"
    assert {s["name"] for s in body["skills"]} == {"Python", "SQL", "Power BI", "Làm việc nhóm"}
    # Học vấn/kinh nghiệm chưa bóc tách -> phải báo rõ, không bịa dữ liệu
    assert body["education"] == [] and body["is_mock"] is True and body["warnings"]


def test_two_different_cvs_give_different_results(client):
    a = make_docx(["An", "Kỹ năng: Python"])
    b = make_docx(["Bình", "Kỹ năng: Tableau"])
    ra = client.post("/api/cv/upload", files={"file": ("a.docx", a, DOCX_MIME)}).json()
    rb = client.post("/api/cv/upload", files={"file": ("b.docx", b, DOCX_MIME)}).json()
    assert ra["full_name"] != rb["full_name"]
    assert ra["skills"] != rb["skills"]


def test_upload_rejects_unsupported_extension(client):
    res = client.post("/api/cv/upload", files={"file": ("cv.txt", b"hello", "text/plain")})
    assert res.status_code == 400


def test_upload_corrupted_pdf_returns_422_not_fake_data(client):
    res = client.post("/api/cv/upload", files={"file": ("cv.pdf", b"not a pdf", "application/pdf")})
    assert res.status_code == 422


def test_upload_rejects_oversized_file(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 0)
    res = client.post("/api/cv/upload", files={"file": ("cv.pdf", b"x", "application/pdf")})
    assert res.status_code == 413


def test_upload_uses_gemini_when_available(client, monkeypatch):
    from app.services.cv_service import gemini_service

    fake_ai_result = {
        "full_name": "Nguyen Van A",
        "email": "ai@example.com",
        "phone": None,
        "education": [
            {
                "institution": "Dai hoc Kinh te Quoc dan",
                "major": "Cong nghe thong tin",
                "gpa": 3.5,
                "graduation_year": 2027,
            }
        ],
        "skills": [
            {
                "name": "Python",
                "category": "Kỹ năng chuyên môn",
                "level": "Intermediate",
            }
        ],
        "experiences": [
            {
                "title": "Thực tập sinh",
                "company": "ABC Company",
                "duration": "6 tháng",
                "description": "Phát triển ứng dụng Python",
            }
        ],
    }

    mock_generate_json = AsyncMock(return_value=fake_ai_result)
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    content = make_docx([
        "Nguyen Van A",
        "Email: a@example.com",
        "Skills: Python",
    ])

    res = client.post(
        "/api/cv/upload",
        files={"file": ("cv.docx", content, DOCX_MIME)},
    )

    assert res.status_code == 200, res.text

    body = res.json()

    assert body["is_mock"] is False
    assert body["education"][0]["institution"] == "Dai hoc Kinh te Quoc dan"
    assert body["experiences"][0]["company"] == "ABC Company"

    # Email regex được ưu tiên hơn email do Gemini trả về
    assert body["email"] == "a@example.com"

    mock_generate_json.assert_awaited_once()


def test_upload_falls_back_when_gemini_fails(client, monkeypatch):
    from app.core.errors import LLMError
    from app.services.cv_service import gemini_service

    mock_generate_json = AsyncMock(
        side_effect=LLMError("Gemini API unavailable")
    )
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    content = make_docx([
        "Tran Van Binh",
        "Email: binh@example.com",
        "Skills: Python, Tableau",
    ])

    res = client.post(
        "/api/cv/upload",
        files={"file": ("cv.docx", content, DOCX_MIME)},
    )

    assert res.status_code == 200, res.text

    body = res.json()

    assert body["full_name"] == "Tran Van Binh"
    assert body["email"] == "binh@example.com"
    assert {skill["name"] for skill in body["skills"]} == {
        "Python",
        "Tableau",
    }
    assert body["is_mock"] is True
    assert any("Gemini" in warning for warning in body["warnings"])

    mock_generate_json.assert_awaited_once()

def test_upload_prefers_name_from_cv_over_gemini(client, monkeypatch):
    from app.services.cv_service import gemini_service

    fake_ai_result = {
        "full_name": "Nguyen Van Sai",
        "email": None,
        "phone": None,
        "education": [],
        "skills": [],
        "experiences": [],
    }

    mock_generate_json = AsyncMock(return_value=fake_ai_result)
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    content = make_docx([
        "Tran Van Binh",
        "Email: binh@example.com",
        "Skills: Python",
    ])

    res = client.post(
        "/api/cv/upload",
        files={"file": ("cv.docx", content, DOCX_MIME)},
    )

    assert res.status_code == 200, res.text

    body = res.json()

    assert body["full_name"] == "Tran Van Binh"
    assert body["is_mock"] is False

    mock_generate_json.assert_awaited_once()

def test_upload_does_not_add_skills_not_found_in_cv(client, monkeypatch):
    from app.services.cv_service import gemini_service

    fake_ai_result = {
        "full_name": "Tran Van Binh",
        "email": None,
        "phone": None,
        "education": [],
        "skills": [
            {"name": "Python", "category": "programming"},
            {"name": "Java", "category": "programming"},
        ],
        "experiences": [],
    }

    mock_generate_json = AsyncMock(return_value=fake_ai_result)
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    content = make_docx([
        "Tran Van Binh",
        "Email: binh@example.com",
        "Skills: Python",
    ])

    res = client.post(
        "/api/cv/upload",
        files={"file": ("cv.docx", content, DOCX_MIME)},
    )

    assert res.status_code == 200, res.text

    body = res.json()

    skill_names = {skill["name"] for skill in body["skills"]}

    assert "Python" in skill_names
    assert "Java" not in skill_names
    assert body["is_mock"] is False

    mock_generate_json.assert_awaited_once()

def test_upload_falls_back_when_gemini_returns_invalid_structure(
    client, monkeypatch
):
    from app.services.cv_service import gemini_service

    fake_ai_result = {
        "full_name": "Wrong AI Name",
        "email": None,
        "phone": None,
        "education": [],
        "skills": "Python, Java",  # Sai: phải là danh sách
        "experiences": [],
    }

    mock_generate_json = AsyncMock(return_value=fake_ai_result)
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    content = make_docx([
        "Tran Van Binh",
        "Email: binh@example.com",
        "Skills: Python, Tableau",
    ])

    res = client.post(
        "/api/cv/upload",
        files={"file": ("cv.docx", content, DOCX_MIME)},
    )

    assert res.status_code == 200, res.text

    body = res.json()

    assert body["full_name"] == "Tran Van Binh"
    assert body["email"] == "binh@example.com"
    assert {skill["name"] for skill in body["skills"]} == {
        "Python",
        "Tableau",
    }
    assert body["is_mock"] is True
    assert any("Gemini" in warning for warning in body["warnings"])

    mock_generate_json.assert_awaited_once()

def test_upload_preserves_skill_taxonomy_warning_when_no_skills_found(
    client, monkeypatch
):
    from app.services.cv_service import gemini_service

    fake_ai_result = {
        "full_name": "Nguyen Van C",
        "email": None,
        "phone": None,
        "education": [],
        "skills": [],
        "experiences": [],
    }

    mock_generate_json = AsyncMock(return_value=fake_ai_result)
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        mock_generate_json,
    )

    content = make_docx([
        "Nguyen Van C",
        "Sinh vien nam hai",
        "Dai hoc Kinh te Quoc dan",
    ])

    res = client.post(
        "/api/cv/upload",
        files={"file": ("cv.docx", content, DOCX_MIME)},
    )

    assert res.status_code == 200, res.text

    body = res.json()

    assert body["is_mock"] is False
    assert any(
        "Skill Taxonomy" in warning
        for warning in body["warnings"]
    )

    mock_generate_json.assert_awaited_once()