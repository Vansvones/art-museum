import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Login({onLogin}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const message = location.state?.message

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed.')
      }

      onLogin(data.user)
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/customer')
    } catch (err) {
      setError(err.message || 'Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  
  return (
    <section className="login-page">
      <div className="login-card">
        <Link to="/" className="login-back-link">
          ← Back to Home
        </Link>

        <p className="login-eyebrow">MUSEUM OF FINE ARTS</p>

        <h2>Welcome back.</h2>

        <p className="login-description">
          Sign in to continue your museum experience.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {message && (
            <p role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

        <div className="login-register">
          <span>Don't have an account?</span>{' '}
          <Link to="/register">Create one</Link>
        </div>
        </form>
      </div>
    </section>
  )
}
