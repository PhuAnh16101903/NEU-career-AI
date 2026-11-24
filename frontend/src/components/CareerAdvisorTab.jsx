
import { useState } from 'react'
import { careerApi } from '../services/api'

export default function CareerAdvisorTab({ cvData }) {
  const [form, setForm] = useState({
    skills: '',
    major: 'Công nghệ thông tin',
    study_year: '2',
    interests: '',
    career_goals: '',
    education: '',
    experiences: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    const payload = {
      skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
      major: form.major.trim() || null,
      study_year: form.study_year ? Number(form.study_year) : null,
      interests: form.interests.split(',').map((item) => item.trim()).filter(Boolean),
      career_goals: form.career_goals.trim() || null,
      education: form.education.split('\n').map((item) => item.trim()).filter(Boolean),
      experiences: form.experiences.split('\n').map((item) => item.trim()).filter(Boolean),
    }

    try {
      const data = await careerApi.adviseCareer(payload)
      setResult(data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Không thể thực hiện tư vấn. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  const renderTags = (items, type = '') => {
    if (!items?.length) return <p>Chưa có dữ liệu.</p>

    return (
      <div className="career-tags">
        {items.map((item, index) => (
          <span className={`career-tag ${type}`} key={`${item}-${index}`}>
            {item}
          </span>
        ))}
      </div>
    )
  }

  return (
    <section className="career-page">
      <div className="career-hero">
        <h2>Tư vấn định hướng nghề nghiệp</h2>
        <p>
          Khám phá nghề nghiệp phù hợp, đánh giá kỹ năng hiện tại
          và xây dựng lộ trình phát triển dành cho bạn.
        </p>
      </div>

      {cvData?.skills?.length > 0 && (
        <div className="career-notice">
          CV đã có dữ liệu kỹ năng. Hãy tham khảo và nhập các kỹ năng
          phù hợp vào biểu mẫu bên dưới.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="career-card">
          <h3>01. Thông tin học tập</h3>

          <div className="career-form-grid">
            <div className="career-field">
              <label htmlFor="major">Ngành học</label>
              <input
                id="major"
                name="major"
                value={form.major}
                onChange={handleChange}
                placeholder="Ví dụ: Công nghệ thông tin"
              />
            </div>

            <div className="career-field">
              <label htmlFor="study_year">Năm học</label>
              <select
                id="study_year"
                name="study_year"
                value={form.study_year}
                onChange={handleChange}
              >
                {[1, 2, 3, 4, 5, 6].map((year) => (
                  <option key={year} value={year}>
                    Năm {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="career-field full-width">
              <label htmlFor="education">Học vấn</label>
              <textarea
                id="education"
                name="education"
                value={form.education}
                onChange={handleChange}
                placeholder="Mỗi dòng là một thông tin học vấn"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="career-card">
          <h3>02. Kỹ năng và sở thích</h3>

          <div className="career-form-grid">
            <div className="career-field full-width">
              <label htmlFor="skills">Kỹ năng hiện có</label>
              <input
                id="skills"
                name="skills"
                value={form.skills}
                onChange={handleChange}
                placeholder="Python, SQL, Java, HTML, CSS..."
              />
              <small>Phân cách các kỹ năng bằng dấu phẩy.</small>
            </div>

            <div className="career-field full-width">
              <label htmlFor="interests">Lĩnh vực quan tâm</label>
              <input
                id="interests"
                name="interests"
                value={form.interests}
                onChange={handleChange}
                placeholder="Backend, An ninh mạng, AI..."
              />
            </div>

            <div className="career-field full-width">
              <label htmlFor="career_goals">Mục tiêu nghề nghiệp</label>
              <textarea
                id="career_goals"
                name="career_goals"
                value={form.career_goals}
                onChange={handleChange}
                placeholder="Bạn mong muốn trở thành ai trong tương lai?"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="career-card">
          <h3>03. Kinh nghiệm và dự án</h3>

          <div className="career-field">
            <label htmlFor="experiences">Kinh nghiệm thực tế</label>
            <textarea
              id="experiences"
              name="experiences"
              value={form.experiences}
              onChange={handleChange}
              placeholder="Mỗi dòng là một dự án, kinh nghiệm hoặc hoạt động..."
              rows={4}
            />
          </div>
        </div>

        <button className="career-submit" type="submit" disabled={loading}>
          {loading ? 'Đang phân tích hồ sơ...' : 'Phân tích định hướng nghề nghiệp'}
        </button>
      </form>

      {error && <p className="career-error" role="alert">{error}</p>}

      {result && (
        <div className="career-result">
          <h2 className="career-result-title">Kết quả tư vấn</h2>

          {result.is_mock && (
            <div className="career-notice">
              Đây là kết quả mô phỏng từ dữ liệu mẫu. Chưa phải kết quả
              được tạo bởi Gemini AI hoặc dữ liệu tuyển dụng thực tế.
            </div>
          )}

          <div className="career-card">
            <h3>Hồ sơ nghề nghiệp</h3>
            <p>{result.career_profile}</p>
          </div>

          <div className="career-card">
            <h3>Nghề nghiệp được đề xuất</h3>

            {result.career_recommendations?.map((role, index) => {
              const match = role.required_skills?.length
                ? Math.round(
                    ((role.required_skills.length - role.skills_to_develop.length) /
                      role.required_skills.length) * 100
                  )
                : 0

              return (
                <div className="career-role" key={`${role.job_title}-${index}`}>
                  <h4>{role.job_title}</h4>
                  <p>{role.suitability_reason}</p>

                  <strong>Mức độ kỹ năng đáp ứng: {match}%</strong>
                  <div
                    className="career-progress"
                    role="progressbar"
                    aria-valuenow={match}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="career-progress-bar"
                      style={{ width: `${match}%` }}
                    />
                  </div>

                  <p><strong>Kỹ năng cần có</strong></p>
                  {renderTags(role.required_skills)}

                  <p><strong>Kỹ năng cần phát triển</strong></p>
                  {renderTags(role.skills_to_develop, 'missing')}
                </div>
              )
            })}
          </div>

          <div className="career-card">
            <h3>Kỹ năng nên ưu tiên phát triển</h3>
            {renderTags(result.skill_development, 'missing')}
          </div>

          <div className="career-card">
            <h3>Lộ trình học tập</h3>
            <ol className="career-roadmap">
              {result.learning_roadmap?.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="career-card">
            <h3>Học phần được gợi ý</h3>

            {result.recommended_courses?.length ? (
              renderTags(result.recommended_courses)
            ) : (
              <p>Chưa có học phần phù hợp trong dữ liệu hiện tại.</p>
            )}

            {result.is_mock && (
              <p className="career-notice">
                Lưu ý: Danh sách học phần hiện sử dụng dữ liệu mẫu,
                cần đối chiếu chương trình đào tạo NEU trước khi đăng ký.
              </p>
            )}
          </div>

          <div className="career-card">
            <h3>Lời khuyên</h3>
            <p>{result.general_advice}</p>
          </div>
        </div>
      )}
    </section>
  )
}
