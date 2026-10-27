
import { useEffect, useState } from 'react'

function formatDate(date) {
  if (!date) return 'Not specified'

  return String(date).slice(0, 10)
}

function Tickets() {
  const emptyForm = {
    PurchaseDate: '',
    VisitDate: '',
    Price: '',
    Type: 'General Admission',
    VisitorID: '',
    ExhibitionID: '',
    GeneralAdmissionTicketID: ''
  }

  const [tickets, setTickets] = useState([])
  const [visitors, setVisitors] = useState([])
  const [exhibitions, setExhibitions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const [ticketResponse, visitorResponse, exhibitionResponse] =
        await Promise.all([
          fetch('http://localhost:3000/api/tickets'),
          fetch('http://localhost:3000/api/ticket-options/visitors'),
          fetch('http://localhost:3000/api/ticket-options/exhibitions')
        ])

      if (
        !ticketResponse.ok ||
        !visitorResponse.ok ||
        !exhibitionResponse.ok
      ) {
        throw new Error('Failed to load ticket information')
      }

      const [ticketData, visitorData, exhibitionData] = await Promise.all([
        ticketResponse.json(),
        visitorResponse.json(),
        exhibitionResponse.json()
      ])

      setTickets(ticketData)
      setVisitors(visitorData)
      setExhibitions(exhibitionData)
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

  async function saveTicket(event) {
    event.preventDefault()
    setError('')

    if (form.Type === 'General Admission' && form.ExhibitionID) {
      setError('General admission tickets should not select an exhibition.')
      return
    }

    if (form.Type === 'Single Exhibition' && !form.ExhibitionID) {
      setError('Please select an exhibition for this ticket.')
      return
    }

    const ticket = {
      ...form,
      Price: form.Price === '' ? null : Number(form.Price),
      VisitorID: Number(form.VisitorID),
      ExhibitionID: form.ExhibitionID
        ? Number(form.ExhibitionID)
        : null,
      GeneralAdmissionTicketID: form.GeneralAdmissionTicketID
        ? Number(form.GeneralAdmissionTicketID)
        : null,
      PurchaseDate: form.PurchaseDate || null,
      VisitDate: form.VisitDate || null
    }

    try {
      let response

      if (editingId !== null) {
        response = await fetch(
          `http://localhost:3000/api/tickets/${editingId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(ticket)
          }
        )
      } else {
        const nextId = tickets.length
          ? Math.max(...tickets.map(ticket => Number(ticket.TicketID))) + 1
          : 1

        response = await fetch('http://localhost:3000/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...ticket, TicketID: nextId })
        })
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save ticket')
      }

      resetForm()
      await loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  function startEditing(ticket) {
    setEditingId(ticket.TicketID)

    setForm({
      PurchaseDate: ticket.PurchaseDate
        ? String(ticket.PurchaseDate).slice(0, 10)
        : '',
      VisitDate: ticket.VisitDate
        ? String(ticket.VisitDate).slice(0, 10)
        : '',
      Price: ticket.Price ?? '',
      Type: ticket.Type || 'General Admission',
      VisitorID: String(ticket.VisitorID),
      ExhibitionID: ticket.ExhibitionID == null
        ? ''
        : String(ticket.ExhibitionID),
      GeneralAdmissionTicketID: ticket.GeneralAdmissionTicketID == null
        ? ''
        : String(ticket.GeneralAdmissionTicketID)
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteTicket(id) {
    if (!window.confirm('Are you sure you want to delete this ticket?')) {
      return
    }

    setError('')

    try {
      const response = await fetch(
        `http://localhost:3000/api/tickets/${id}`,
        { method: 'DELETE', credentials: 'include' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete ticket')
      }

      if (editingId === id) {
        resetForm()
      }

      await loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  const filteredTickets = tickets.filter(ticket =>
    `${ticket.TicketID} ${ticket.FirstName} ${ticket.LastName} ${ticket.Type}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div className="tickets-page">
        <div className="tickets-header">
            <div>
            <h2>Manage Tickets</h2>
            <p>Manage visitor tickets, exhibitions, and visit dates.</p>
            </div>
            <span className="tickets-count">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
            </span>
        </div>

      {error && <p className="error-message">{error}</p>}

      {visitors.length === 0 && (
        <p>
          There are no visitors in the database yet. Add a visitor before
          creating a ticket.
        </p>
      )}

      <form className="ticket-form" onSubmit={saveTicket}>
        <h3>{editingId !== null ? 'Edit Ticket' : 'Add Ticket'}</h3>

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
            <label>Ticket Type</label>
            <select name="Type" value={form.Type} onChange={handleChange}>
            <option value="General Admission">General Admission</option>
            <option value="Single Exhibition">Single Exhibition</option>
            </select>
        </div>

        {form.Type === 'Single Exhibition' && (
          <>
            <label>Exhibition</label>
            <select
              name="ExhibitionID"
              value={form.ExhibitionID}
              onChange={handleChange}
              required
            >
              <option value="">Select an exhibition</option>
              {exhibitions.map(exhibition => (
                <option
                  key={exhibition.ExhibitionID}
                  value={exhibition.ExhibitionID}
                >
                  {exhibition.Name}
                </option>
              ))}
            </select>

            {exhibitions.length === 0 && (
              <p>No exhibitions are available yet. Add an exhibition first.</p>
            )}
          </>
        )}

                <div className="ticket-field">
          <label>Purchase Date</label>
          <input
            type="date"
            name="PurchaseDate"
            value={form.PurchaseDate}
            onChange={handleChange}
          />
        </div>

        <div className="ticket-field">
          <label>Visit Date</label>
          <input
            type="date"
            name="VisitDate"
            value={form.VisitDate}
            onChange={handleChange}
          />
        </div>

        <div className="ticket-field">
          <label>Price</label>
          <input
            type="number"
            name="Price"
            value={form.Price}
            onChange={handleChange}
            min="0"
            max="9999.99"
            step="0.01"
          />
        </div>

        {form.Type === 'Single Exhibition' && (
          <>
            <label>General Admission Ticket ID (if applicable)</label>
            <input
              type="number"
              name="GeneralAdmissionTicketID"
              value={form.GeneralAdmissionTicketID}
              onChange={handleChange}
              min="1"
            />
          </>
        )}</div>
         
        <button type="submit" disabled={visitors.length === 0}>
          {editingId !== null ? 'Save Changes' : 'Add Ticket'}
        </button>

        {editingId !== null && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <section className="tickets-list">
        <h3>Tickets</h3>

        <input
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={event => setSearch(event.target.value)}
        />

        {filteredTickets.length === 0 ? (
          <p>No tickets found.</p>
        ) : (
          filteredTickets.map(ticket => (
            <div className="ticket-card" key={ticket.TicketID}>
              <h4>Ticket #{ticket.TicketID}</h4>
              <p>
                <strong>Visitor:</strong> {ticket.FirstName} {ticket.LastName}
              </p>
              <p><strong>Type:</strong> {ticket.Type}</p>
              <p>
                <strong>Exhibition:</strong>{' '}
                {ticket.ExhibitionName || 'General admission'}
              </p>
              <p><strong>Purchase Date:</strong> {formatDate(ticket.PurchaseDate)}</p>
              <p><strong>Visit Date:</strong> {formatDate(ticket.VisitDate)}</p>
              <p><strong>Price:</strong> {ticket.Price ?? 'Not specified'}</p>
              <p>
                <strong>Status:</strong> {ticket.Status || 'Active'}
              </p>
              <button onClick={() => startEditing(ticket)}>Edit</button>
              <button onClick={() => deleteTicket(ticket.TicketID)}>
                Delete
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

export default Tickets
