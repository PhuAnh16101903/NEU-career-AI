import { careerApi } from '../services/api'

/**
 * Màn hình 1: Tải lên và hiển thị kết quả phân tích CV.
 *
 * Hướng dẫn triển khai:
 * 1. Tạo ô chọn file (.pdf, .docx) và gọi `await careerApi.uploadCV(file)`
 * 2. Lưu kết quả vào state `cvData` qua callback `onCvParsed(data)`
 * 3. Hiển thị các trường từ API:
 *    - Thông tin cá nhân: `full_name`, `email`, `phone`
 *    - Danh sách kỹ năng: `skills` -> `[{ name, category }]`
 *    - Học vấn & Kinh nghiệm: `education`, `experiences`
 */
export default function CVTab({ cvData, onCvParsed }) {
  void careerApi
  void onCvParsed

  return (
    <section>
      <h2>1. Phân tích CV</h2>
      <p>TODO: Thiết kế form upload CV (.pdf/.docx) và bảng hiển thị thông tin trích xuất.</p>
      {cvData && <pre>{JSON.stringify(cvData, null, 2)}</pre>}
    </section>
  )
}
