# CV mẫu

Thư mục gồm 12 CV **hư cấu, tạo riêng để kiểm thử** workflow CV của NEU Career AI. Tệp DOCX được chọn vì backend hiện hỗ trợ trực tiếp `.docx` và `.pdf`; thông tin liên hệ dùng miền `example.com`, không phải dữ liệu của người thật.

## Danh sách

| Tệp | Hồ sơ minh họa | Kỹ năng chính có trong nội dung |
|---|---|---|
| `cv_01_data_analyst.docx` | Phân tích dữ liệu bán lẻ | SQL, Python, Excel, Power BI, Thống kê |
| `cv_02_data_analyst.docx` | Phân tích dữ liệu vận hành | SQL, Excel, Tableau, Python |
| `cv_03_data_analyst.docx` | Phân tích dữ liệu khảo sát | Python, SQL, Thống kê, Tableau |
| `cv_04_data_analyst.docx` | Báo cáo kinh doanh | SQL, Excel, Power BI, Giao tiếp |
| `cv_05_business_analyst.docx` | Phân tích nghiệp vụ thương mại điện tử | Business Analysis, BPMN, Viết tài liệu BRD, Phân tích yêu cầu |
| `cv_06_business_analyst.docx` | Phân tích nghiệp vụ ngân hàng số | Business Analysis, BPMN, SQL, Giao tiếp |
| `cv_07_software_engineer.docx` | Phát triển ứng dụng web | JavaScript, Git, SQL, Database Design |
| `cv_08_software_engineer.docx` | Phát triển dịch vụ dữ liệu | Python, Java, Git, PostgreSQL, Database Design |
| `cv_09_digital_marketing.docx` | Nội dung và hiệu quả chiến dịch | Excel, Power BI, Thống kê, Tiếng Anh |
| `cv_10_digital_marketing.docx` | Marketing số và phân tích khách hàng | SQL, Excel, Tableau, Thuyết trình |
| `cv_11_finance.docx` | Phân tích tài chính doanh nghiệp | Excel, Python, Quantitative Analysis, Thống kê |
| `cv_12_finance.docx` | Nghiệp vụ ngân hàng và fintech | Excel, SQL, Fintech, Tiếng Anh |

## Dùng thử

1. Mở giao diện hoặc Swagger UI của backend.
2. Tải một tệp `.docx` lên API `POST /api/cv/upload` để xem tên, email và kỹ năng được nhận diện.
3. Dùng kỹ năng trả về làm `candidate_skills` cho `POST /api/analysis/match` hoặc ứng tuyển vào JD mẫu.
4. So sánh kỹ năng nhận diện được với mục “Kỹ năng chính” ở bảng trên. Đây là nhãn kiểm thử thủ công, không phải đầu ra cam kết của parser.

Backend hiện chỉ bóc tách tên/email/kỹ năng theo heuristic; học vấn và kinh nghiệm trong CV là nội dung đọc được nhưng chưa có trong kết quả API (API trả `is_mock: true` và cảnh báo tương ứng). Không dùng dữ liệu này để đánh giá hiệu năng OCR hoặc suy luận LLM.
