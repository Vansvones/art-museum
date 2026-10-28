
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
          'http://localhost:5000/api/my-memberships',
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
      price: 85,
      benefits: 'Membership for one visitor.'
    },
    {
      name: 'Dual',
      price: 120,
      benefits: 'Membership for two people.'
    },
    {
      name: 'Family',
      price: 150,
      benefits: 'Membership for families.'
    },
    {
      name: 'Student',
      price: 45,
      benefits: 'Discounted membership for students.'
    },
    {
      name: 'Senior',
      price: 65,
      benefits: 'Membership option for senior visitors.'
    }
  ]

  const purchaseMembership = async (option) => {
  if (!loggedIn) {
    window.location.href = '/login'
    return
  }

  try {
    const response = await fetch(
      'http://localhost:3000/api/memberships/purchase',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          MembershipType: option.name
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Purchase failed.')
    }

    alert('Membership purchased successfully!')

    const membershipsResponse = await fetch(
      'http://localhost:3000/api/my-memberships',
      { credentials: 'include' }
    )

    if (!membershipsResponse.ok) {
      throw new Error('Membership purchased, but memberships could not be refreshed.')
    }

    setMemberships(await membershipsResponse.json())
  } catch (error) {
    alert(error.message)
  }
}

  const cancelMembership = async (membershipID) => {
    if (!window.confirm('Are you sure you want to cancel this membership?')) {
      return
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/my-memberships/${membershipID}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to cancel membership.')
      }

      setMemberships((current) =>
        current.filter(
          (membership) => membership.MembershipID !== membershipID
        )
      )

      alert('Membership cancelled successfully.')
    } catch (error) {
      alert(error.message)
    }
  }

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
              <p>
                <strong>Price:</strong> ${option.price.toFixed(2)}
              </p>
              <button onClick={() => purchaseMembership(option)}>
                Get Membership
              </button>
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
          <div className="customer-options">
            {memberships.map((membership) => (
              <div className="customer-card" key={membership.MembershipID}>
                <h3>{membership.MembershipType} Membership</h3>

                <p>
                  Your museum membership is registered and ready to use.
                </p>

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

                <button
                  className="membership-button"
                  onClick={() => cancelMembership(membership.MembershipID)}
                >
                  Cancel Membership
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default CustomerMemberships
