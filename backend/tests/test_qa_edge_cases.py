"""
TODO (Nhánh feat/qa-deploy — QA & Deploy):

1. Phần Kiểm thử Tự động (Automated QA Tests):
   Viết thêm các hàm `test_...` bên dưới sử dụng `client` (FastAPI TestClient) để kiểm thử:
   - [ ] `test_curriculum_items_structure`: Gọi `GET /api/curriculum`, kiểm tra mỗi môn học đều có
         `code`, `name`, `credits > 0` và `skills_provided` không rỗng.
   - [ ] `test_match_validation_empty_job_title`: Gửi `POST /api/analysis/match` với `job_title=""`
         -> kỳ vọng status code `422`.
   - [ ] `test_interview_start_invalid_type`: Gửi `POST /api/interview/start` với `interview_type`
         không hợp lệ -> kỳ vọng status code `422`.
   - [ ] `test_interview_chat_empty_answer`: Gửi `POST /api/interview/chat` với `user_answer=""`
         -> kỳ vọng status code `422`.
   - [ ] `test_cv_upload_invalid_extensions`: Thử upload file `.png` hoặc `.exe` vào `POST /api/cv/upload`
         -> kỳ vọng status code `400`.

2. Phần CI/CD & Đóng gói Triển khai (DevOps / Deploy):
   - [ ] Mở `.github/workflows/ci.yml`: Hoàn thiện phần `# TODO` để thêm job `frontend-build` vào CI/CD.
   - [ ] Tạo `backend/Dockerfile` để đóng gói FastAPI server (cổng 8000).
   - [ ] Tạo `frontend/Dockerfile` để đóng gói giao diện React + Vite (cổng 5173).
   - [ ] Tạo `docker-compose.yml` ở thư mục gốc để chạy đồng thời cả Backend và Frontend.
"""


def test_health_endpoint_ready_for_deploy(client):
    """Kiểm tra endpoint /health phục vụ giám sát khi deploy lên server."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
