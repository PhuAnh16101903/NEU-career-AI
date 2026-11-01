# 🎨 NEU Career AI — Frontend

Khung khởi tạo giao diện Web (React + Vite).

---

## 🚀 Chạy môi trường phát triển

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

* Giao diện chạy tại: `http://localhost:3000` (hoặc `http://localhost:5173`)
* Tài liệu Swagger API Backend: `http://127.0.0.1:8000/docs`

---

## 🧭 Lộ trình phát triển giao diện (`src/`)

1. **`src/services/api.js`**: Đã khai báo sẵn `careerApi` với đầy đủ các hàm gọi sang Backend cho cả **3 Actor** (`login`, `register`, `getMe`, `uploadCV`, `matchSkills`, `startInterview`, `sendInterviewAnswer`, `getCurriculum`, `getEnterpriseJobs`, `createEnterpriseJob`, `applyEnterpriseJob`, `getJobCandidates`, `getAdminStats`, `getAdminUsers`).
2. **`src/components/`**: Đã chia sẵn 5 file khung tương ứng với các màn hình chức năng (kèm chú thích `# TODO` và các trường dữ liệu JSON cần hiển thị):
   * `AuthTab.jsx`: Form **Đăng nhập / Đăng ký** (chọn vai trò `student` hoặc `enterprise`), tài khoản mẫu 3 Actor (`phu@st.neu.edu.vn`, `hr@fpt.com`, `admin@neu.edu.vn` - mật khẩu `123456`) và bảng điều khiển Doanh nghiệp / Admin.
   * `CVTab.jsx`: Form tải file CV và hiển thị thông tin trích xuất.
   * `MatchingTab.jsx`: Form chọn vị trí ứng tuyển, vẽ biểu đồ Radar năng lực và hiển thị danh sách môn học NEU đề xuất.
   * `InterviewTab.jsx`: Giao diện phòng chat phỏng vấn với AI và bảng chấm điểm STAR.
   * `CoursesTab.jsx`: Danh mục học phần NEU và chuẩn đầu ra kỹ năng.
