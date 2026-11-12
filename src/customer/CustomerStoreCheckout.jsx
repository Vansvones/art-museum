
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function CustomerStoreCheckout() {
  const location = useLocation()
  const navigate = useNavigate()

  const order = location.state
  const items = order?.type === 'store' ? order.items || [] : []

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
    cvv: '',
    shippingFirstName: '',
    shippingLastName: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: ''
  })
  const [sameAsBilling, setSameAsBilling] = useState(true)

  const total = items.reduce(
    (sum, item) => sum + Number(item.Price) * Number(item.Quantity),
    0
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

    if (name === 'zip' || name === 'shippingZip') {
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

    if (!sameAsBilling) {
      if (
        !form.shippingFirstName.trim() ||
        !form.shippingLastName.trim() ||
        !form.shippingAddress.trim() ||
        !form.shippingCity.trim() ||
        !form.shippingState.trim()
      ) {
        return 'Please complete your shipping address.'
      }

      if (!/^\d{5}$/.test(form.shippingZip)) {
        return 'Please enter a valid shipping ZIP code.'
      }
    }

    if (!form.cardholder.trim()) {
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
      setError('Please confirm your order.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/store-checkout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            ItemID: item.ItemID,
            StoreID: item.StoreID,
            Quantity: item.Quantity
          })),
          shippingAddress: {
            firstName: sameAsBilling ? form.firstName : form.shippingFirstName,
            lastName: sameAsBilling ? form.lastName : form.shippingLastName,
            address: sameAsBilling ? form.address : form.shippingAddress,
            city: sameAsBilling ? form.city : form.shippingCity,
            state: sameAsBilling ? form.state : form.shippingState,
            zip: sameAsBilling ? form.zip : form.shippingZip
          }
        })
      })

      const result = await response.json()

      if (response.status === 401) {
        navigate('/login', {
          state: {
            from: '/customer/store-checkout',
            message: 'Please log in to complete your purchase.'
          }
        })
        return
      }

      if (!response.ok) {
        throw new Error(result.error || 'Checkout failed.')
      }

      navigate('/customer/stores', {
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

  if (items.length === 0) {
    return (
      <div className="customer-page">
        <section className="customer-content">
          <h2>No Order Selected</h2>
          <p>Please add items to your shopping cart first.</p>
          <Link to="/customer/stores">Back to Museum Stores</Link>
        </section>
      </div>
    )
  }

  return (
    <div className="customer-page">
      <section className="customer-content">
        <section className="galleries-page">
          <h2>Checkout</h2>
          <p>Complete your information to purchase your museum store items.</p>
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

            <h3>Shipping Address</h3>
            <label className="checkout-confirmation">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(event) => setSameAsBilling(event.target.checked)}
              />
              Same as billing address
            </label>

            <div className="checkout-payment-grid">
              <div className="checkout-field">
                <label htmlFor="shippingFirstName">First Name</label>
                <input
                  id="shippingFirstName"
                  name="shippingFirstName"
                  value={
                    sameAsBilling ? form.firstName : form.shippingFirstName
                  }
                  onChange={handleChange}
                  disabled={sameAsBilling}
                  required={!sameAsBilling}
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="shippingLastName">Last Name</label>
                <input
                  id="shippingLastName"
                  name="shippingLastName"
                  value={
                    sameAsBilling ? form.lastName : form.shippingLastName
                  }
                  onChange={handleChange}
                  disabled={sameAsBilling}
                  required={!sameAsBilling}
                />
              </div>
            </div>

            <div className="checkout-field">
              <label htmlFor="shippingAddress">Street Address</label>
              <input
                id="shippingAddress"
                name="shippingAddress"
                value={
                  sameAsBilling ? form.address : form.shippingAddress
                }
                onChange={handleChange}
                disabled={sameAsBilling}
                required={!sameAsBilling}
                placeholder="123 Main Street"
              />
            </div>

            <div className="checkout-payment-grid">
              <div className="checkout-field">
                <label htmlFor="shippingCity">City</label>
                <input
                  id="shippingCity"
                  name="shippingCity"
                  value={
                    sameAsBilling ? form.city : form.shippingCity
                  }
                  onChange={handleChange}
                  disabled={sameAsBilling}
                  required={!sameAsBilling}
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="shippingState">State</label>
                <input
                  id="shippingState"
                  name="shippingState"
                  value={
                    sameAsBilling ? form.state : form.shippingState
                  }
                  onChange={handleChange}
                  disabled={sameAsBilling}
                  required={!sameAsBilling}
                  placeholder="TX"
                />
              </div>
            </div>

            <div className="checkout-field">
              <label htmlFor="shippingZip">ZIP Code</label>
              <input
                id="shippingZip"
                name="shippingZip"
                value={
                  sameAsBilling ? form.zip : form.shippingZip
                }
                onChange={handleChange}
                disabled={sameAsBilling}
                required={!sameAsBilling}
                placeholder="77004"
                inputMode="numeric"
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
              I confirm that my store order is correct.
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

            {items.map((item) => (
              <div
                className="checkout-detail"
                key={`${item.StoreID}-${item.ItemID}`}
              >
                <span>
                  {item.Name} × {item.Quantity}
                </span>
                <strong>
                  ${(Number(item.Price) * Number(item.Quantity)).toFixed(2)}
                </strong>
              </div>
            ))}

            <div className="checkout-total">
              <span>Total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <p className="checkout-back">
          <Link to="/customer/stores">Back to Museum Stores</Link>
        </p>
      </section>
    </div>
  )
}

export default CustomerStoreCheckout
