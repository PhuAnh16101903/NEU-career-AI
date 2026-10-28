import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
})

/**
 * Các hàm gọi API Backend đã được khai báo sẵn đường dẫn.
 * Xem chi tiết cấu trúc JSON trả về tại: http://127.0.0.1:8000/docs
 */
export const careerApi = {
  // 1. Upload file CV (.pdf / .docx) -> trả về { full_name, email, phone, skills, education, experiences }
  uploadCV: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post('/cv/upload', formData)
    return data
  },

  // 2. So khớp kỹ năng -> trả về { overall_match_percentage, matched_skills, missing_skills, radar_chart_data, recommended_neu_courses }
  matchSkills: async ({ jobTitle, jobDescription, candidateSkills }) => {
    const { data } = await apiClient.post('/analysis/match', {
      job_title: jobTitle,
      target_job_description: jobDescription || null,
      candidate_skills: candidateSkills,
    })
    return data
  },

  // 3. Khởi tạo phỏng vấn -> trả về { session_id, turn_index, interviewer_reply }
  startInterview: async (candidateName, targetRole) => {
    const { data } = await apiClient.post('/interview/start', {
      candidate_name: candidateName,
      target_role: targetRole,
      interview_type: 'mixed',
    })
    return data
  },

  // 4. Gửi câu trả lời phỏng vấn -> trả về { interviewer_reply, current_evaluation, is_finished, overall_summary }
  sendInterviewAnswer: async (sessionId, userAnswer) => {
    const { data } = await apiClient.post('/interview/chat', {
      session_id: sessionId,
      user_answer: userAnswer,
    })
    return data
  },

  // 5. Lấy danh sách môn học NEU -> trả về { total, courses }
  getCurriculum: async () => {
    const { data } = await apiClient.get('/curriculum')
    return data
  },
}
