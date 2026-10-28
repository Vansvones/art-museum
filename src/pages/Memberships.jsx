import { useEffect, useState } from 'react'

function Memberships() {
  const [memberships, setMemberships] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [visitors, setVisitors] = useState([])
  const [visitorID, setVisitorID] = useState('')
  const [membershipType, setMembershipType] = useState('Individual')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadMemberships()
    loadVisitors()
  }, [])

  async function loadMemberships() {
      try {
        const response = await fetch(
          '/api/memberships',
          { credentials: 'include' }
        )
        console.log('Visitors response status:', response.status)

        const data = await response.json()
        console.log('Visitors response data:', data)

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load memberships.')
        }

        setMemberships(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    async function loadVisitors() {
  try {
    const response = await fetch(
      '/api/visitors',
      { credentials: 'include' }
    )

    const data = await response.json()

    console.log('Visitors status:', response.status)
    console.log('Visitors response:', data)

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load visitors.')
    }

    setVisitors(data)
  } catch (error) {
    console.error('Error loading visitors:', error)
    setError(error.message)
  }
}

  async function deleteMembership(membershipID) {
      if (!window.confirm('Are you sure you want to delete this membership?')) {
        return
      }

      try {
        const response = await fetch(
          `/api/memberships/${membershipID}`,
          {
            method: 'DELETE',
            credentials: 'include'
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete membership.')
        }

        setMemberships((current) =>
          current.filter(
            (membership) => membership.MembershipID !== membershipID
          )
        )
      } catch (error) {
        alert(error.message)
      }
    }

    async function addMembership(event) {
    event.preventDefault()
    setAdding(true)

    try {
      const response = await fetch(
        '/api/memberships',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            VisitorID: visitorID,
            MembershipType: membershipType
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add membership.')
      }

      setVisitorID('')
      await loadMemberships()
      alert('Membership added successfully.')
    } catch (error) {
      alert(error.message)
    } finally {
      setAdding(false)
    }
  }

  const filteredMemberships = memberships.filter((membership) => {
    const visitorName =
      `${membership.FirstName || ''} ${membership.LastName || ''}`

    return [
      membership.MembershipID,
      membership.VisitorID,
      visitorName,
      membership.Email,
      membership.MembershipType
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(search.toLowerCase())
    )
  })

  
  return (
    <div className="memberships-page">
      <div className="exhibitions-header">
        <h2>Manage Memberships</h2>
        <p>View and manage museum visitor memberships.</p>
      </div>
        
      <form className="exhibition-form" onSubmit={addMembership}>
        <h3>Assign Membership to Visitor</h3>

        <div className="exhibition-form-grid">
          <div className="exhibition-field">
            <label htmlFor="visitor">Select Visitor</label>

            <select
              id="visitor"
              value={visitorID}
              onChange={(event) => setVisitorID(event.target.value)}
              required
            >
              <option value="">Choose a visitor</option>

              {visitors.map((visitor) => (
                <option key={visitor.VisitorID} value={visitor.VisitorID}>
                  {visitor.FirstName} {visitor.LastName} (ID: {visitor.VisitorID})
                </option>
              ))}
            </select>
          </div>

          <div className="exhibition-field">
            <label htmlFor="membershipType">Membership Type</label>

            <select
              id="membershipType"
              value={membershipType}
              onChange={(event) => setMembershipType(event.target.value)}
            >
              <option value="Individual">Individual — $85</option>
              <option value="Dual">Dual — $120</option>
              <option value="Family">Family — $150</option>
              <option value="Student">Student — $45</option>
              <option value="Senior">Senior — $65</option>
            </select>
          </div>
        </div>

        <div className="exhibition-form-actions">
          <button type="submit" disabled={adding || !visitorID}>
            {adding ? 'Adding Membership...' : 'Assign Membership'}
          </button>
        </div>
      </form>

        <input
          className="memberships-search"
          type="text"
          placeholder="Search by visitor, membership type, or ID..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loading && <p>Loading memberships...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && (
          <section className="customer-content">
            <h2>All Memberships ({memberships.length})</h2>

            {filteredMemberships.length === 0 ? (
              <p>No memberships found.</p>
            ) : (
              <div className="customer-options">
                {filteredMemberships.map((membership) => (
                  <div
                    className="customer-card"
                    key={membership.MembershipID}
                  >
                    <h3>{membership.MembershipType} Membership</h3>

                    <p>
                      <strong>Membership ID:</strong>{' '}
                      {membership.MembershipID}
                    </p>

                    <p>
                      <strong>Visitor:</strong>{' '}
                      {membership.FirstName || 'Unknown'}{' '}
                      {membership.LastName || ''}
                    </p>

                    <p>
                      <strong>Email:</strong>{' '}
                      {membership.Email || 'Not available'}
                    </p>

                    <p>
                      <strong>Start date:</strong>{' '}
                      {membership.StartDate
                        ? String(membership.StartDate).slice(0, 10)
                        : 'Not specified'}
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
                      type="button"
                      onClick={() =>
                        deleteMembership(membership.MembershipID)
                      }
                    >
                      Delete Membership
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
    </div>
  )
}

export default Memberships
