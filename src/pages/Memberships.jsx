import { useEffect, useState, useRef } from 'react'

function Memberships() {
  const [memberships, setMemberships] = useState([])
  const [membershipTypes, setMembershipTypes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [typeError, setTypeError] = useState('')
  const [visitors, setVisitors] = useState([])
  const [visitorID, setVisitorID] = useState('')
  const [membershipType, setMembershipType] = useState('Individual')
  const [adding, setAdding] = useState(false)
  const [typeName, setTypeName] = useState('')
  const [typePrice, setTypePrice] = useState('')
  const [editingType, setEditingType] = useState(null)
  const [savingType, setSavingType] = useState(false)
  const editFormRef = useRef(null)

  useEffect(() => {
    loadMemberships()
    loadVisitors()
    loadMembershipTypes()
  }, [])

  async function loadMemberships() {
    try {
      const response = await fetch('/api/memberships', {
        credentials: 'include'
      })

      const data = await response.json()

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
      const response = await fetch('/api/visitors', {
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load visitors.')
      }

      setVisitors(data)
    } catch (error) {
      console.error('Error loading visitors:', error)
      setError(error.message)
    }
  }

  async function loadMembershipTypes() {
    try {
      const response = await fetch('/api/membership-types', {
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load membership types.')
      }

      setMembershipTypes(data)

      if (data.length > 0) {
        setMembershipType((current) =>
          data.some((type) => type.MembershipType === current)
            ? current
            : data[0].MembershipType
        )
      }
    } catch (error) {
      setTypeError(error.message)
    }
  }

  async function saveMembershipType(event) {
    event.preventDefault()
    setSavingType(true)
    setTypeError('')

    try {
      const url = editingType
        ? `/api/membership-types/${encodeURIComponent(editingType)}`
        : '/api/membership-types'

      const response = await fetch(url, {
        method: editingType ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          MembershipType: typeName,
          Price: typePrice
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save membership type.')
      }

      setTypeName('')
      setTypePrice('')
      setEditingType(null)

      await loadMembershipTypes()

      alert(
        editingType
          ? 'Membership type updated successfully.'
          : 'Membership type added successfully.'
      )
    } catch (error) {
      setTypeError(error.message)
    } finally {
      setSavingType(false)
    }
  }

  function startEditingType(type) {
    setEditingType(type.MembershipType)
    setTypeName(type.MembershipType)
    setTypePrice(Number(type.Price).toFixed(2))
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }, 100)
  }

  function cancelEditingType() {
    setEditingType(null)
    setTypeName('')
    setTypePrice('')
  }

  async function deleteMembershipType(typeName) {
    if (!window.confirm(
      `Are you sure you want to delete the ${typeName} membership type?`
    )) {
      return
    }

    try {
      const response = await fetch(
        `/api/membership-types/${encodeURIComponent(typeName)}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete membership type.')
      }

      if (editingType === typeName) {
        cancelEditingType()
      }

      await loadMembershipTypes()
      alert('Membership type deleted successfully.')
    } catch (error) {
      alert(error.message)
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
      const response = await fetch('/api/memberships', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          VisitorID: visitorID,
          MembershipType: membershipType
        })
      })

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

      <section className="customer-content">
        <form ref={editFormRef} className="exhibition-form" onSubmit={saveMembershipType}>
          <h3>{editingType ? 'Edit Membership Type' : 'Add Membership Type'}</h3>

          <div className="exhibition-form-grid">
            <div className="exhibition-field">
              <label htmlFor="typeName">Membership Type</label>
              <input
                id="typeName"
                type="text"
                maxLength="30"
                value={typeName}
                onChange={(event) => setTypeName(event.target.value)}
                placeholder="Enter membership type"
                required
              />
            </div>

            <div className="exhibition-field">
              <label htmlFor="typePrice">Price ($)</label>
              <input
                id="typePrice"
                type="number"
                min="0"
                step="0.01"
                value={typePrice}
                onChange={(event) => setTypePrice(event.target.value)}
                placeholder="Enter price"
                required
              />
            </div>
          </div>

          <div className="exhibition-form-actions" style={{ gap: '20px' }}>
            <button type="submit" disabled={savingType}>
              {savingType
                ? 'Saving...'
                : editingType
                  ? 'Save Changes'
                  : 'Add Membership Type'}
            </button>

            {editingType && (
              <button type="button" onClick={cancelEditingType}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {typeError && <p className="error-message">{typeError}</p>}

        <div className="customer-options">
          {membershipTypes.map((type) => (
            <div className="customer-card" key={type.MembershipType}>
              <h3>{type.MembershipType}</h3>

              <p>
                <strong>Price:</strong>{' '}
                ${Number(type.Price).toFixed(2)}
              </p>

              <button
                type="button"
                onClick={() => startEditingType(type)}
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => deleteMembershipType(type.MembershipType)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

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
              required
            >
              {membershipTypes.map((type) => (
                <option
                  key={type.MembershipType}
                  value={type.MembershipType}
                >
                  {type.MembershipType} — ${Number(type.Price).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="exhibition-form-actions">
          <button
            type="submit"
            disabled={adding || !visitorID || membershipTypes.length === 0}
          >
            {adding ? 'Adding Membership...' : 'Assign Membership'}
          </button>
        </div>
      </form>

      <div className="memberships-list-header">
        <h3>Memberships</h3>

        <input
          className="memberships-search"
          type="text"
          placeholder="Search by visitor, membership type, or ID..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading && <p>Loading memberships...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <section className="customer-content">
          <h2>All Memberships ({filteredMemberships.length})</h2>

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
