
import { useEffect, useMemo, useState } from 'react'
import { careerApi } from '../services/api'

function getSkillNames(skills) {
  if (!Array.isArray(skills)) return []

  return skills
    .map((skill) => {
      if (typeof skill === 'string') return skill.trim()
      return skill?.name?.trim() || ''
    })
    .filter(Boolean)
}

function RadarChart({ data }) {
  if (!data?.length) {
    return <p>Chưa có dữ liệu biểu đồ.</p>
  }

  const size = 320
  const center = size / 2
  const radius = 105
  const count = data.length
  const angleFor = (index) => (Math.PI * 2 * index) / count - Math.PI / 2

  const pointFor = (index, value) => {
    const angle = angleFor(index)
    const distance = (Math.max(0, Math.min(100, value)) / 100) * radius

    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    }
  }

  const polygonFor = (field) =>
    data
      .map((item, index) => {
        const point = pointFor(index, item[field])
        return `${point.x},${point.y}`
      })
      .join(' ')

  return (
    <div className="matching-radar-wrapper">
      <svg
        className="matching-radar"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Biểu đồ radar so sánh kỹ năng ứng viên và yêu cầu công việc"
      >
        {[20, 40, 60, 80, 100].map((level) => {
          const points = data
            .map((_, index) => {
              const point = pointFor(index, level)
              return `${point.x},${point.y}`
            })
            .join(' ')

          return (
            <polygon
              key={level}
              points={points}
              className="matching-radar-grid"
            />
          )
        })}

        {data.map((item, index) => {
          const point = pointFor(index, 100)
          return (
            <line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              className="matching-radar-axis"
            />
          )
        })}

        <polygon
          points={polygonFor('job_requirement_score')}
          className="matching-radar-requirement"
        />

        <polygon
          points={polygonFor('candidate_score')}
          className="matching-radar-candidate"
        />

        {data.map((item, index) => {
          const point = pointFor(index, 100)
          const labelPoint = pointFor(index, 118)

          return (
            <g key={item.category_name}>
              <circle
                cx={pointFor(index, item.candidate_score).x}
                cy={pointFor(index, item.candidate_score).y}
                r="3.5"
                className="matching-radar-dot"
              />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                className="matching-radar-label"
                textAnchor={
                  labelPoint.x < center - 10
                    ? 'end'
                    : labelPoint.x > center + 10
                      ? 'start'
                      : 'middle'
                }
                dominantBaseline="middle"
              >
                {item.category_name}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="matching-radar-legend">
        <span>
          <i className="matching-legend-candidate" />
          Kỹ năng ứng viên
        </span>
        <span>
          <i className="matching-legend-requirement" />
          Yêu cầu công việc
        </span>
      </div>
    </div>
  )
}

function SkillList({ title, skills, type, emptyText }) {
  return (
    <div className={`matching-skill-card matching-skill-${type}`}>
      <h4>{title}</h4>

      {skills?.length ? (
        <div className="matching-skill-tags">
          {skills.map((skill, index) => (
            <span key={`${skill}-${index}`}>{skill}</span>
          ))}
        </div>
      ) : (
        <p className="matching-empty">{emptyText}</p>
      )}
    </div>
  )
}

export default function MatchingTab({ cvData }) {
  const [jobTitle, setJobTitle] = useState('Junior Data Analyst')
  const [jobDescription, setJobDescription] = useState('')
  const [skillsText, setSkillsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // Tự động lấy kỹ năng từ CV khi CV được tải lên hoặc phân tích lại.
  useEffect(() => {
    const names = getSkillNames(cvData?.skills)

    if (names.length) {
      setSkillsText(names.join(', '))
    }
  }, [cvData])

  const candidateSkills = useMemo(
    () =>
      [...new Set(
        skillsText
          .split(/[,;\n]+/)
          .map((skill) => skill.trim())
          .filter(Boolean)
      )],
    [skillsText]
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!jobTitle.trim()) {
      setError('Vui lòng nhập vị trí ứng tuyển.')
      return
    }

    if (!candidateSkills.length) {
      setError('Vui lòng nhập ít nhất một kỹ năng hoặc tải CV trước.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await careerApi.matchSkills({
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        candidateSkills,
      })

      setResult(data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Không thể phân tích mức độ phù hợp. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  const score = Number(result?.overall_match_percentage ?? 0)

  const scoreLabel =
    score >= 80
      ? 'Rất phù hợp'
      : score >= 60
        ? 'Khá phù hợp'
        : score >= 40
          ? 'Cần bổ sung kỹ năng'
          : 'Cần cải thiện nhiều'

  const explanations = useMemo(
    () =>
      new Map(
        (result?.course_explanations || []).map((item) => [
          item.course_code,
          item.explanation,
        ])
      ),
    [result]
  )

  return (
    <section className="matching-page">
      <div className="matching-heading">
        <h2>2. So khớp kỹ năng & Lộ trình môn học NEU</h2>
        <p>
          Đối chiếu kỹ năng hiện tại với yêu cầu tuyển dụng,
          xác định khoảng cách kỹ năng và tìm các học phần NEU phù hợp.
        </p>
      </div>

      <form className="matching-form" onSubmit={handleSubmit}>
        <h3>Thông tin vị trí ứng tuyển</h3>

        <div className="matching-form-group">
          <label htmlFor="matching-job-title">
            Vị trí ứng tuyển
          </label>
          <input
            id="matching-job-title"
            type="text"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="Ví dụ: Junior Data Analyst"
            required
          />
        </div>

        <div className="matching-form-group">
          <label htmlFor="matching-job-description">
            Mô tả công việc (JD) – không bắt buộc
          </label>
          <textarea
            id="matching-job-description"
            rows="5"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Dán mô tả công việc hoặc các yêu cầu kỹ năng tại đây..."
          />
          <small>
            Nếu bỏ trống, hệ thống sẽ sử dụng bộ kỹ năng mặc định theo vị trí.
          </small>
        </div>

        <div className="matching-form-group">
          <label htmlFor="matching-skills">
            Kỹ năng hiện tại
          </label>
          <textarea
            id="matching-skills"
            rows="4"
            value={skillsText}
            onChange={(event) => setSkillsText(event.target.value)}
            placeholder="Python, SQL, Excel, Power BI..."
          />
          <small>
            Có thể nhập nhiều kỹ năng, phân cách bằng dấu phẩy hoặc xuống dòng.
            {cvData?.skills?.length
              ? ' Kỹ năng đã được lấy từ CV; bạn có thể chỉnh sửa.'
              : ' Bạn có thể tải CV ở mục Phân tích CV để tự động điền.'}
          </small>
          <div className="matching-skill-count">
            {candidateSkills.length} kỹ năng sẽ được gửi đi
          </div>
        </div>

        {error && (
          <div className="matching-error" role="alert">
            {error}
          </div>
        )}

        <button
          className="matching-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Đang phân tích kỹ năng...' : 'Phân tích mức độ phù hợp'}
        </button>
      </form>

      {result && (
        <div className="matching-results">
          <div className="matching-section-heading">
            <h3>Kết quả phân tích</h3>
            <p>
              Nguồn yêu cầu:{' '}
              {result.requirements_source === 'job_description'
                ? 'Mô tả công việc bạn cung cấp'
                : 'Bộ yêu cầu mặc định theo vị trí'}
            </p>
          </div>

          <div className="matching-score-card">
            <div>
              <span className="matching-score-caption">
                Mức độ phù hợp tổng thể
              </span>
              <div className="matching-score-value">
                {score.toFixed(1)}%
              </div>
              <strong>{scoreLabel}</strong>
            </div>

            <div className="matching-score-track">
              <div
                className="matching-score-fill"
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
          </div>

          <div className="matching-section">
            <h3>Phân tích theo nhóm kỹ năng</h3>
            <RadarChart data={result.radar_chart_data} />
          </div>

          <div className="matching-section">
            <h3>Đối chiếu kỹ năng</h3>
            <div className="matching-skill-grid">
              <SkillList
                title={`Kỹ năng đã đáp ứng (${result.matched_skills?.length || 0})`}
                skills={result.matched_skills}
                type="matched"
                emptyText="Chưa có kỹ năng phù hợp."
              />

              <SkillList
                title={`Kỹ năng còn thiếu (${result.missing_skills?.length || 0})`}
                skills={result.missing_skills}
                type="missing"
                emptyText="Không còn kỹ năng thiếu theo yêu cầu."
              />

              <SkillList
                title={`Kỹ năng chưa nhận diện (${result.unrecognized_skills?.length || 0})`}
                skills={result.unrecognized_skills}
                type="unrecognized"
                emptyText="Tất cả kỹ năng đã được nhận diện."
              />
            </div>
          </div>

          <div className="matching-section">
            <h3>Môn học NEU được đề xuất</h3>

            {result.recommended_neu_courses?.length ? (
              <div className="matching-course-list">
                {result.recommended_neu_courses.map((course) => (
                  <article
                    className="matching-course-card"
                    key={course.course_code}
                  >
                    <div className="matching-course-header">
                      <div>
                        <span className="matching-course-code">
                          {course.course_code}
                        </span>
                        <h4>{course.course_name}</h4>
                      </div>
                      <span className="matching-course-credits">
                        {course.credits} tín chỉ
                      </span>
                    </div>

                    <p className="matching-course-department">
                      Khoa/bộ môn: {course.department}
                    </p>

                    {course.skills_covered?.length > 0 && (
                      <div className="matching-course-skills">
                        <strong>Kỹ năng có thể bổ sung:</strong>
                        <div className="matching-skill-tags">
                          {course.skills_covered.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {course.reason && (
                      <p className="matching-course-reason">
                        {course.reason}
                      </p>
                    )}

                    {explanations.get(course.course_code) && (
                      <p className="matching-course-explanation">
                        <strong>Phân tích AI:</strong>{' '}
                        {explanations.get(course.course_code)}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="matching-empty">
                Chưa có môn học NEU phù hợp được đề xuất.
              </p>
            )}
          </div>

          {result.general_advice && (
            <div className="matching-section matching-advice">
              <h3>Lời khuyên tổng quan</h3>
              <p>{result.general_advice}</p>
            </div>
          )}

          {result.skill_gap_analysis && (
            <div className="matching-section matching-advice">
              <h3>Phân tích khoảng cách kỹ năng</h3>
              <p>{result.skill_gap_analysis}</p>
            </div>
          )}

          {result.learning_roadmap?.length > 0 && (
            <div className="matching-section">
              <h3>Lộ trình học tập đề xuất</h3>
              <ol className="matching-roadmap">
                {result.learning_roadmap.map((step, index) => (
                  <li key={`${index}-${step}`}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
