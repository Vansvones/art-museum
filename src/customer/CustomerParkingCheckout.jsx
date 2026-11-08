import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function CustomerParkingCheckout() {
  const location = useLocation()
  const navigate = useNavigate()
  const reservation = location.state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [form, setForm] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    cardholder: '',
    cardNumber: '',
    expiration: '',
    cvv: ''
  })

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

  function handleChange(event) {
    const { name, value } = event.target
    let updatedValue = value

    if (name === 'cardNumber') {
      updatedValue = value.replace(/\D/g, '').slice(0, 16)
      updatedValue = updatedValue.replace(/(.{4})/g, '$1 ').trim()
    }
    if (name === 'expiration') {
      const digits = value.replace(/\D/g, '').slice(0, 4)
      updatedValue = digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits
    }
    if (name === 'cvv') {
      updatedValue = value.replace(/\D/g, '').slice(0, 4)
    }
    if (name === 'zip') {
      updatedValue = value.replace(/\D/g, '').slice(0, 5)
    }

    setForm({
      ...form,
      [name]: updatedValue
    })
  }

  function validateForm() {
    if (!form.email.trim() || !form.phone.trim()) {
      return 'Please enter your contact information.'
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.zip.trim()
    ) {
      return 'Please complete your billing address.'
    }

    if (!/^\d{5}$/.test(form.zip)) {
      return 'Please enter a valid 5-digit ZIP code.'
    }

    if (!form.cardholder.trim()) {
      return 'Please enter the name on the card.'
    }

    if (form.cardNumber.replace(/\D/g, '').length !== 16) {
      return 'Please enter a valid 16-digit test card number.'
    }

    if (!/^\d{2}\/\d{2}$/.test(form.expiration)) {
      return 'Please enter the expiration date in MM/YY format.'
    }

    const [month, year] = form.expiration.split('/').map(Number)

    if (month < 1 || month > 12) {
      return 'Please enter a valid expiration date.'
    }

    const expirationDate = new Date(2000 + year, month - 1)
    const currentDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth()
    )

    if (expirationDate < currentDate) {
      return 'Please enter a card expiration date in the future.'
    }

    if (!/^\d{3,4}$/.test(form.cvv)) {
      return 'Please enter a valid CVV.'
    }

    return ''
  }

  async function handleCheckout(event) {
    event.preventDefault()
    setError('')

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    if (!confirmed) {
      setError('Please confirm your reservation.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/parking-passes/purchase', {
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
      })

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
          departureTime: reservation.departureTime,
          paymentSuccessful: true
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
          <p>Complete your information to reserve your parking space.</p>
        </section>

        <div className="checkout-layout">
          <form
            className="checkout-payment-card"
            onSubmit={handleCheckout}
          >
            <h3>Contact Information</h3>

            <div className="checkout-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="checkout-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(713) 555-0123"
                required
              />
            </div>

            <h3>Billing Address</h3>

            <div className="checkout-payment-grid">
              <div className="checkout-field">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="checkout-field">
              <label htmlFor="address">Street Address</label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="checkout-payment-grid">
              <div className="checkout-field">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="TX"
                  required
                />
              </div>
            </div>

            <div className="checkout-field">
              <label htmlFor="zip">ZIP Code</label>
              <input
                id="zip"
                name="zip"
                value={form.zip}
                onChange={handleChange}
                placeholder="77004"
                inputMode="numeric"
                required
              />
            </div>

            <h3>Payment Information</h3>

            <p className="checkout-demo-notice">
              Payment simulation. No actual payment will be processed
              or charged.
            </p>

            <div className="checkout-field">
              <label htmlFor="cardholder">Name on Card</label>
              <input
                id="cardholder"
                name="cardholder"
                value={form.cardholder}
                onChange={handleChange}
                placeholder="Full name on card"
                autoComplete="off"
                required
              />
            </div>

            <div className="checkout-field">
              <label htmlFor="cardNumber">Card Number</label>
              <input
                id="cardNumber"
                name="cardNumber"
                value={form.cardNumber}
                onChange={handleChange}
                placeholder="Card number"
                inputMode="numeric"
                autoComplete="off"
                required
              />
            </div>

            <div className="checkout-payment-grid">
              <div className="checkout-field">
                <label htmlFor="expiration">Expiration Date</label>
                <input
                  id="expiration"
                  name="expiration"
                  value={form.expiration}
                  onChange={handleChange}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="cvv">Security Code</label>
                <input
                  id="cvv"
                  type="password"
                  name="cvv"
                  value={form.cvv}
                  onChange={handleChange}
                  placeholder="CVV"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <label className="checkout-confirmation">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I confirm that my reservation details are correct.
            </label>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : `Place Order — $${total.toFixed(2)}`}
            </button>
          </form>

          <div className="checkout-summary">
            <h3>Order Summary</h3>

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
              <span>Arrival</span>
              <strong>{formatTime(reservation.arrivalTime)}</strong>
            </div>

            <div className="checkout-detail">
              <span>Departure</span>
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
        </div>

        <p className="checkout-back">
          <Link to="/customer/parking">Back to parking selection</Link>
        </p>
      </section>
    </div>
  )
}

export default CustomerParkingCheckout
