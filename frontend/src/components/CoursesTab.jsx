import { careerApi } from '../services/api'

/**
 * Màn hình 4: Danh mục chương trình đào tạo NEU & Chuẩn đầu ra kỹ năng.
 *
 * Hướng dẫn triển khai:
 * 1. Khi mở tab, gọi `await careerApi.getCurriculum()`
 * 2. Hiển thị danh sách `courses`:
 *    - `code` (Mã học phần), `name` (Tên học phần), `credits` (Số tín chỉ)
 *    - `major` (Ngành/Khoa), `description` (Mô tả)
 *    - `skills_provided` (Danh sách kỹ năng chuẩn trang bị sau môn học)
 */
export default function CoursesTab() {
  void careerApi

  return (
    <section>
      <h2>4. Danh mục học phần NEU</h2>
      <p>TODO: Thiết kế danh sách tra cứu học phần NEU và các tag kỹ năng tương ứng.</p>
    </section>
  )
}
