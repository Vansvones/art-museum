
import { useEffect, useState } from 'react'

function CustomerMemberships() {
  const [memberships, setMemberships] = useState([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadMemberships() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/my-memberships',
          { credentials: 'include' }
        )

        if (response.status === 401 || response.status === 403) {
          setLoggedIn(false)
          return
        }

        if (!response.ok) {
          throw new Error('Unable to load your memberships.')
        }

        setMemberships(await response.json())
        setLoggedIn(true)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadMemberships()
  }, [])

  const options = [
    {
      name: 'Individual',
      price: 'Check with the museum',
      benefits: 'A membership option for individual visitors.'
    },
    {
      name: 'Family',
      price: 'Check with the museum',
      benefits: 'A membership option for families.'
    },
    {
      name: 'Student',
      price: 'Check with the museum',
      benefits: 'A membership option for students.'
    }
  ]

  return (
    <div className="customer-page">
      <section className="galleries-page">
        <h2>Museum Memberships</h2>
        <p>
          Explore membership options and find the right fit for your
          museum visits.
        </p>

        <div className="customer-options">
          {options.map((option) => (
            <div className="customer-card" key={option.name}>
              <h3>{option.name} Membership</h3>
              <p>{option.benefits}</p>
              <p><strong>Price:</strong> {option.price}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="customer-content">
        <h2>My Memberships</h2>

        {loading && <p>Loading membership information...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && !loggedIn && (
          <p>Please <a href="/login">log in</a> to view your memberships.</p>
        )}

        {!loading && loggedIn && memberships.length === 0 && (
          <p>You don't have any memberships registered yet.</p>
        )}

        {!loading && loggedIn && memberships.length > 0 && (
          <div className="gallery-list">
            {memberships.map((membership) => (
              <div
                className="gallery-card"
                key={membership.MembershipID}
              >
                <h3>{membership.MembershipType}</h3>
                <p>
                  <strong>Start date:</strong>{' '}
                  {String(membership.StartDate).slice(0, 10)}
                </p>
                <p>
                  <strong>End date:</strong>{' '}
                  {membership.EndDate
                    ? String(membership.EndDate).slice(0, 10)
                    : 'No end date specified'}
                </p>
                <p>
                  <strong>Price:</strong>{' '}
                  {membership.Price == null
                    ? 'Not specified'
                    : `$${Number(membership.Price).toFixed(2)}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default CustomerMemberships
