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

  const prices = {
    'General Admission': 18,
    'Single Exhibition': 30
  }

  useEffect(() => {
    async function loadExhibitions() {
      try {
        const response = await fetch('/api/exhibitions')

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

  const total = prices[order.Type] * Number(order.Quantity)

  const selectedExhibition = exhibitions.find(
    (exhibition) =>
      Number(exhibition.ExhibitionID) === Number(order.ExhibitionID)
  )

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
      !form.state.trim()
    ) {
      return 'Please complete your billing address.'
    }
    if (!/^\d{5}$/.test(form.zip)) {
      return 'Please enter a valid 5-digit ZIP code.'
    }
    if (!form.cardholder.trim()){
      return 'Please enter the name on the card.'
    }
    if (form.cardNumber.replace(/\D/g, '').length !== 16) {
      return 'Please enter a 16-digit test card number.'
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
      return 'Please enter an expiration date in the future.'
    }
    if (!/^\d{3,4}$/.test(form.cvv)) {
      return 'Please enter a valid security code.'
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
      setError('Please confirm your ticket purchase.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      })

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
          purchase: {
            ...result,
            Type: order.Type,
            VisitDate: order.VisitDate,
            ExhibitionName: selectedExhibition?.Name
          }
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
          <p>Complete your information to purchase your tickets.</p>
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
              I confirm that my ticket order is correct.
            </label>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading
                ? 'Processing...'
                : `Place Order — $${total.toFixed(2)}`}
            </button>
          </form>

          <div className="checkout-summary">
            <h3>Order Summary</h3>

            <div className="checkout-detail">
              <span>Ticket Type</span>
              <strong>{order.Type}</strong>
            </div>

            {order.Type === 'Single Exhibition' && (
              <div className="checkout-detail">
                <span>Exhibition</span>
                <strong>
                  {selectedExhibition
                    ? selectedExhibition.Name
                    : `Exhibition #${order.ExhibitionID}`}
                </strong>
              </div>
            )}

            <div className="checkout-detail">
              <span>Visit Date</span>
              <strong>{order.VisitDate}</strong>
            </div>

            <div className="checkout-detail">
              <span>Quantity</span>
              <strong>{order.Quantity}</strong>
            </div>

            <div className="checkout-detail">
              <span>Price per Ticket</span>
              <strong>${prices[order.Type].toFixed(2)}</strong>
            </div>

            <div className="checkout-total">
              <span>Total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <p className="checkout-back">
          <Link to="/customer/tickets">Back to ticket selection</Link>
        </p>
      </section>
    </div>
  )
}

export default CustomerCheckout
