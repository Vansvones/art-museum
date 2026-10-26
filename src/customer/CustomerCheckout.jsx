import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function CustomerCheckout() {
  const location = useLocation()
  const navigate = useNavigate()

  const order = location.state

  const [exhibitions, setExhibitions] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')


  const prices = {
    'General Admission': 18,
    'Single Exhibition': 30
  }

  useEffect(() => {
    async function loadExhibitions() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/exhibitions'
        )

        if (response.ok) {
          setExhibitions(await response.json())
        }
      } catch (error) {
        console.error('Could not load exhibitions:', error)
      }
    }

    loadExhibitions()
  }, [])


  if (!order || !prices[order.Type]) {
    return (
      <div className="customer-page">
        <section className="customer-content">
          <h2>No Order Selected</h2>
          <p>Please select your tickets first.</p>
          <Link to="/customer/tickets">Choose Tickets</Link>
        </section>
      </div>
    )
  }

  const total = prices[order.Type] * order.Quantity

  const selectedExhibition = exhibitions.find(
    (exhibition) =>
      Number(exhibition.ExhibitionID) === Number(order.ExhibitionID)
  )

  async function handleCheckout(event) {
  event.preventDefault()
  setError('')

  if (!confirmed) {
    setError('Please confirm the demo checkout.')
    return
  }

  setLoading(true)

  try {
    const response = await fetch(
      'http://localhost:3000/api/tickets/purchase',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      }
    )

    const result = await response.json()

    if (response.status === 401) {
      navigate('/login', {
        state: {
          from: '/customer/checkout',
          message: 'Please log in to complete your purchase.'
        }
      })
      return
    }

    if (!response.ok) {
      throw new Error(result.error || 'Checkout failed.')
    }

    navigate('/customer/tickets', {
      replace: true,
      state: {
        purchase: result
      }
    })
  } catch (error) {
    setError(error.message)
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="customer-page">
      <section className="customer-content">
        <section className="galleries-page">
          <h2>Checkout</h2>
        </section>

        <h3>Order Summary</h3>

        <p>
          <strong>Ticket Type:</strong> {order.Type}
        </p>

        {order.Type === 'Single Exhibition' && (
          <p>
            <strong>Exhibition:</strong>{' '}
            {selectedExhibition
              ? selectedExhibition.Name
              : `Exhibition #${order.ExhibitionID}`}
          </p>
        )}

        <p>
          <strong>Visit Date:</strong> {order.VisitDate}
        </p>

        <p>
          <strong>Quantity:</strong> {order.Quantity}
        </p>

        <h2>Total: ${total.toFixed(2)}</h2>

        <form
          className="ticket-purchase-form"
          onSubmit={handleCheckout}
        >
            
          <h3>Demo Payment</h3>

          <p>
            This is a class-project checkout simulation. No real payment
            will be processed.
          </p>

          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I confirm this demo purchase.
          </label>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : `Confirm Purchase — $${total.toFixed(2)}`}
          </button>
        </form>

        <p>
          <Link to="/customer/tickets">Back to ticket selection</Link>
        </p>
      </section>
    </div>
  )
}

export default CustomerCheckout