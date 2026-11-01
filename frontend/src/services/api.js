import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
})

/**
 * Gắn (hoặc xóa) Bearer Token vào header mặc định sau khi người dùng Đăng nhập / Đăng ký.
 */
export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common.Authorization
  }
}

/**
 * Các hàm gọi API Backend đã được khai báo sẵn đường dẫn.
 * Xem chi tiết cấu trúc JSON trả về tại: http://127.0.0.1:8000/docs
 */
export const careerApi = {
  // --- A. Xác thực & Phân quyền 3 Actor (student, enterprise, admin) ---
  // Tài khoản mẫu: phu@st.neu.edu.vn | hr@fpt.com | admin@neu.edu.vn (Mật khẩu chung: 123456)
  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password })
    setAuthToken(data.access_token)
    return data
  },

  // payload: { email, password, full_name, role: 'student' | 'enterprise', company_name?, student_major? }
  register: async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload)
    setAuthToken(data.access_token)
    return data
  },

  getMe: async () => {
    const { data } = await apiClient.get('/auth/me')
    return data
  },

  // --- B. Chức năng dành cho Sinh viên (student) ---
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

  // --- C. Chức năng Doanh nghiệp & Tuyển dụng (enterprise / student) ---
  getEnterpriseJobs: async () => {
    const { data } = await apiClient.get('/enterprise/jobs')
    return data
  },

  createEnterpriseJob: async ({ title, companyName, description, requiredSkills }) => {
    const { data } = await apiClient.post('/enterprise/jobs', {
      title,
      company_name: companyName || null,
      description,
      required_skills: requiredSkills || null,
    })
    return data
  },

  applyEnterpriseJob: async (jobId, candidateSkills) => {
    const { data } = await apiClient.post(`/enterprise/jobs/${jobId}/apply`, {
      candidate_skills: candidateSkills,
    })
    return data
  },

  getJobCandidates: async (jobId) => {
    const { data } = await apiClient.get(`/enterprise/jobs/${jobId}/candidates`)
    return data
  },

  // --- D. Chức năng Quản trị viên (admin) ---
  getAdminStats: async () => {
    const { data } = await apiClient.get('/admin/stats')
    return data
  },

  getAdminUsers: async (role) => {
    const { data } = await apiClient.get('/admin/users', { params: role ? { role } : {} })
    return data
  },
}
