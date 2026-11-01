import { careerApi } from '../services/api'

/**
 * Màn hình 3: Phòng phỏng vấn mô phỏng & Chấm điểm STAR.
 *
 * Hướng dẫn triển khai:
 * 1. Form nhập `candidateName`, `targetRole` -> bấm nút gọi `await careerApi.startInterview(candidateName, targetRole)`
 * 2. Lưu `session_id` và hiển thị câu hỏi mở đầu `interviewer_reply` vào khung chat
 * 3. Khi sinh viên gửi câu trả lời: gọi `await careerApi.sendInterviewAnswer(sessionId, userAnswer)`
 * 4. Hiển thị bảng điểm STAR từ `current_evaluation`:
 *    - `situation_score`, `task_score`, `action_score`, `result_score` (thang điểm 10)
 *    - `feedback` (nhận xét chi tiết)
 */
export default function InterviewTab() {
  void careerApi

  return (
    <section>
      <h2>3. Phòng phỏng vấn mô phỏng (STAR)</h2>
      <p>TODO: Thiết kế giao diện khung chat phỏng vấn và thẻ hiển thị điểm STAR.</p>
    </section>
  )
}
