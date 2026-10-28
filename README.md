# NEU Career AI — Hệ thống Tư vấn Nghề nghiệp & Phỏng vấn Ảo cho Sinh viên NEU

Dự án Monorepo xây dựng nền tảng AI hỗ trợ sinh viên Đại học Kinh tế Quốc dân (NEU) phân tích CV, đối chiếu khoảng cách kỹ năng (Skill Gap) với yêu cầu doanh nghiệp, gợi ý học phần NEU cần bổ sung và luyện tập phỏng vấn theo phương pháp STAR.

---

## Cấu trúc Thư mục (Monorepo)

```text
NEU-career-AI/
├── backend/                  # FastAPI Backend Core (Đã hoàn thiện 100% API, DB, Taxonomy & Pytest)
│   ├── app/
│   │   ├── api/              # Các REST API endpoints (/cv, /analysis, /interview, /curriculum)
│   │   ├── core/             # Config, SQLite Database, Error Handlers, Gemini LLM & Prompt Loader
│   │   ├── data/             # Bộ từ điển kỹ năng chuẩn (Skill Taxonomy) & JD mẫu
│   │   ├── schemas/          # Pydantic v2 Data Contracts (Request / Response)
│   │   └── services/         # Business Logic & các điểm chờ tích hợp (# TODO)
│   └── tests/                # Bộ kiểm thử tự động (22 unit & integration tests)
├── frontend/                 # Khung giao diện React + Vite (Đã cấu hình sẵn API Client & 4 Tab mẫu)
│   └── src/
│       ├── components/       # Khung 4 màn hình chức năng (CVTab, MatchingTab, InterviewTab, CoursesTab)
│       └── services/api.js   # Hàm gọi sẵn 5 API sang Backend
└── ai/                       # Kho Prompt Templates cho Gemini LLM
    └── prompts/              # Khung prompt kèm định dạng JSON đầu ra cho từng tính năng
```

---

## Phân nhánh & Đường lối Triển khai cho các Thành viên

Dự án đã được chia sẵn thành các nhánh chức năng độc lập (Feature Branches) tương ứng với từng mảng công việc:

| Nhánh Git (`git checkout ...`) | Mảng phụ trách | File trọng tâm cần làm việc |
| :--- | :--- | :--- |
| `main` | **Backend Core & API Architecture** | Toàn bộ `backend/` (Đã hoàn thành khung chuẩn, DB, API & Tests) |
| `feat/frontend-ui` | **Frontend UI/UX (React + Vite)** | `frontend/src/components/*.jsx` (Xem chi tiết tại [`frontend/README.md`](./frontend/README.md)) |
| `feat/cv-parser` | **AI Bóc tách CV (CV Parser)** | `ai/prompts/cv_extraction.txt` & `# TODO` trong `backend/app/services/cv_service.py` |
| `feat/matching-engine` | **AI Phân tích Kỹ năng (Matching)** | `ai/prompts/skill_gap_analysis.txt` & `backend/app/services/matching_service.py` |
| `feat/mock-interview` | **AI Phỏng vấn STAR (Mock Interview)** | `ai/prompts/star_interview_agent.txt` & `# TODO` trong `backend/app/services/interview_service.py` |
| `feat/curriculum-data` | **Dữ liệu Học phần NEU & Taxonomy** | `backend/app/services/curriculum_service.py` & `backend/app/data/skill_taxonomy.py` |

---

## Hướng dẫn Chạy Dự án

### 1. Chạy Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
..\venv\Scripts\activate   # hoặc .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Điền GEMINI_API_KEY vào file .env
uvicorn app.main:app --reload --port 8000
```
- **Swagger UI (Tài liệu API trực quan):** `http://localhost:8000/docs`
- **Chạy kiểm thử tự động:** `pytest`

### 2. Chạy Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Truy cập giao diện tại: `http://localhost:5173`

---

## Quy trình Làm việc với Git cho Nhóm

1. **Tải dự án về máy và chuyển sang nhánh được phân công:**
   ```bash
   git clone https://github.com/hamchoiluoilam/NEU-career-AI.git
   cd NEU-career-AI
   git checkout <tên-nhánh-của-bạn>
   ```
2. **Code phần việc của mình, commit và đẩy lên nhánh riêng:**
   ```bash
   git add .
   git commit -m "Mô tả ngắn gọn phần việc đã làm"
   git push origin <tên-nhánh-của-bạn>
   ```
3. **Tạo Pull Request (PR)** trên GitHub để ghép code vào nhánh `main`.
