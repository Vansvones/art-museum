import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function MyTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTickets() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/my-tickets',
          { credentials: 'include' }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Could not load your tickets.')
        }

        setTickets(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTickets()
  }, [])

  async function cancelTicket(ticketID) {
    const confirmed = window.confirm(
        'Are you sure you want to cancel this ticket?'
    )

    if (!confirmed) return

    try {
        const response = await fetch(
        `http://localhost:3000/api/my-tickets/${ticketID}/cancel`,
        {
            method: 'PUT',
            credentials: 'include'
        }
        )

        const data = await response.json()

        if (!response.ok) {
        throw new Error(data.error || 'Could not cancel ticket.')
        }

        setTickets(prevTickets =>
        prevTickets.map(ticket =>
            ticket.TicketID === ticketID
            ? { ...ticket, Status: 'Cancelled' }
            : ticket
        )
        )
    } catch (err) {
        window.alert(err.message)
    }
    }

  if (loading) return <p>Loading your tickets...</p>

  
    if (error) {
    return (
        <section className="customer-account">
        <div className="account-card">
            <h2>My Tickets</h2>
            <p>{error}</p>
            <Link className="account-link" to="/login">
            Log In
            </Link>
        </div>
        </section>
        )
    }
  
return (
  <section className="my-tickets-page">
    <div className="my-tickets-header">
      <div>
        <p className="my-tickets-subtitle">YOUR VISITS</p>
        <h2>My Tickets</h2>
        <p className="my-tickets-description">
          View your tickets and manage your upcoming visits.
        </p>
      </div>

      <Link to="/customer" className="back-home-button">
        Back to Home
      </Link>
    </div>

    {tickets.length === 0 ? (
      <div className="tickets-empty">
        <h3>No tickets yet</h3>
        <p>Your purchased tickets will appear here.</p>
        <Link to="/customer" className="tickets-browse-link">
          Explore the Museum
        </Link>
      </div>
    ) : (
      <div className="tickets-table-wrapper">
        <table className="my-tickets-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Visit Date</th>
              <th>Type</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {tickets.map(ticket => {
              const visitDate = new Date(
                `${String(ticket.VisitDate).slice(0, 10)}T00:00:00`
              )

              const today = new Date()
              today.setHours(0, 0, 0, 0)

              const canCancel =
                ticket.Status === 'Active' && visitDate >= today

              return (
                <tr key={ticket.TicketID}>
                  <td className="ticket-number">
                    #{ticket.TicketID}
                  </td>
                  <td>
                    {visitDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td>{ticket.Type}</td>
                  <td className="ticket-price">
                    ${Number(ticket.Price).toFixed(2)}
                  </td>
                  <td>
                    <span
                      className={`ticket-status ${
                        ticket.Status === 'Active'
                          ? 'status-active'
                          : 'status-cancelled'
                      }`}
                    >
                      {ticket.Status || 'Active'}
                    </span>
                  </td>
                  <td className="ticket-action">
                    {canCancel && (
                      <button
                        className="cancel-ticket-button"
                        onClick={() => cancelTicket(ticket.TicketID)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
)
}