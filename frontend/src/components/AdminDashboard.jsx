
import { useCallback, useEffect, useRef, useState } from 'react'
import { careerApi } from '../services/api'

const FEATURE_LABELS = {
  cv: 'Phân tích CV',
  career_advisor: 'Định hướng nghề nghiệp',
  interview: 'Phỏng vấn STAR',
  matching: 'So khớp kỹ năng',
  general: 'Khác',
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatLatency(value) {
  return value == null ? '—' : `${Number(value).toFixed(0)} ms`
}

function StatCard({ title, value, description }) {
  return (
    <div className="admin-stat-card">
      <p className="admin-stat-title">{title}</p>
      <h3 className="admin-stat-value">{value}</h3>
      {description && <p className="admin-stat-description">{description}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [features, setFeatures] = useState([])
  const [logs, setLogs] = useState([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [featuresLoaded, setFeaturesLoaded] = useState(false)
  const [logsLoaded, setLogsLoaded] = useState(false)

  const requestIdRef = useRef(0)

  const [page, setPage] = useState(1)
  const [featureFilter, setFeatureFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize))

  const loadDashboard = useCallback(async () => {
    const requestId = ++requestIdRef.current

    setLoading(true)
    setError('')

    const results = await Promise.allSettled([
      careerApi.getAIUsageStats(),
      careerApi.getAIUsageByFeature(),
      careerApi.getAIUsageLogs({
        page,
        pageSize,
        feature: featureFilter,
        status: statusFilter,
      }),
    ])

    // Bỏ qua kết quả của request cũ
    if (requestId !== requestIdRef.current) return

    const [statsResult, featureResult, logsResult] = results
    const errors = []

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value)
    } else {
      errors.push(
        statsResult.reason?.response?.data?.detail ||
        'Không thể tải thống kê AI.'
      )
    }

    if (featureResult.status === 'fulfilled') {
      const data = featureResult.value

      setFeatures(Array.isArray(data) ? data : [])
      setFeaturesLoaded(true)
    } else {
      errors.push(
        featureResult.reason?.response?.data?.detail ||
        'Không thể tải thống kê theo tính năng.'
      )
    }

    if (logsResult.status === 'fulfilled') {
      const data = logsResult.value

      setLogs(Array.isArray(data?.items) ? data.items : [])
      setTotalLogs(Number(data?.total) || 0)
      setLogsLoaded(true)
    } else {
      errors.push(
        logsResult.reason?.response?.data?.detail ||
        'Không thể tải lịch sử sử dụng AI.'
      )
    }

    setError(errors.join(' '))
    setLoading(false)
  }, [page, featureFilter, statusFilter])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleFeatureChange = (event) => {
    setFeatureFilter(event.target.value)
    setPage(1)
  }

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value)
    setPage(1)
  }

  if (loading && !stats && !featuresLoaded && !logsLoaded) {
    return <section className="career-card">Đang tải dữ liệu Dashboard...</section>
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h2>AI Usage Dashboard</h2>
          <p>Theo dõi hoạt động và hiệu suất sử dụng AI trong NEU Career AI.</p>
        </div>

        <button
          type="button"
          className="career-submit"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* 1. Thống kê tổng quan */}
      {stats && (
        <div className="admin-stats-grid">
          <StatCard
            title="Tổng lượt gọi AI"
            value={formatNumber(stats.total_requests)}
            description="Tất cả yêu cầu"
          />

          <StatCard
            title="Thành công"
            value={formatNumber(stats.successful_requests)}
            description={`Tỷ lệ: ${Number(stats.success_rate || 0).toFixed(2)}%`}
          />

          <StatCard
            title="Thất bại"
            value={formatNumber(stats.failed_requests)}
            description="Yêu cầu lỗi"
          />

          <StatCard
            title="Tổng Token"
            value={formatNumber(stats.total_tokens)}
            description={`Prompt: ${formatNumber(stats.prompt_tokens)} · Completion: ${formatNumber(stats.completion_tokens)}`}
          />

          <StatCard
            title="Độ trễ trung bình"
            value={formatLatency(stats.average_latency_ms)}
            description="Thời gian xử lý trung bình"
          />

          <StatCard
            title="Chi phí ước tính"
            value={
              stats.estimated_cost_usd == null
                ? 'Chưa có dữ liệu'
                : `$${Number(stats.estimated_cost_usd).toFixed(4)}`
            }
            description="USD"
          />
        </div>
      )}

      {/* 2. Thống kê theo tính năng */}
      {featuresLoaded && (
        <div className="career-card">
          <h3>Thống kê theo tính năng</h3>

          {features.length === 0 ? (
            <p>Chưa có dữ liệu.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tính năng</th>
                    <th>Tổng lượt gọi</th>
                    <th>Thành công</th>
                    <th>Thất bại</th>
                    <th>Tổng Token</th>
                    <th>Độ trễ TB</th>
                  </tr>
                </thead>

                <tbody>
                  {features.map((item) => (
                    <tr key={item.feature}>
                      <td>
                        {FEATURE_LABELS[item.feature] || item.feature}
                      </td>
                      <td>{formatNumber(item.total_requests)}</td>
                      <td>{formatNumber(item.successful_requests)}</td>
                      <td>{formatNumber(item.failed_requests)}</td>
                      <td>{formatNumber(item.total_tokens)}</td>
                      <td>{formatLatency(item.average_latency_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Lịch sử sử dụng AI */}
      {logsLoaded && (
        <div className="career-card">
          <div className="admin-log-header">
            <div>
              <h3>Lịch sử sử dụng AI</h3>
              <p>Tổng cộng {formatNumber(totalLogs)} bản ghi</p>
            </div>

            <div className="admin-filters">
              <select value={featureFilter} onChange={handleFeatureChange}>
                <option value="">Tất cả tính năng</option>
                <option value="cv">Phân tích CV</option>
                <option value="career_advisor">Định hướng nghề nghiệp</option>
                <option value="interview">Phỏng vấn STAR</option>
                <option value="matching">So khớp kỹ năng</option>
                <option value="general">Khác</option>
              </select>

              <select value={statusFilter} onChange={handleStatusChange}>
                <option value="">Tất cả trạng thái</option>
                <option value="success">Thành công</option>
                <option value="failed">Thất bại</option>
              </select>
            </div>
          </div>

          {logs.length === 0 ? (
            <p>Không tìm thấy bản ghi phù hợp.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Tính năng</th>
                    <th>Model</th>
                    <th>Trạng thái</th>
                    <th>Token</th>
                    <th>Độ trễ</th>
                    <th>Lỗi</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td>{FEATURE_LABELS[log.feature] || log.feature}</td>
                      <td>{log.model}</td>
                      <td>
                        <span
                          className={`admin-status ${log.status === 'success' ? 'is-success' : 'is-failed'}`}
                        >
                          {log.status === 'success' ? 'Thành công' : 'Thất bại'}
                        </span>
                      </td>
                      <td>{formatNumber(log.total_tokens)}</td>
                      <td>{formatLatency(log.latency_ms)}</td>
                      <td>{log.error_type || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-pagination">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              Trang trước
            </button>

            <span>
              Trang {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
