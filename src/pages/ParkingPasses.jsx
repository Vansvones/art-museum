import { useEffect, useState } from 'react'

function formatDate(date) {
  if (!date) return 'Not specified'
  return String(date).slice(0, 10)
}

function formatTime(time) {
  if (!time) return 'Not specified'
  const [hours, minutes] = String(time).slice(0, 5).split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

function ParkingPasses() {
  const emptyForm = {
    ParkingLotID: '',
    VisitorID: '',
    VisitDate: '',
    ArrivalTime: '',
    DepartureTime: ''
  }

  const [passes, setPasses] = useState([])
  const [visitors, setVisitors] = useState([])
  const [parkingLots, setParkingLots] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const [passResponse, visitorResponse, lotResponse] =
        await Promise.all([
          fetch('/api/parking-passes', { credentials: 'include' }),
          fetch('/api/ticket-options/visitors', { credentials: 'include' }),
          fetch('/api/parking-lots')
        ])

      if (!passResponse.ok || !visitorResponse.ok || !lotResponse.ok) {
        throw new Error('Failed to load parking pass information.')
      }

      const [passData, visitorData, lotData] = await Promise.all([
        passResponse.json(),
        visitorResponse.json(),
        lotResponse.json()
      ])

      setPasses(passData)
      setVisitors(visitorData)
      setParkingLots(lotData)
      setError('')
    } catch (error) {
      setError(error.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target

    setForm({
      ...form,
      [name]: value
    })
  }

  function resetForm() {
    setForm({ ...emptyForm })
    setEditingId(null)
  }

  function calculatePrice() {
    const lot = parkingLots.find(
      lot => lot.ParkingLotID === Number(form.ParkingLotID)
    )

    if (!lot || !form.ArrivalTime || !form.DepartureTime) {
      return null
    }

    const arrival = form.ArrivalTime.split(':').map(Number)
    const departure = form.DepartureTime.split(':').map(Number)

    const duration =
      (departure[0] * 60 + departure[1] -
       arrival[0] * 60 - arrival[1]) / 60

    if (duration <= 0) {
      return null
    }

    return (duration * Number(lot.HourlyRate)).toFixed(2)
  }

  async function savePass(event) {
    event.preventDefault()
    setError('')

    const parkingPass = {
      ParkingLotID: Number(form.ParkingLotID),
      VisitorID: Number(form.VisitorID),
      VisitDate: form.VisitDate,
      ArrivalTime: form.ArrivalTime,
      DepartureTime: form.DepartureTime
    }

    try {
      const response = await fetch(
        editingId !== null
          ? `/api/parking-passes/${editingId}`
          : '/api/parking-passes',
        {
          method: editingId !== null ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(parkingPass)
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save parking pass.')
      }

      resetForm()
      await loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  function startEditing(pass) {
    setEditingId(pass.ParkingPassID)

    setForm({
      ParkingLotID: String(pass.ParkingLotID),
      VisitorID: String(pass.VisitorID),
      VisitDate: formatDate(pass.VisitDate) === 'Not specified'
        ? ''
        : formatDate(pass.VisitDate),
      ArrivalTime: pass.ArrivalTime ? String(pass.ArrivalTime).slice(0, 5) : '',
      DepartureTime: pass.DepartureTime ? String(pass.DepartureTime).slice(0, 5) : ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deletePass(id) {
    if (!window.confirm('Are you sure you want to delete this parking pass?')) {
      return
    }

    setError('')

    try {
      const response = await fetch(
        `/api/parking-passes/${id}`,
        { method: 'DELETE', credentials: 'include' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete parking pass.')
      }

      if (editingId === id) {
        resetForm()
      }

      await loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  const filteredPasses = passes.filter(pass =>
    `${pass.ParkingPassID} ${pass.FirstName} ${pass.LastName} ${pass.ParkingLotName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const price = calculatePrice()

  return (
    <div className="tickets-page">
      <div className="tickets-header">
        <div>
          <h2>Manage Parking Passes</h2>
          <p>Manage visitor parking reservations and parking lots.</p>
        </div>
        <span className="tickets-count">
          {passes.length} {passes.length === 1 ? 'pass' : 'passes'}
        </span>
      </div>

      {error && (
        <div className="error-message">
          <strong>Unable to save parking pass</strong>
          <p>{error}</p>
        </div>
      )}

      {visitors.length === 0 && (
        <p>There are no visitors in the database yet. Add a visitor first.</p>
      )}

      <form className="ticket-form" onSubmit={savePass}>
        <h3>{editingId !== null ? 'Edit Parking Pass' : 'Add Parking Pass'}</h3>

        <div className="ticket-form-grid">
          <div className="ticket-field">
            <label>Visitor</label>
            <select
              name="VisitorID"
              value={form.VisitorID}
              onChange={handleChange}
              required
            >
              <option value="">Select a visitor</option>
              {visitors.map(visitor => (
                <option key={visitor.VisitorID} value={visitor.VisitorID}>
                  {visitor.FirstName} {visitor.LastName} (ID: {visitor.VisitorID})
                </option>
              ))}
            </select>
          </div>

          <div className="ticket-field">
            <label>Parking Lot</label>
            <select
              name="ParkingLotID"
              value={form.ParkingLotID}
              onChange={handleChange}
              required
            >
              <option value="">Select a parking lot</option>
              {parkingLots.map(lot => (
                <option key={lot.ParkingLotID} value={lot.ParkingLotID}>
                  {lot.Name} — ${Number(lot.HourlyRate).toFixed(2)}/hour
                </option>
              ))}
            </select>
          </div>

          <div className="ticket-field">
            <label>Visit Date</label>
            <input
              type="date"
              name="VisitDate"
              value={form.VisitDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="ticket-field">
            <label>Arrival Time</label>
            <input
              type="time"
              name="ArrivalTime"
              value={form.ArrivalTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="ticket-field">
            <label>Departure Time</label>
            <input
              type="time"
              name="DepartureTime"
              value={form.DepartureTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="ticket-field">
            <label>Calculated Total Price</label>
            <input
              type="text"
              value={price === null ? '' : `$${price}`}
              placeholder="Select lot and times"
              readOnly
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={
            visitors.length === 0 ||
            parkingLots.length === 0 ||
            price === null
          }
        >
          {editingId !== null ? 'Save Changes' : 'Add Parking Pass'}
        </button>

        {editingId !== null && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <section className="tickets-list">
        <h3>Parking Passes</h3>

        <input
          className="ticket-search"
          type="text"
          placeholder="Search parking passes..."
          value={search}
          onChange={event => setSearch(event.target.value)}
        />

        {filteredPasses.length === 0 ? (
          <p>No parking passes found.</p>
        ) : (
          filteredPasses.map(pass => (
            <div className="ticket-card" key={pass.ParkingPassID}>
              <h4>Parking Pass #{pass.ParkingPassID}</h4>
              <p>
                <strong>Visitor:</strong> {pass.FirstName} {pass.LastName}
              </p>
              <p><strong>Parking Lot:</strong> {pass.ParkingLotName}</p>
              <p><strong>Visit Date:</strong> {formatDate(pass.VisitDate)}</p>
              <p>
                <strong>Arrival:</strong> {formatTime(pass.ArrivalTime)}
              </p>
              <p>
                <strong>Departure:</strong> {formatTime(pass.DepartureTime)}
              </p>
              <p>
                <strong>Total Price:</strong>{' '}
                {pass.TotalPrice == null
                  ? 'Not specified'
                  : `$${Number(pass.TotalPrice).toFixed(2)}`}
              </p>

              <button onClick={() => startEditing(pass)}>Edit</button>
              <button onClick={() => deletePass(pass.ParkingPassID)}>
                Delete
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

export default ParkingPasses
