
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function CustomerTickets({ user, authChecked }) {
  const navigate = useNavigate()
  const location = useLocation()
  const purchase = location.state?.purchase
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
        <section className="customer-content ticket-page">

          <div className="ticket-page-header">
            <p className="ticket-eyebrow">PLAN YOUR VISIT</p>
            <h2>Get Your Museum Tickets</h2>
            <p>
              Discover our collections and exhibitions. Choose your tickets
              and select a date for your visit.
            </p>
          </div>

          {purchase && (
            <div className="customer-card ticket-confirmation">
              <h3>Ticket Purchase Confirmed!</h3>
              <p>Your tickets were successfully purchased.</p>

              <p>
                <strong>Ticket IDs:</strong> {purchase.ticketIDs.join(', ')}
              </p>
              <p>
                <strong>Ticket Type:</strong> {purchase.Type}
              </p>

              {purchase.ExhibitionName && (
                <p>
                  <strong>Exhibition:</strong> {purchase.ExhibitionName}
                </p>
              )}

              <p>
                <strong>Visit Date:</strong> {purchase.VisitDate}
              </p>
              <p>
                <strong>Quantity:</strong> {purchase.quantity}
              </p>
              <p>
                <strong>Total Paid:</strong> ${Number(purchase.total).toFixed(2)}
              </p>
            </div>
          )}

          <div className="ticket-options-header">
            <h3>Choose Your Experience</h3>
            <p>Select the ticket that best fits your visit.</p>
          </div>

          <div className="ticket-options-grid">
            <div
              className={`ticket-option-card ${
                ticketType === 'General Admission' ? 'selected' : ''
              }`}
              onClick={() => setTicketType('General Admission')}
            >
              <div className="ticket-option-top">
                <span className="ticket-option-label">MUSEUM ACCESS</span>
                <span className="ticket-option-price">$18</span>
              </div>

              <h3>General Admission</h3>
              <p>
                Explore the museum's general collection and enjoy access
                to its permanent galleries.
              </p>

              <ul>
                <li>Access to general collections</li>
                <li>Visit on your selected date</li>
              </ul>

              <button
                type="button"
                className="ticket-select-button"
                onClick={() => setTicketType('General Admission')}
              >
                {ticketType === 'General Admission' ? 'Selected' : 'Select Ticket'}
              </button>
            </div>

            <div
              className={`ticket-option-card ${
                ticketType === 'Single Exhibition' ? 'selected' : ''
              }`}
              onClick={() => setTicketType('Single Exhibition')}
            >
              <div className="ticket-option-top">
                <span className="ticket-option-label">FULL EXPERIENCE</span>
                <span className="ticket-option-price">$30</span>
              </div>

              <h3>Single Exhibition</h3>
              <p>
                Experience a special exhibition in addition to the
                museum's general collection.
              </p>

              <ul>
                <li>General admission included</li>
                <li>Access to one special exhibition</li>
              </ul>

              <button
                type="button"
                className="ticket-select-button"
                onClick={() => setTicketType('Single Exhibition')}
              >
                {ticketType === 'Single Exhibition' ? 'Selected' : 'Select Ticket'}
              </button>
            </div>
          </div>

          <div className="ticket-booking-layout">
            <div className="ticket-booking-form-card">
              <div className="ticket-section-heading">
                <h3>Plan Your Visit</h3>
                <p>Choose your visit date and the number of tickets.</p>
              </div>

              {ticketType === 'Single Exhibition' && (
                <div className="ticket-form-field">
                  <label htmlFor="exhibition">Special Exhibition</label>
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
                </div>
              )}

              <div className="ticket-form-field">
                <label htmlFor="visitDate">Visit Date</label>
                <input
                  id="visitDate"
                  type="date"
                  min={new Date().toLocaleDateString('en-CA')}
                  value={visitDate}
                  onChange={(event) => setVisitDate(event.target.value)}
                  required
                />
              </div>

              <div className="ticket-form-field">
                <label htmlFor="quantity">Number of Visitors</label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={quantity}
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === '') {
                      setQuantity('')
                      return
                    }
                    const number = Number(value)
                    if (Number.isInteger(number)) {
                      setQuantity(Math.max(1, Math.min(10, number)))
                    }
                  }}
                  onBlur={() => {
                    if (quantity === '' || quantity < 1) {
                      setQuantity(1)
                    }
                  }}
                  required
                />
                <small>Enter between 1 and 10 visitors.</small>
              </div>

              {error && <p className="error-message">{error}</p>}

              <button
                type="button"
                className="ticket-continue-button"
                onClick={handlePurchase}
              >
                Continue to Checkout
              </button>

              {authChecked && !user && (
                <p className="ticket-login-note">
                  Already have an account? <Link to="/login">Log in</Link> to continue.
                </p>
              )}
            </div>

            <div className="ticket-order-summary">
              <h3>Order Summary</h3>

              <div className="ticket-summary-row">
                <span>Ticket Type</span>
                <strong>{ticketType}</strong>
              </div>

              {ticketType === 'Single Exhibition' && (
                <div className="ticket-summary-row">
                  <span>Exhibition</span>
                  <strong>
                    {exhibitions.find(
                      (exhibition) =>
                        Number(exhibition.ExhibitionID) === Number(exhibitionId)
                    )?.Name || 'Not selected'}
                  </strong>
                </div>
              )}

              <div className="ticket-summary-row">
                <span>Visit Date</span>
                <strong>{visitDate || 'Not selected'}</strong>
              </div>

              <div className="ticket-summary-row">
                <span>Visitors</span>
                <strong>{quantity}</strong>
              </div>

              <div className="ticket-summary-row">
                <span>Price per person</span>
                <strong>${prices[ticketType].toFixed(2)}</strong>
              </div>

              <div className="ticket-summary-total">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>

              <p className="ticket-summary-note">
                Your order will be reviewed before completing checkout.
              </p>
            </div>
          </div>

        </section>
      </div>
    )
}

export default CustomerTickets
