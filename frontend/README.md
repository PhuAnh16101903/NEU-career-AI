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

* Giao diện chạy tại: `http://localhost:3000`
* Tài liệu Swagger API Backend: `http://127.0.0.1:8000/docs`

---

## 🧭 Lộ trình phát triển giao diện (`src/`)

1. **`src/services/api.js`**: Đã khai báo sẵn `careerApi` với 5 hàm gọi sang Backend (`uploadCV`, `matchSkills`, `startInterview`, `sendInterviewAnswer`, `getCurriculum`).
2. **`src/components/`**: Đã chia sẵn 4 file khung tương ứng với 4 màn hình chức năng (kèm chú thích các trường dữ liệu JSON cần hiển thị):
   * `CVTab.jsx`: Form tải file CV và hiển thị thông tin trích xuất.
   * `MatchingTab.jsx`: Form chọn vị trí ứng tuyển, vẽ biểu đồ Radar năng lực và hiển thị danh sách môn học NEU đề xuất.
   * `InterviewTab.jsx`: Giao diện phòng chat phỏng vấn với AI và bảng chấm điểm STAR.
   * `CoursesTab.jsx`: Danh mục học phần NEU và chuẩn đầu ra kỹ năng.
