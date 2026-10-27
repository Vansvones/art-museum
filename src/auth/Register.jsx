import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName,
          middleName,
          lastName,
          email,
          phone,
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.')
      }

      navigate('/login')
    } catch (err) {
      setError(err.message || 'Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  
  return (
    <section className="register-page">
      <div className="register-card">
        <Link to="/" className="register-back-link">
          ← Back to Home
        </Link>

        <p className="register-eyebrow">MUSEUM OF FINE ARTS</p>

        <h2>Create your account.</h2>

        <p className="register-description">
          Join us to make the most of your museum experience.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="register-fields">
            <div className="register-field">
              <label htmlFor="first-name">First Name</label>
              <input
                id="first-name"
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="middle-name">Middle Name <span>(Optional)</span></label>
              <input
                id="middle-name"
                type="text"
                placeholder="Middle name"
                value={middleName}
                onChange={e => setMiddleName(e.target.value)}
                autoComplete="additional-name"
              />
            </div>

            <div className="register-field">
              <label htmlFor="last-name">Last Name</label>
              <input
                id="last-name"
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-phone">Phone <span>(Optional)</span></label>
              <input
                id="register-phone"
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="register-field register-field-full">
              <label htmlFor="register-email">Email Address</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="register-field register-field-full">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <small>Must be at least 8 characters.</small>
            </div>
          </div>

          {error && (
            <p className="register-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="register-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="register-login">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  )
}