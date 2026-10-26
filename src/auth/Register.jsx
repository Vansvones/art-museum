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
    <section className="login-page">
      <h2>Create an Account</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="first-name">First Name</label>
        <input
          id="first-name"
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          autoComplete="given-name"
          required
        />

        <label htmlFor="middle-name">Middle Name (Optional)</label>
        <input
          id="middle-name"
          type="text"
          value={middleName}
          onChange={e => setMiddleName(e.target.value)}
          autoComplete="additional-name"
        />

        <label htmlFor="last-name">Last Name</label>
        <input
          id="last-name"
          type="text"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          autoComplete="family-name"
          required
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="register-phone">Phone (Optional)</label>
        <input
          id="register-phone"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          autoComplete="tel"
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>

      <p>
        <Link to="/">Back to Home</Link>
      </p>
    </section>
  )
}