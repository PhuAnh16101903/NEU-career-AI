import { careerApi } from '../services/api'

/**
 * Màn hình 2: So khớp năng lực ứng viên với JD & Gợi ý môn học NEU.
 *
 * Hướng dẫn triển khai:
 * 1. Tạo ô nhập `jobTitle`, `jobDescription` (tùy chọn), và danh sách `candidateSkills` (lấy từ `cvData.skills` hoặc nhập tay)
 * 2. Gọi `await careerApi.matchSkills({ jobTitle, jobDescription, candidateSkills })`
 * 3. Hiển thị kết quả trả về:
 *    - Độ phù hợp tổng thể: `overall_match_percentage` (%)
 *    - Biểu đồ năng lực: `radar_chart_data` -> `[{ category_name, candidate_score, job_requirement_score }]`
 *    - Kỹ năng đã đạt / còn thiếu: `matched_skills`, `missing_skills`
 *    - Môn học NEU đề xuất: `recommended_neu_courses` -> `[{ course_code, course_name, credits, reason }]`
 */
export default function MatchingTab({ cvData }) {
  void careerApi
  void cvData

  return (
    <section>
      <h2>2. So khớp Kỹ năng & Lộ trình môn học NEU</h2>
      <p>TODO: Thiết kế form nhập vị trí ứng tuyển, biểu đồ Radar và danh sách môn học NEU đề xuất.</p>
    </section>
  )
}
