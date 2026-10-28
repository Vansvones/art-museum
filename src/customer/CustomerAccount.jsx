
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function CustomerAccount({ onLogout }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          credentials: 'include'
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Please log in to view your account.')
        }

        setUser(data.user)
      } catch (err) {
        setError(err.message || 'Could not load your account.')
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [])

  async function handleLogout() {
    try {
      const response = await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        console.error('Logout failed.')
      }
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      onLogout()
      navigate('/', { replace: true })
    }
  }

  
  if (loading) {
    return (
      <section className="customer-account">
        <p>Loading your account...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="customer-account">
        <div className="account-card">
          <h2>My Account</h2>
          <p>{error}</p>
          <Link className="account-link" to="/login">Log In</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="customer-account">
      <div className="account-header">
        <div>
          <h2>My Account</h2>
          <p className="account-subtitle">
            Manage your personal information and museum activities.
          </p>
        </div>

        <div className="account-avatar">
          {user.FirstName?.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="account-card">
        <div className="account-card-heading">
          <div>
            <h3>Personal Information</h3>
            <p>Your account details</p>
          </div>
          <span className="account-status">Visitor</span>
        </div>

        <div className="account-details">
          <div className="account-field">
            <span>First Name</span>
            <strong>{user.FirstName}</strong>
          </div>

          <div className="account-field">
            <span>Middle Name</span>
            <strong>{user.MiddleName || '—'}</strong>
          </div>

          <div className="account-field">
            <span>Last Name</span>
            <strong>{user.LastName}</strong>
          </div>

          <div className="account-field">
            <span>Email Address</span>
            <strong>{user.Email}</strong>
          </div>

          <div className="account-field">
            <span>Phone Number</span>
            <strong>{user.Phone || 'Not provided'}</strong>
          </div>
        </div>
      </div>

      <h3 className="account-section-title">Quick Access</h3>

      <div className="account-actions">
        <Link className="account-action" to="/customer/my-tickets">
          <span className="account-action-icon">🎟</span>
          <span>
            <strong>My Tickets</strong>
            <small>View your purchased tickets</small>
          </span>
          <span className="account-arrow">→</span>
        </Link>

        <Link className="account-action" to="/customer/memberships">
          <span className="account-action-icon">✦</span>
          <span>
            <strong>My Memberships</strong>
            <small>Explore your memberships</small>
          </span>
          <span className="account-arrow">→</span>
        </Link>

        <Link className="account-action" to="/change-password">
          <span className="account-action-icon">⌑</span>
          <span>
            <strong>Change Password</strong>
            <small>Keep your account secure</small>
          </span>
          <span className="account-arrow">→</span>
        </Link>
      </div>

      <div className="account-logout">
        <button type="button" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </section>
  )
}
