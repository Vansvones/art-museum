
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function CustomerAccount({ onLogout }) {
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({
    FirstName: '',
    MiddleName: '',
    LastName: '',
    Email: '',
    Phone: ''
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Please log in to view your account.')
        }

        setUser(data.user)
        setFormData({
          FirstName: data.user.FirstName || '',
          MiddleName: data.user.MiddleName || '',
          LastName: data.user.LastName || '',
          Email: data.user.Email || '',
          Phone: data.user.Phone || ''
        })
      } catch (err) {
        setError(err.message || 'Could not load your account.')
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value
    }))
  }

  function handleCancel() {
    setFormData({
      FirstName: user.FirstName || '',
      MiddleName: user.MiddleName || '',
      LastName: user.LastName || '',
      Email: user.Email || '',
      Phone: user.Phone || ''
    })

    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      setSaving(true)

      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update your information.')
      }

      const updatedUser = {
        ...user,
        ...formData,
        FirstName: formData.FirstName.trim(),
        MiddleName: formData.MiddleName.trim(),
        LastName: formData.LastName.trim(),
        Email: formData.Email.trim().toLowerCase(),
        Phone: formData.Phone.trim()
      }

      setUser(updatedUser)
      setFormData(updatedUser)
      setIsEditing(false)
      setSuccess('Your information was updated successfully.')
    } catch (err) {
      setError(err.message || 'Could not update your information.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', {
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

  if (error && !user) {
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
            <p>{isEditing ? 'Edit your account details' : 'Your account details'}</p>
          </div>

          {!isEditing && (
            <button
              type="button"
              className="account-edit-button"
              onClick={() => {
                setIsEditing(true)
                setError('')
                setSuccess('')
              }}
            >
              Edit Information
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave}>
            <div className="account-details">
              <div className="account-field">
                <label>First Name</label>
                <input
                  type="text"
                  name="FirstName"
                  value={formData.FirstName}
                  onChange={handleChange}
                  maxLength="30"
                  required
                />
              </div>

              <div className="account-field">
                <label>Middle Name</label>
                <input
                  type="text"
                  name="MiddleName"
                  value={formData.MiddleName}
                  onChange={handleChange}
                  maxLength="30"
                />
              </div>

              <div className="account-field">
                <label>Last Name</label>
                <input
                  type="text"
                  name="LastName"
                  value={formData.LastName}
                  onChange={handleChange}
                  maxLength="30"
                  required
                />
              </div>

              <div className="account-field">
                <label>Email Address</label>
                <input
                  type="email"
                  name="Email"
                  value={formData.Email}
                  onChange={handleChange}
                  maxLength="50"
                  required
                />
              </div>

              <div className="account-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="Phone"
                  value={formData.Phone}
                  onChange={handleChange}
                  maxLength="15"
                />
              </div>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="account-edit-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
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
        )}
      </div>

      {success && <p className="success-message">{success}</p>}

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
