import { useEffect, useState } from 'react'

function AdminStoreOrders({ isAdmin }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updating, setUpdating] = useState(null)

  const statuses = [
    'Pending',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled'
  ]

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch('/api/admin/store-orders', {
          credentials: 'include'
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load orders.')
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
          VisitorID: item.VisitorID,
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

  const filteredOrders = groupedOrders.filter((order) => {
    const matchesSearch =
      String(order.OrderID).includes(search) ||
      String(order.VisitorID).includes(search) ||
      order.items.some((item) =>
        item.ItemName?.toLowerCase().includes(search.toLowerCase())
      )

    const matchesFilter =
      filter === 'All' || order.OrderStatus === filter

    return matchesSearch && matchesFilter
  })

  async function updateStatus(orderID, status) {
    setUpdating(orderID)
    setError('')

    try {
      const response = await fetch(
        `/api/admin/store-orders/${orderID}/status`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order status.')
      }

      setOrders((currentOrders) =>
        currentOrders.map((item) =>
          item.OrderID === orderID
            ? { ...item, OrderStatus: status }
            : item
        )
      )
    } catch (error) {
      setError(error.message)
    } finally {
      setUpdating(null)
    }
  }

  async function deleteOrder(orderID) {
    const confirmed = window.confirm(
        `Are you sure you want to delete order #${orderID}? This action cannot be undone.`
    )

    if (!confirmed) {
        return
    }

    setError('')

    try {
        const response = await fetch(
        `/api/admin/store-orders/${orderID}`,
        {
            method: 'DELETE',
            credentials: 'include'
        }
        )

        const result = await response.json()

        if (!response.ok) {
        throw new Error(result.error || 'Failed to delete order.')
        }

        setOrders((currentOrders) =>
        currentOrders.filter((item) => item.OrderID !== orderID)
        )

        if (selectedOrder === orderID) {
        setSelectedOrder(null)
        }
    } catch (error) {
        setError(error.message)
    }
    }

  const totalRevenue = groupedOrders
    .filter((order) => order.OrderStatus !== 'Cancelled')
    .reduce((sum, order) => sum + Number(order.TotalAmount), 0)

  const pendingOrders = groupedOrders.filter(
    (order) => order.OrderStatus === 'Pending'
  ).length

  const shippedOrders = groupedOrders.filter(
    (order) => order.OrderStatus === 'Shipped'
  ).length

  return (
    <div className="galleries-page admin-store-orders">
      <h2>Store Order Management</h2>
      <p>View and manage museum store purchases.</p>

      {isAdmin && (
        <div className="store-order-stats">
          <div className="store-order-stat">
            <h3>{groupedOrders.length}</h3>
            <p>Total Orders</p>
          </div>

          <div className="store-order-stat">
            <h3>{pendingOrders}</h3>
            <p>Pending Orders</p>
          </div>

          <div className="store-order-stat">
            <h3>{shippedOrders}</h3>
            <p>Shipped Orders</p>
          </div>

          <div className="store-order-stat">
            <h3>${totalRevenue.toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
      )}

      <div className="store-order-controls">
        <input
          type="text"
          placeholder="Search by order ID, visitor ID, or item..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="All">All Orders</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading orders...</p>}

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && filteredOrders.length === 0 && (
        <p>No orders found.</p>
      )}

      {!loading && filteredOrders.map((order) => (
        <section className="store-admin-order-card" key={order.OrderID}>
          <div className="store-admin-order-header">
            <div>
              <h3>Order #{order.OrderID}</h3>
              <p>
                {new Date(order.OrderDate).toLocaleString()}
              </p>
              <p>Visitor ID: {order.VisitorID}</p>
            </div>

            <strong>
              ${Number(order.TotalAmount).toFixed(2)}
            </strong>
          </div>

          <div className="store-admin-order-status">
            <label htmlFor={`status-${order.OrderID}`}>
              Order Status
            </label>

            <select
              id={`status-${order.OrderID}`}
              value={order.OrderStatus}
              disabled={updating === order.OrderID}
              onChange={(event) =>
                updateStatus(order.OrderID, event.target.value)
              }
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {updating === order.OrderID && <span>Updating...</span>}
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button
              type="button"
              className="store-order-details-button"
              onClick={() =>
                setSelectedOrder(
                  selectedOrder === order.OrderID ? null : order.OrderID
                )
              }
            >
              {selectedOrder === order.OrderID
                ? 'Hide Details'
                : 'View Details'}
            </button>

            {isAdmin && (
              <button
                type="button"
                className="store-order-details-button"
                onClick={() => deleteOrder(order.OrderID)}
              >
                Delete Order
              </button>
            )}
          </div>

          {selectedOrder === order.OrderID && (
            <div className="store-admin-order-details">
              <h4>Shipping Address</h4>

              <div className="store-shipping-address">
                <p>
                  <strong>
                    {order.ShippingFirstName} {order.ShippingLastName}
                  </strong>
                </p>
                <p>{order.ShippingAddress}</p>
                <p>
                  {order.ShippingCity}, {order.ShippingState} {order.ShippingZip}
                </p>
              </div>

              <h4>Purchased Items</h4>

              {order.items.map((item) => (
                <div className="store-admin-order-item" key={item.ItemSoldID}>
                  <div className="store-admin-order-item-info">
                    <img
                      src={`/ItemsImages/${item.ItemID}.jpeg`}
                      alt={item.ItemName}
                      className="store-item-image"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />

                    <div>
                      <strong>{item.ItemName}</strong>
                      <p>{item.StoreName || 'Not available'}</p>
                      <p>Quantity: {item.Quantity}</p>
                    </div>
                  </div>

                  <div>
                    <strong>
                      ${(Number(item.SoldPrice) * Number(item.Quantity)).toFixed(2)}
                    </strong>
                    <p>
                      ${Number(item.SoldPrice).toFixed(2)} each
                    </p>
                  </div>
                </div>
              ))}

              <h3 className="store-admin-order-total">
                Order Total: ${Number(order.TotalAmount).toFixed(2)}
              </h3>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

export default AdminStoreOrders
