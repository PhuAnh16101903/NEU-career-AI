# ⚙️ NEU Career AI — Backend Service

Backend **FastAPI (Python)**: API, lưu trữ SQLite, tích hợp Gemini.

## 🚀 Chạy server

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1          # PowerShell (CMD: .\venv\Scripts\activate.bat)
pip install -r requirements.txt
copy .env.example .env               # điền GEMINI_API_KEY nếu có
uvicorn app.main:app --reload --port 8000
```

* Swagger UI: `http://127.0.0.1:8000/docs`
* Health check: `http://127.0.0.1:8000/health`

## 🧪 Chạy test

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Test dùng cơ sở dữ liệu tạm nên không ảnh hưởng `neu_career.db`.

## 🗂️ Cấu trúc

```text
app/
├── main.py            # Khởi tạo app, CORS, xử lý lỗi, tạo bảng khi khởi động
├── models.py          # Bảng SQLAlchemy (InterviewSession)
├── core/
│   ├── config.py      # Biến môi trường (.env)
│   ├── database.py    # Engine, session, init_db
│   ├── errors.py      # ServiceError, LLMError
│   ├── llm.py         # Gemini async, lỗi ném LLMError
│   └── prompts.py     # Nạp prompt từ ai/prompts
├── data/
│   └── skill_taxonomy.py   # Danh mục kỹ năng chuẩn + alias (dùng chung)
├── schemas/           # Pydantic: hợp đồng API
├── services/          # Logic nghiệp vụ
└── api/               # Router
```

## 📌 Trạng thái các module

| Module | Hiện tại | Còn lại (TODO) |
| :--- | :--- | :--- |
| `cv_service` | Đọc PDF/DOCX; email, SĐT, họ tên, kỹ năng (theo taxonomy) | Học vấn, kinh nghiệm bằng LLM |
| `matching_service` | So khớp theo taxonomy (chính xác, không khớp chuỗi con); radar thật; gợi ý môn theo kỹ năng thiếu | Semantic matching, trọng số kỹ năng |
| `interview_service` | Lưu phiên vào SQLite; câu hỏi cố định; chấm STAR theo quy tắc | Agent LLM, câu hỏi đào sâu, rubric chi tiết |
| `curriculum_service` | 5 môn **dữ liệu mẫu** | Nạp chương trình đào tạo NEU thật |

Các response có `is_mock: true` khi một phần kết quả chưa do AI/thuật toán thật tạo ra.

## ⚠️ Quy ước

* Kỹ năng luôn dùng **tên chuẩn** trong `skill_taxonomy.SKILLS`. Thêm kỹ năng/alias mới vào file đó.
* `curriculum_service` kiểm tra khi import: môn học dùng kỹ năng ngoài taxonomy sẽ báo lỗi ngay.
* Lỗi nghiệp vụ: `raise ServiceError(status, "thông báo")`. Lỗi LLM: `LLMError`. Không trả chuỗi lỗi như dữ liệu.
