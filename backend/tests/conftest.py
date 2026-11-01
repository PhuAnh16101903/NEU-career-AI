import os
import tempfile

# Phải đặt biến môi trường TRƯỚC khi import app để test dùng DB tạm, không đụng neu_career.db thật.
_tmpdir = tempfile.mkdtemp(prefix="neu_career_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmpdir}/test.db"
os.environ["GEMINI_API_KEY"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:  # `with` để chạy lifespan (tạo bảng)
        yield c
