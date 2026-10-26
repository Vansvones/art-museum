
import { useEffect, useState } from 'react'

function CustomerParking() {
  const [parkingLots, setParkingLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadParkingLots() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/parking-lots'
        )

        if (!response.ok) {
          throw new Error('Failed to load parking information')
        }

        setParkingLots(await response.json())
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadParkingLots()
  }, [])

  return (
    <div className="customer-page">
      <section className="galleries-page">
        <h2>Museum Parking</h2>
        <p>
          Find parking locations, capacity information, and hourly rates
          for your museum visit.
        </p>

        {loading && <p>Loading parking information...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && parkingLots.length === 0 && (
          <p>No parking lots are listed yet.</p>
        )}

        {!loading && !error && parkingLots.length > 0 && (
          <div className="customer-options">
            {parkingLots.map((lot) => (
              <div className="customer-card" key={lot.ParkingLotID}>
                <h3>{lot.Name}</h3>

                <p>
                  <strong>Location:</strong>{' '}
                  {lot.Location || 'Not specified'}
                </p>

                <p>
                  <strong>Capacity:</strong>{' '}
                  {lot.Capacity ?? 'Not specified'}
                </p>

                <p>
                  <strong>Hourly Rate:</strong>{' '}
                  {lot.HourlyRate == null
                    ? 'Not specified'
                    : `$${Number(lot.HourlyRate).toFixed(2)} per hour`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default CustomerParking
