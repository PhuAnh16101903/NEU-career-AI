
import { useState } from 'react'
import { careerApi } from '../services/api'

const DEMO_ACCOUNTS = [
  { role: 'Sinh viên', email: 'phu@st.neu.edu.vn' },
  { role: 'Doanh nghiệp', email: 'hr@fpt.com' },
  { role: 'Quản trị viên', email: 'admin@neu.edu.vn' },
]

export default function AuthTab({ currentUser, onAuthSuccess, onLogout }) {
  const [email, setEmail] = useState('admin@neu.edu.vn')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const data = await careerApi.login(email.trim(), password)
      onAuthSuccess(data.user)
      setSuccess('Đăng nhập thành công!')
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    onLogout()
    setSuccess('Bạn đã đăng xuất.')
    setError('')
  }

  return (
    <section className="career-card">
      <h2>Đăng nhập hệ thống</h2>

      {currentUser ? (
        <div>
          <p>
            Đang đăng nhập: <strong>{currentUser.full_name}</strong>
          </p>
          <p>Email: {currentUser.email}</p>
          <p>
            Vai trò: <strong>{currentUser.role}</strong>
          </p>

          <button
            type="button"
            className="career-submit"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="career-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Nhập email"
              required
            />
          </div>

          <div className="career-field" style={{ marginTop: 16 }}>
            <label htmlFor="login-password">Mật khẩu</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          {error && <p className="career-error">{error}</p>}
          {success && <p style={{ color: 'var(--success)' }}>{success}</p>}

          <button
            type="submit"
            className="career-submit"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      )}

      <div style={{ marginTop: 28 }}>
        <h3>Tài khoản dùng thử</h3>
        <p>Mật khẩu chung: <strong>123456</strong></p>

        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => {
              setEmail(account.email)
              setPassword('123456')
              setError('')
              setSuccess('')
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: 12,
              marginBottom: 8,
              textAlign: 'left',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'white',
            }}
          >
            {account.role}: {account.email}
          </button>
        ))}
      </div>
    </section>
  )
}
