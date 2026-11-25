# NEU Career AI — Hệ thống Tư vấn Nghề nghiệp & Phỏng vấn Ảo cho Sinh viên NEU

Dự án Monorepo xây dựng nền tảng AI hỗ trợ sinh viên Đại học Kinh tế Quốc dân (NEU) phân tích CV, đối chiếu khoảng cách kỹ năng (Skill Gap) với yêu cầu doanh nghiệp, gợi ý học phần NEU cần bổ sung và luyện tập phỏng vấn theo phương pháp STAR, tích hợp đầy đủ phân quyền 3 Actor (**Sinh viên – Doanh nghiệp – Quản trị viên**).

---

## Cấu trúc Thư mục (Monorepo)

```text
NEU-career-AI/
├── backend/                  # FastAPI Backend Core (Đã hoàn thiện 100% API, RBAC 3 Actor, DB, Taxonomy & Pytest)
│   ├── app/
│   │   ├── api/              # Các REST API endpoints (/auth, /cv, /analysis, /interview, /curriculum, /enterprise, /admin, /career)
│   │   ├── core/             # Config, SQLite Database, Security RBAC, Error Handlers, Gemini LLM & Prompt Loader
│   │   ├── data/             # Bộ từ điển kỹ năng chuẩn (Skill Taxonomy) & JD mẫu
│   │   ├── schemas/          # Pydantic v2 Data Contracts (Request / Response)
│   │   └── services/         # Business Logic & AI Services (CV, Matching, Interview, Career Advisor, AI Usage)
│   ├── tests/                # Bộ kiểm thử tự động Backend (66 unit & integration tests)
│   └── Dockerfile            # Container hóa Backend FastAPI Python
├── frontend/                 # Ứng dụng React + Vite (Role-based workspaces, đa ngôn ngữ, Christmas UI)
│   ├── src/
│   │   ├── components/       # Workspace Sinh viên, Doanh nghiệp, Admin Dashboard, Analytics
│   │   └── services/api.js   # API Client kết nối Backend
│   ├── tests/                # Bộ kiểm thử tự động Frontend (87 vitest tests)
│   └── Dockerfile            # Multi-stage build + Nginx reverse proxy
├── ai/                       # Kho Prompt Templates cho Gemini LLM & Datasets mẫu
│   ├── prompts/              # Prompt CV Extraction, Skill Gap, STAR Interview, Career Advisor
│   └── datasets/             # Mẫu CV (.docx) và JD (.txt) các chuyên ngành
├── docker-compose.yml        # Chạy toàn bộ hệ thống bằng 1 lệnh duy nhất qua Docker
└── .github/workflows/ci.yml  # GitHub Actions CI tự động chạy Pytest & Vitest Build
```

---

## 🐳 Hướng dẫn Chạy Nhanh Bằng Docker (Khuyên dùng)

Chỉ cần máy đã cài đặt Docker & Docker Compose, chạy toàn bộ Frontend + Backend + Database bằng **1 lệnh duy nhất**:

```bash
docker compose up -d --build
```

- **Giao diện Web (Frontend):** `http://localhost:3000`
- **Swagger UI (Backend API Docs):** `http://localhost:8000/docs` hoặc `http://localhost:3000/docs`
- **Kiểm tra trạng thái hệ thống:** `http://localhost:8000/health` hoặc `http://localhost:3000/health`
- **Tắt hệ thống:** `docker compose down`

---

## Tài khoản Mẫu 3 Actor (Khởi tạo tự động trong Database)

Khi chạy Backend, hệ thống tự động tạo sẵn 3 tài khoản đại diện cho 3 Actor (mật khẩu chung: **`123456`**):

| Actor (Vai trò) | Email đăng nhập | Mật khẩu | Chức năng phân quyền |
| :--- | :--- | :--- | :--- |
| **Sinh viên (`student`)** | `phu@st.neu.edu.vn` | `123456` | Phân tích CV, So khớp JD, Phỏng vấn STAR, Tư vấn lộ trình, Nộp hồ sơ ứng tuyển |
| **Doanh nghiệp (`enterprise`)** | `hr@fpt.com` | `123456` | Đăng/Xóa tin tuyển dụng (JD), Xem bảng xếp hạng ứng viên theo % độ khớp |
| **Quản trị viên (`admin`)** | `admin@neu.edu.vn` | `123456` | Xem thống kê toàn hệ thống, Giám sát AI Usage Logs, Kiểm duyệt tin tuyển dụng, Khóa/Mở tài khoản |

---

## Hướng dẫn Chạy Cục bộ (Local Development)

### 1. Chạy Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
..\venv\Scripts\activate   # hoặc .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Điền GEMINI_API_KEY vào file .env nếu có
uvicorn app.main:app --reload --port 8000
```
- **Swagger UI:** `http://localhost:8000/docs`
- **Chạy kiểm thử tự động Backend:** `pytest` (66 tests)

### 2. Chạy Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Truy cập giao diện tại: `http://localhost:3000`
- **Chạy kiểm thử tự động Frontend:** `npm test -- --run` (87 tests)
