
import { useEffect, useState } from 'react'
import { careerApi } from '../services/api'

const SESSION_STORAGE_KEY = 'neu_career_ai_interview_session'

const STAR_ITEMS = [
  { key: 'situation_score', label: 'Situation', description: 'Bối cảnh' },
  { key: 'task_score', label: 'Task', description: 'Nhiệm vụ' },
  { key: 'action_score', label: 'Action', description: 'Hành động' },
  { key: 'result_score', label: 'Result', description: 'Kết quả' },
]

function StarEvaluation({ evaluation }) {
  if (!evaluation) return null

  const scores = STAR_ITEMS.map((item) => evaluation[item.key] ?? 0)
  const average = scores.reduce((sum, score) => sum + score, 0) / 4

  return (
    <div className="interview-evaluation">
      <h3>Đánh giá STAR</h3>

      <div className="interview-star-grid">
        {STAR_ITEMS.map((item) => (
          <div className="interview-star-item" key={item.key}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
            <b>{evaluation[item.key] ?? 0}/10</b>
          </div>
        ))}
      </div>

      <div className="interview-average">
        Điểm trung bình lượt trả lời: <strong>{average.toFixed(1)}/10</strong>
      </div>

      {evaluation.feedback && (
        <div className="interview-feedback">
          <strong>Nhận xét:</strong>
          <p>{evaluation.feedback}</p>
        </div>
      )}
    </div>
  )
}

