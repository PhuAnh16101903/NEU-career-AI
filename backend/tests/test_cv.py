from io import BytesIO

from docx import Document


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
