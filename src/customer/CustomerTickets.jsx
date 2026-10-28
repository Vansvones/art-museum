
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function CustomerTickets() {
  const navigate = useNavigate()

  const [ticketType, setTicketType] = useState('General Admission')
  const [visitDate, setVisitDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [exhibitions, setExhibitions] = useState([])
  const [exhibitionId, setExhibitionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const prices = {
    'General Admission': 18,
    'Single Exhibition': 30
  }

  useEffect(() => {
    async function loadExhibitions() {
      try {
        const response = await fetch(
          '/api/exhibitions'
        )

        if (!response.ok) {
          throw new Error('Could not load exhibitions.')
        }

        const data = await response.json()
        setExhibitions(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadExhibitions()
  }, [])

  
    function handlePurchase(event) {
      event.preventDefault()
      setError('')

      if (!visitDate) {
        setError('Please select a visit date.')
        return
      }

      if (ticketType === 'Single Exhibition' && !exhibitionId) {
        setError('Please select an exhibition.')
        return
      }

      navigate('/customer/checkout', {
        state: {
          Type: ticketType,
          VisitDate: visitDate,
          Quantity: quantity,
          ExhibitionID: exhibitionId ? Number(exhibitionId) : null
        }
      })
    }


  const total = prices[ticketType] * quantity

  return (
    <div className="customer-page">
      <section className="customer-content">
        <section className="galleries-page">
        <h2>Purchase Tickets</h2>
        </section>
        <p>
          Plan your visit to the Museum of Fine Arts by choosing
          your ticket type, visit date, and quantity.
        </p>

        <div className="customer-options">
          <div className="customer-card">
            <h3>General Admission</h3>
            <p>Access to the museum's general collection.</p>
            <p><strong>$18.00</strong> per ticket</p>
          </div>

          <div className="customer-card">
            <h3>Single Exhibition</h3>
            <p>Includes General Admission ($18.00) and a selected special exhibition ($12.00).</p>
            <p><strong>$30.00</strong> per person</p>
          </div>
        </div>

        <form className="ticket-purchase-form" onSubmit={handlePurchase}>
          <label htmlFor="ticketType">Ticket Type</label>
          <select
            id="ticketType"
            value={ticketType}
            onChange={(event) => setTicketType(event.target.value)}
          >
            <option value="General Admission">General Admission — $18</option>
            <option value="Single Exhibition">Single Exhibition + General Admission — $30</option>
          </select>

          {ticketType === 'Single Exhibition' && (
            <>
              <label htmlFor="exhibition">Choose Exhibition</label>
              <select
                id="exhibition"
                value={exhibitionId}
                onChange={(event) => setExhibitionId(event.target.value)}
                disabled={loading}
              >
                <option value="">
                  {loading ? 'Loading exhibitions...' : 'Select an exhibition'}
                </option>

                {exhibitions.map((exhibition) => (
                  <option
                    key={exhibition.ExhibitionID}
                    value={exhibition.ExhibitionID}
                  >
                    {exhibition.Name}
                  </option>
                ))}
              </select>
            </>
          )}

          <label htmlFor="visitDate">Visit Date</label>
          <input
            id="visitDate"
            type="date"
            min={new Date().toLocaleDateString('en-CA')}
            value={visitDate}
            onChange={(event) => setVisitDate(event.target.value)}
            required
          />

          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(event) => {
              setQuantity(Math.max(1, Math.min(10, Number(event.target.value))))
            }}
            required
          />

          <div className="ticket-total">
            <h2>Total: ${total.toFixed(2)}</h2>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit">Continue to Purchase</button>
        </form>

        <p>
          Already have an account? <Link to="/login">Log in</Link> to continue.
        </p>
      </section>
    </div>
  )
}

export default CustomerTickets