export default function InterviewTab() {
  const [candidateName, setCandidateName] = useState('')
  const [targetRole, setTargetRole] = useState('Junior Data Analyst')
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [answer, setAnswer] = useState('')
  const [overallSummary, setOverallSummary] = useState('')
  const [isFinished, setIsFinished] = useState(false)
  // true: có lượt dùng fallback
  // false: đã xác nhận không có fallback trong phiên mới
  // null: phiên cũ không có dữ liệu để xác định
  const [usedFallback, setUsedFallback] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Khôi phục phiên phỏng vấn gần nhất nếu có.
  useEffect(() => {
    const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY)

    if (!savedSessionId) return

    let cancelled = false

    const restoreSession = async () => {
      try {
        const data = await careerApi.getInterviewSession(savedSessionId)

        if (cancelled) return

        setSessionId(data.session_id)
        setCandidateName(data.candidate_name)
        setTargetRole(data.target_role)
        const history = data.history || []

        setMessages(history)
        setEvaluations(data.evaluations || [])
        setIsFinished(data.is_finished)

        // Tin nhắn assistant đầu tiên là lời chào, không phải lượt đánh giá.
        const assistantReplies = history.filter(
          (message, index) => index > 0 && message.role === 'assistant'
        )

        // Kiểm tra backend đã lưu is_mock cho tất cả phản hồi chưa.
        const hasCompleteMetadata = assistantReplies.every(
          (message) => typeof message.is_mock === 'boolean'
        )

        const hasFallbackInHistory = assistantReplies.some(
          (message) => message.is_mock === true
        )

        const savedFallback = localStorage.getItem(
          `${SESSION_STORAGE_KEY}_fallback_${data.session_id}`
        )

        // Ưu tiên dữ liệu backend; giữ lại thông tin fallback cũ nếu có.
        setUsedFallback(
          hasFallbackInHistory
            ? true
            : hasCompleteMetadata
              ? false
              : savedFallback === 'true'
                ? true
                : null
        )
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  const handleStartInterview = async (event) => {
    event.preventDefault()

    if (!candidateName.trim() || !targetRole.trim()) {
      setError('Vui lòng nhập tên và vị trí ứng tuyển.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await careerApi.startInterview(
        candidateName.trim(),
        targetRole.trim()
      )

      setSessionId(data.session_id)
      setMessages([
        { role: 'assistant', content: data.interviewer_reply },
      ])
      setEvaluations([])
      setOverallSummary('')
      setIsFinished(false)
      setUsedFallback(false)

      localStorage.setItem(
        `${SESSION_STORAGE_KEY}_fallback_${data.session_id}`,
        'false'
      )
      setAnswer('')

      localStorage.setItem(SESSION_STORAGE_KEY, data.session_id)
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Không thể bắt đầu phỏng vấn. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSendAnswer = async (event) => {
    event.preventDefault()

    if (!answer.trim() || !sessionId || isFinished) return

    const submittedAnswer = answer.trim()

    setLoading(true)
    setError('')

    // Hiển thị câu trả lời ngay trên giao diện.
    setMessages((previous) => [
      ...previous,
      { role: 'user', content: submittedAnswer },
    ])
    setAnswer('')

    try {
      const data = await careerApi.sendInterviewAnswer(
        sessionId,
        submittedAnswer
      )

      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: data.interviewer_reply },
      ])

      if (data.current_evaluation) {
        setEvaluations((previous) => [
          ...previous,
          data.current_evaluation,
        ])
      }

      setIsFinished(data.is_finished)

      // Tổng hợp trạng thái fallback của toàn bộ phiên.
      const nextUsedFallback =
        usedFallback === null
          ? (data.is_mock === true ? true : null)
          : usedFallback || data.is_mock === true

      setUsedFallback(nextUsedFallback)

      localStorage.setItem(
        `${SESSION_STORAGE_KEY}_fallback_${sessionId}`,
        nextUsedFallback === null ? 'unknown' : String(nextUsedFallback)
      )

      if (data.overall_summary) {
        setOverallSummary(data.overall_summary)
      }
    } catch (err) {
      // Khôi phục câu trả lời vào ô nhập nếu gửi thất bại.
      setAnswer(submittedAnswer)
      setMessages((previous) => previous.slice(0, -1))
      setError(
        err.response?.data?.detail || 'Không thể gửi câu trả lời. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleNewInterview = () => {
    if (sessionId) {
      localStorage.removeItem(
        `${SESSION_STORAGE_KEY}_fallback_${sessionId}`
      )
    }
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setSessionId('')
    setMessages([])
    setEvaluations([])
    setAnswer('')
    setOverallSummary('')
    setIsFinished(false)
    setUsedFallback(false)
    setError('')
  }

  return (
    <section className="interview-container">
      <div className="interview-header">
        <h2>3. Phòng phỏng vấn mô phỏng STAR</h2>
        <p>
          Luyện tập phỏng vấn với AI và nhận đánh giá theo mô hình
          Situation – Task – Action – Result.
        </p>
      </div>

      {!sessionId && (
        <form className="interview-start-form" onSubmit={handleStartInterview}>
          <h3>Bắt đầu buổi phỏng vấn</h3>

          <label htmlFor="interview-name">Họ và tên</label>
          <input
            id="interview-name"
            value={candidateName}
            onChange={(event) => setCandidateName(event.target.value)}
            placeholder="Nhập họ và tên"
            required
          />

          <label htmlFor="interview-role">Vị trí ứng tuyển</label>
          <input
            id="interview-role"
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="Ví dụ: Junior Data Analyst"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Đang khởi tạo...' : 'Bắt đầu phỏng vấn'}
          </button>
        </form>
      )}

      {error && <div className="interview-error">{error}</div>}

      {sessionId && (
        <div className="interview-workspace">
          <div className="interview-session-info">
            <div>
              <strong>{candidateName}</strong>
              <span>{targetRole}</span>
            </div>

            <div className="interview-session-status">
              {isFinished ? 'Đã hoàn thành' : 'Đang phỏng vấn'}
            </div>
          </div>

          <div className="interview-chat">
            {messages.map((message, index) => (
              <div
                className={`interview-message ${
                  message.role === 'user' ? 'interview-message-user' : 'interview-message-ai'
                }`}
                key={`${index}-${message.role}`}
              >
                <span className="interview-message-label">
                  {message.role === 'user' ? 'Bạn' : 'Nhà tuyển dụng AI'}
                </span>
                <p>{message.content}</p>
              </div>
            ))}

            {loading && (
              <div className="interview-loading">
                AI đang xử lý câu trả lời...
              </div>
            )}
          </div>

          {!isFinished && (
            <form className="interview-answer-form" onSubmit={handleSendAnswer}>
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Nhập câu trả lời của bạn..."
                rows={4}
                maxLength={5000}
                disabled={loading}
              />

              <div className="interview-answer-footer">
                <span>{answer.length}/5000 ký tự</span>
                <button
                  type="submit"
                  disabled={loading || !answer.trim()}
                >
                  {loading ? 'Đang gửi...' : 'Gửi câu trả lời'}
                </button>
              </div>
            </form>
          )}

          {evaluations.length > 0 && (
            <div className="interview-results">
              <h3>Kết quả đánh giá</h3>

              {evaluations.map((evaluation, index) => (
                <StarEvaluation
                  key={index}
                  evaluation={evaluation}
                />
              ))}
            </div>
          )}

          {isFinished && (
            <div className="interview-completed">
              <h3>Buổi phỏng vấn đã hoàn thành!</h3>

              {overallSummary && <p>{overallSummary}</p>}

              <p>
                Bạn đã hoàn thành {evaluations.length} lượt trả lời.
              </p>

              <button type="button" onClick={handleNewInterview}>
                Bắt đầu buổi phỏng vấn mới
              </button>
            </div>
          )}

          <div className="interview-mode-note">
            {usedFallback === true
              ? 'Lưu ý: Có ít nhất một lượt đánh giá sử dụng cơ chế dự phòng khi AI không khả dụng.'
              : usedFallback === false
                ? 'Các lượt đánh giá trong phiên này đều được xử lý bởi AI.'
                : 'Không có dữ liệu để xác định trạng thái AI của các lượt trước.'}
          </div>
        </div>
      )}
    </section>
  )
}
