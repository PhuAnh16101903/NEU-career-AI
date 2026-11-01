# ⚙️ NEU Career AI — Backend Service

Backend **FastAPI (Python)**: REST API, Phân quyền 3 Actor (RBAC), lưu trữ SQLite, tích hợp Gemini.

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

## 🔐 Tài khoản mẫu 3 Actor (Tự động khởi tạo khi chạy server)

| Actor (Vai trò) | Email đăng nhập | Mật khẩu | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Sinh viên (`student`)** | `phu@st.neu.edu.vn` | `123456` | Upload CV, So khớp JD, Phỏng vấn STAR, Ứng tuyển việc làm |
| **Doanh nghiệp (`enterprise`)** | `hr@fpt.com` | `123456` | Đăng/Xóa tin tuyển dụng (JD), Xem BXH ứng viên theo % độ khớp |
| **Quản trị viên (`admin`)** | `admin@neu.edu.vn` | `123456` | Xem thống kê hệ thống, Duyệt tin tuyển dụng, Khóa/Mở tài khoản |

## 🧪 Chạy test

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Test dùng cơ sở dữ liệu tạm nên không ảnh hưởng `neu_career.db`.

## 🗂️ Cấu trúc

```text
app/
├── main.py            # Khởi tạo app, CORS, xử lý lỗi, tạo bảng & seed 3 Actor khi khởi động
├── models.py          # Bảng SQLAlchemy (User, JobPosting, JobApplication, InterviewSession)
├── core/
│   ├── config.py      # Biến môi trường (.env)
│   ├── database.py    # Engine, session, init_db
│   ├── security.py    # Băm mật khẩu PBKDF2, Bearer Token HMAC-SHA256 & RBAC require_roles
│   ├── errors.py      # ServiceError, LLMError
│   ├── llm.py         # Gemini async, lỗi ném LLMError
│   └── prompts.py     # Nạp prompt từ ai/prompts
├── data/
│   └── skill_taxonomy.py   # Danh mục kỹ năng chuẩn + alias (dùng chung)
├── schemas/           # Pydantic: hợp đồng API (cv, analysis, interview, curriculum, auth, enterprise, admin)
├── services/          # Logic nghiệp vụ (cv, matching, interview, curriculum, auth, enterprise, admin)
└── api/               # Router (/auth, /cv, /analysis, /interview, /curriculum, /enterprise, /admin)
```

## 📌 Trạng thái các module

| Module | Hiện tại | Còn lại (TODO nhóm AI & Data) |
| :--- | :--- | :--- |
| `auth_service` / `security` | Đăng ký, Đăng nhập, Bearer Token, Phân quyền RBAC 3 Actor | Đã hoàn thiện 100% |
| `enterprise_service` | Đăng JD tự trích kỹ năng, SV ứng tuyển tự tính % Match, Xếp hạng ứng viên | Đã hoàn thiện 100% |
| `admin_service` | Thống kê hệ thống, Quản lý người dùng, Kiểm duyệt JD | Đã hoàn thiện 100% |
| `cv_service` | Đọc PDF/DOCX; email, SĐT, họ tên, kỹ năng (theo taxonomy) | Học vấn, kinh nghiệm bằng LLM (`feat/cv-parser`) |
| `matching_service` | So khớp theo taxonomy; radar thật; gợi ý môn theo kỹ năng thiếu | Lời khuyên chuyên sâu bằng LLM (`feat/matching-engine`) |
| `interview_service` | Lưu phiên vào SQLite; câu hỏi cố định; chấm STAR theo quy tắc | Agent LLM, câu hỏi đào sâu (`feat/mock-interview`) |
| `curriculum_service` | 5 môn **dữ liệu mẫu** | Nạp chương trình đào tạo NEU thật (`feat/curriculum-data`) |
