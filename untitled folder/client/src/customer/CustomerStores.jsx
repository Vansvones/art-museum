
import { useEffect, useState } from 'react'

function CustomerStores() {
  const [stores, setStores] = useState([])
  const [error, setError] = useState('')

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

  return (
    <div className="galleries-page">
      <h2>Museum Stores</h2>

      {error && <p className="error-message">{error}</p>}

      <div className="gallery-list">
        {stores.length === 0 && !error ? (
          <p>Loading stores...</p>
        ) : (
          stores.map((store) => (
            <div className="gallery-card" key={store.StoreID}>
              <h3>{store.Name}</h3>
              <p><strong>Type:</strong> {store.Type}</p>
              <p><strong>Location:</strong> {store.Location || 'Not specified'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CustomerStores
