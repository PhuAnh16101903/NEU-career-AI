
import { useState } from 'react'
import { careerApi } from '../services/api'

export default function CVTab({ cvData, onCvParsed }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (event) => {
    event.preventDefault()

    if (!file) {
      setError('Vui lòng chọn file CV trước khi tải lên.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await careerApi.uploadCV(file)
      onCvParsed(data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Không thể phân tích CV. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2>1. Phân tích CV</h2>
      <p>
        Tải CV định dạng PDF hoặc DOCX để hệ thống trích xuất
        thông tin và kỹ năng của bạn.
      </p>

      <form onSubmit={handleUpload}>
        <div>
          <label htmlFor="cv-file">Chọn file CV:</label>
          <input
            id="cv-file"
            type="file"
            accept=".pdf,.docx"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null)
              setError('')
            }}
          />
        </div>

        {file && <p>File đã chọn: {file.name}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Đang phân tích CV...' : 'Tải lên và phân tích'}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}

      {cvData && (
        <div>
          <h3>Kết quả phân tích CV</h3>

          <h4>Thông tin cá nhân</h4>
          <p>Họ tên: {cvData.full_name || 'Chưa trích xuất được'}</p>
          <p>Email: {cvData.email || 'Chưa trích xuất được'}</p>
          <p>Số điện thoại: {cvData.phone || 'Chưa trích xuất được'}</p>

          <h4>Kỹ năng ({cvData.skills?.length || 0})</h4>
          {cvData.skills?.length ? (
            <ul>
              {cvData.skills.map((skill, index) => (
                <li key={`${skill.name}-${index}`}>
                  {skill.name} — {skill.category}
                  {skill.level ? ` (${skill.level})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa trích xuất được kỹ năng.</p>
          )}

          <h4>Học vấn</h4>
          {cvData.education?.length ? (
            <ul>
              {cvData.education.map((item, index) => (
                <li key={index}>
                  {item.institution} — {item.major}
                  {item.gpa != null ? ` — GPA: ${item.gpa}` : ''}
                  {item.graduation_year
                    ? ` — Năm tốt nghiệp: ${item.graduation_year}`
                    : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa trích xuất được học vấn.</p>
          )}

          <h4>Kinh nghiệm làm việc</h4>
          {cvData.experiences?.length ? (
            <ul>
              {cvData.experiences.map((item, index) => (
                <li key={index}>
                  <strong>{item.title}</strong> — {item.company}
                  {item.duration ? ` (${item.duration})` : ''}
                  {item.description && <p>{item.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa trích xuất được kinh nghiệm làm việc.</p>
          )}

          <h4>Dự án ({cvData.projects?.length || 0})</h4>
          {cvData.projects?.length ? (
            <ul>
              {cvData.projects.map((item, index) => (
                <li key={index}>
                  <strong>{item.title}</strong>
                  {item.role && <p>Vai trò: {item.role}</p>}
                  {item.technologies?.length > 0 && (
                    <p>Công nghệ: {item.technologies.join(', ')}</p>
                  )}
                  {item.description && <p>{item.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa trích xuất được dự án.</p>
          )}

          {cvData.raw_summary && (
            <p>{cvData.raw_summary}</p>
          )}

          {cvData.warnings?.length > 0 && (
            <div>
              <h4>Lưu ý khi phân tích</h4>
              <ul>
                {cvData.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
