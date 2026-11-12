import { useEffect, useState } from 'react'

function CustomerStorePurchases() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch('/api/my-store-orders', {
          credentials: 'include'
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load purchases.')
        }

        setOrders(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  const groupedOrders = Object.values(
    orders.reduce((groups, item) => {
        if (!groups[item.OrderID]) {
            groups[item.OrderID] = {
            OrderID: item.OrderID,
            OrderDate: item.OrderDate,
            TotalAmount: item.TotalAmount,
            OrderStatus: item.OrderStatus,
            ShippingFirstName: item.ShippingFirstName,
            ShippingLastName: item.ShippingLastName,
            ShippingAddress: item.ShippingAddress,
            ShippingCity: item.ShippingCity,
            ShippingState: item.ShippingState,
            ShippingZip: item.ShippingZip,
            items: []
            }
        }

        if (item.ItemSoldID) {
        groups[item.OrderID].items.push(item)
        }

        return groups
    }, {})
    ).sort((a, b) => {
    return new Date(b.OrderDate) - new Date(a.OrderDate)
    })

  return (
    <div className="galleries-page">
      <h2>My Store Purchases</h2>
      <p>View your previous museum store orders.</p>

      {loading && <p>Loading purchases...</p>}

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <p>You have not made any store purchases yet.</p>
      )}

      {!loading && !error && groupedOrders.map((order) => (
        <section className="store-order-card" key={order.OrderID}>
          <h3>Order #{order.OrderID}</h3>

          <p>
            <strong>Order Date:</strong>{' '}
            {new Date(order.OrderDate).toLocaleString()}
          </p>

          <div className="customer-order-status">
            <strong>Order Status:</strong>

            <span className={`order-status-badge ${(order.OrderStatus || 'Pending').toLowerCase()}`}>
              {order.OrderStatus || 'Pending'}
            </span>
          </div>

          {order.ShippingAddress && (
            <div className="store-shipping-address">
              <h4>Shipping Address</h4>

              <p className="shipping-recipient">
                {order.ShippingFirstName} {order.ShippingLastName}
              </p>

              <p>{order.ShippingAddress}</p>

              <p>
                {order.ShippingCity}, {order.ShippingState} {order.ShippingZip}
              </p>
            </div>
          )}

          <div className="gallery-list">
            {order.items.map((item) => (
              <div
                className="gallery-card"
                key={item.ItemSoldID}
              >
                <img
                  src={`/ItemsImages/${item.ItemID}.jpeg`}
                  alt={item.ItemName}
                  className="store-item-image"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />

                <h3>{item.ItemName}</h3>

                <p>
                  <strong>Store:</strong> {item.StoreName || 'Not available'}
                </p>

                <p>
                  <strong>Quantity:</strong> {item.Quantity}
                </p>

                <p>
                  <strong>Price per item:</strong>{' '}
                  ${Number(item.SoldPrice).toFixed(2)}
                </p>

                <p>
                  <strong>Subtotal:</strong>{' '}
                  ${(Number(item.SoldPrice) * Number(item.Quantity)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <h3>
            Order Total: ${Number(order.TotalAmount).toFixed(2)}
          </h3>
        </section>
      ))}
    </div>
  )
}

export default CustomerStorePurchases
