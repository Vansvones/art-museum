import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function CustomerStores() {
  const [stores, setStores] = useState([])
  const [error, setError] = useState('')
  const [selectedStore, setSelectedStore] = useState(null)
  const [items, setItems] = useState([])
  const [itemsError, setItemsError] = useState('')
  const [cart, setCart] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const purchase = location.state?.purchase

  useEffect(() => {
    if (purchase) {
      window.history.replaceState({}, document.title)
    }
  }, [purchase])

  useEffect(() => {
    async function loadStores() {
      try {
        const response = await fetch('/api/stores')

        if (!response.ok) {
          throw new Error('Failed to load stores')
        }

        setStores(await response.json())
      } catch (error) {
        setError(error.message)
      }
    }

    loadStores()
  }, [])

  async function handleStoreClick(store) {
    setSelectedStore(store)
    setItems([])
    setItemsError('')

    try {
      const response = await fetch(
        `/api/stores/${store.StoreID}/items`
      )

      if (!response.ok) {
        throw new Error('Failed to load store items')
      }

      setItems(await response.json())
    } catch (error) {
      setItemsError(error.message)
    }
  }

  function addToCart(item) {
    if (Number(item.StockCount) <= 0) {
      return
    }

    if (item.Price == null) {
      return
    }

    const existingItem = cart.find(
      (cartItem) =>
        cartItem.ItemID === item.ItemID &&
        cartItem.StoreID === selectedStore.StoreID
    )

    if (existingItem && existingItem.Quantity >= Number(item.StockCount)) {
      return
    }

    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.ItemID === item.ItemID &&
          cartItem.StoreID === selectedStore.StoreID
            ? { ...cartItem, Quantity: cartItem.Quantity + 1 }
            : cartItem
        )
      )
    } else {
      setCart([
        ...cart,
        {
          ItemID: item.ItemID,
          StoreID: selectedStore.StoreID,
          StoreName: selectedStore.Name,
          Name: item.Name,
          Price: Number(item.Price),
          StockCount: Number(item.StockCount),
          Quantity: 1
        }
      ])
    }
  }

  function changeQuantity(itemID, storeID, amount) {
    setCart(
      cart
        .map((item) => {
          if (item.ItemID === itemID && item.StoreID === storeID) {
            return {
              ...item,
              Quantity: Math.min(
                item.StockCount,
                item.Quantity + amount
              )
            }
          }

          return item
        })
        .filter((item) => item.Quantity > 0)
    )
  }

  function removeFromCart(itemID, storeID) {
    setCart(
      cart.filter(
        (item) =>
          item.ItemID !== itemID || item.StoreID !== storeID
      )
    )
  }

  const total = cart.reduce(
    (sum, item) => sum + item.Price * item.Quantity,
    0
  )

  return (
    <div className="galleries-page">
      <div className="store-page-header">
        <h2>Museum Stores</h2>

        <button
          type="button"
          className="store-purchases-button"
          onClick={() => navigate('/customer/store-purchases')}
        >
          My Store Purchases
        </button>
      </div>

      {purchase && (
        <p style={{ color: 'green', fontWeight: 'bold' }}>
          Purchase completed successfully! Order #{purchase.OrderID}.
          Total: ${Number(purchase.TotalAmount).toFixed(2)}
        </p>
      )}

      {error && <p className="error-message">{error}</p>}

      <div className="gallery-list">
        {stores.length === 0 && !error ? (
          <p>Loading stores...</p>
        ) : (
          stores.map((store) => (
            <div
              className="gallery-card"
              key={store.StoreID}
              onClick={() => handleStoreClick(store)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleStoreClick(store)
                }
              }}
            >
              <h3>{store.Name}</h3>
              <p><strong>Type:</strong> {store.Type}</p>
              <p>
                <strong>Location:</strong>{' '}
                {store.Location || 'Not specified'}
              </p>
            </div>
          ))
        )}
      </div>

      {selectedStore && (
        <section className="store-items">
          <h2>Items at {selectedStore.Name}</h2>

          {itemsError && (
            <p className="error-message">{itemsError}</p>
          )}

          {!itemsError && items.length === 0 && (
            <p>No items found in the store.</p>
          )}

          <div className="gallery-list">
            {items.map((item) => (
              <div className="gallery-card" key={item.ItemID}>
                <h3>{item.Name}</h3>

                <p>
                  <strong>Price:</strong>{' '}
                  {item.Price == null
                    ? 'Price unavailable'
                    : `$${Number(item.Price).toFixed(2)}`}
                </p>

                <p>
                  <strong>Quantity:</strong> {item.StockCount}
                </p>

                {Number(item.StockCount) < 10 && (
                  <p style={{ color: '#b42318', fontWeight: 'bold' }}>
                    Low Stock
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => addToCart(item)}
                  disabled={
                    Number(item.StockCount) <= 0 ||
                    item.Price == null ||
                    (cart.find(
                      (cartItem) =>
                        cartItem.ItemID === item.ItemID &&
                        cartItem.StoreID === selectedStore.StoreID
                    )?.Quantity || 0) >= Number(item.StockCount)
                  }
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="store-items">
        <h2>Shopping Cart ({cart.reduce(
          (sum, item) => sum + item.Quantity, 0
        )} items)</h2>

        {cart.length === 0 ? (
          <p>Your shopping cart is empty.</p>
        ) : (
          <>
            <div className="gallery-list">
              {cart.map((item) => (
                <div
                  className="gallery-card"
                  key={`${item.StoreID}-${item.ItemID}`}
                >
                  <h3>{item.Name}</h3>
                  <p><strong>Store:</strong> {item.StoreName}</p>
                  <p>
                    <strong>Price:</strong> ${item.Price.toFixed(2)}
                  </p>
                  <p>
                    <strong>Quantity:</strong> {item.Quantity}
                  </p>
                  <p>
                    <strong>Subtotal:</strong>{' '}
                    ${(item.Price * item.Quantity).toFixed(2)}
                  </p>

                  <div className="cart-action-buttons">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.ItemID, item.StoreID, -1)}
                    >
                      -
                    </button>

                    <button
                      type="button"
                      onClick={() => changeQuantity(item.ItemID, item.StoreID, 1)}
                      disabled={item.Quantity >= item.StockCount}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.ItemID, item.StoreID)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h3>Order Total: ${total.toFixed(2)}</h3>

            <button
              type="button"
              onClick={() =>
                navigate('/customer/store-checkout', {
                  state: {
                    type: 'store',
                    items: cart
                  }
                })
              }
            >
              Continue to Checkout
            </button>
          </>
        )}
      </section>
    </div>
  )
}

export default CustomerStores
