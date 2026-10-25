
import { useEffect, useState } from 'react'

function CustomerStores() {
  const [stores, setStores] = useState([])
  const [error, setError] = useState('')
  const [selectedStore, setSelectedStore] = useState(null)
  const [items, setItems] = useState([])
  const [itemsError, setItemsError] = useState('')

  useEffect(() => {
    async function loadStores() {
      try {
        const response = await fetch('http://localhost:3000/api/stores')

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
      const response = await fetch('http://localhost:3000/api/items')

      if (!response.ok) {
        throw new Error('Failed to load store items')
      }

      setItems(await response.json())
    } catch (error) {
      setItemsError(error.message)
    }
  }

  return (
    <div className="galleries-page">
      <h2>Museum Stores</h2>

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
              <p><strong>Location:</strong> {store.Location || 'Not specified'}</p>
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default CustomerStores
