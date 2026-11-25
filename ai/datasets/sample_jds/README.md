# JD mẫu

Thư mục gồm 5 JD dạng `.txt`, mỗi vị trí một tệp: Data Analyst, Business Analyst, Software Engineer, Digital Marketing và Chuyên viên Tài chính - Ngân hàng. Nội dung được **tổng hợp hư cấu để kiểm thử**, không sao chép từ TopCV, VietnamWorks, LinkedIn hay nhà tuyển dụng cụ thể.

Các JD sử dụng kỹ năng trong `backend/app/data/skill_taxonomy.py` để backend có thể tự trích yêu cầu. Vì taxonomy hiện chưa có kỹ năng chuyên ngành marketing, JD Digital Marketing dùng thêm các kỹ năng hiện được hỗ trợ (Excel, Power BI, Thống kê, Giao tiếp, Thuyết trình và Tiếng Anh).

## Dùng thử

- Dán toàn bộ nội dung tệp vào trường mô tả JD khi tạo tin tuyển dụng; hoặc
- gửi `job_title`, `target_job_description` (toàn văn JD) và `candidate_skills` tới `POST /api/analysis/match`.

JD dùng văn bản thuần để dễ đọc, kiểm tra và dán vào API; backend hiện không có endpoint tải tệp JD. Các kỹ năng nhận diện được phụ thuộc taxonomy, không phải mọi từ khóa trong JD.
