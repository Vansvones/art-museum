import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function CustomerParkingCheckout() {
  const location = useLocation()
  const navigate = useNavigate()

  const reservation = location.state

  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (
    !reservation ||
    !reservation.parkingLot ||
    !reservation.visitDate ||
    !reservation.arrivalTime ||
    !reservation.departureTime
  ) {
    return (
      <div className="customer-page">
        <section className="customer-content">
          <h2>No Reservation Selected</h2>
          <p>Please select your parking details first.</p>
          <Link to="/customer/parking">Choose Parking</Link>
        </section>
      </div>
    )
  }

  function formatTime(time) {
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12

    return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`
  }

  const arrival = reservation.arrivalTime.split(':').map(Number)
  const departure = reservation.departureTime.split(':').map(Number)

  const duration =
    (departure[0] * 60 + departure[1] -
      arrival[0] * 60 - arrival[1]) / 60

  const hourlyRate = Number(reservation.parkingLot.HourlyRate)
  const total = duration * hourlyRate

  async function handleCheckout(event) {
    event.preventDefault()
    setError('')

    if (!confirmed) {
      setError('Please confirm the demo reservation.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        '/api/parking-passes/purchase',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ParkingLotID: Number(reservation.parkingLot.ParkingLotID),
            VisitDate: reservation.visitDate,
            ArrivalTime: reservation.arrivalTime,
            DepartureTime: reservation.departureTime
          })
        }
      )

      const result = await response.json()

      if (response.status === 401) {
        navigate('/login', {
          state: {
            from: '/customer/parking',
            message: 'Please log in to complete your reservation.'
          }
        })
        return
      }

      if (!response.ok) {
        throw new Error(result.error || 'Reservation failed.')
      }

      navigate('/customer/parking', {
        replace: true,
        state: {
          reservation: result,
          parkingLot: reservation.parkingLot,
          visitDate: reservation.visitDate,
          arrivalTime: reservation.arrivalTime,
          departureTime: reservation.departureTime
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
          <h2>Parking Checkout</h2>
        </section>

        <div className="checkout-layout">
          <div className="checkout-summary">
            <h3>Reservation Summary</h3>

            <div className="checkout-detail">
              <span>Parking Lot</span>
              <strong>{reservation.parkingLot.Name}</strong>
            </div>

            <div className="checkout-detail">
              <span>Location</span>
              <strong>
                {reservation.parkingLot.Location || 'Not specified'}
              </strong>
            </div>

            <div className="checkout-detail">
              <span>Visit Date</span>
              <strong>{reservation.visitDate}</strong>
            </div>

            <div className="checkout-detail">
              <span>Arrival Time</span>
              <strong>{formatTime(reservation.arrivalTime)}</strong>
            </div>

            <div className="checkout-detail">
              <span>Departure Time</span>
              <strong>{formatTime(reservation.departureTime)}</strong>
            </div>

            <div className="checkout-detail">
              <span>Duration</span>
              <strong>{duration.toFixed(2)} hours</strong>
            </div>

            <div className="checkout-detail">
              <span>Hourly Rate</span>
              <strong>${hourlyRate.toFixed(2)}</strong>
            </div>

            <div className="checkout-total">
              <span>Total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>

          <form
            className="checkout-payment-card"
            onSubmit={handleCheckout}
          >
            <h3>Demo Reservation</h3>

            <p>
              This is a class-project reservation simulation.
              No real payment will be processed.
            </p>

            <label className="checkout-confirmation">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I confirm this parking reservation.
            </label>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : `Confirm Reservation — $${total.toFixed(2)}`}
            </button>
          </form>
        </div>

        <p className="checkout-back">
          <Link to="/customer/parking">Back to parking selection</Link>
        </p>
      </section>
    </div>
  )
}

export default CustomerParkingCheckout
