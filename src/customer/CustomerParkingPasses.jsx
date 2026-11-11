import { useEffect, useState } from 'react'

function CustomerParkingPasses() {
  const [passes, setPasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [cancellingID, setCancellingID] = useState(null)

  useEffect(() => {
    async function loadParkingPasses() {
      try {
        const response = await fetch('/api/my-parking-passes', {
          credentials: 'include'
        })

        const data = await response.json()

        if (response.status === 401 || response.status === 403) {
          window.location.href = '/login'
          return
        }
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load parking passes.')
        }

        setPasses(data)
      } catch (err) {
        setError(err.message || 'Could not load parking passes.')
      } finally {
        setLoading(false)
      }
    }

    loadParkingPasses()
  }, [])

  async function handleCancel(passID) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this parking pass?'
    )

    if (!confirmed) return

    setCancelError('')
    setCancellingID(passID)

    try {
      const response = await fetch(`/api/my-parking-passes/${passID}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel parking pass.')
      }

      setPasses((currentPasses) =>
        currentPasses.filter((pass) => pass.ParkingPassID !== passID)
      )
    } catch (err) {
      setCancelError(err.message || 'Could not cancel parking pass.')
    } finally {
      setCancellingID(null)
    }
  }

  function formatDate(date) {
    if (!date) return 'Not specified'

    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
  }

  function formatTime(time) {
    if (!time) return 'Not specified'

    const [hour, minute] = String(time).split(':')
    const hourNumber = Number(hour)
    const period = hourNumber >= 12 ? 'PM' : 'AM'
    const displayHour = hourNumber % 12 || 12

    return `${displayHour}:${minute} ${period}`
  }

  return (
    <div className="customer-page">
      <section className="parking-page">
        <h2>My Parking Passes</h2>
        <p>View your purchased museum parking passes.</p>

        {loading && <p>Loading parking passes...</p>}

        {error && <p className="error-message">{error}</p>}

        {cancelError && (
          <p className="error-message">{cancelError}</p>
        )}

        {!loading && !error && passes.length === 0 && (
          <p>You have not purchased any parking passes yet.</p>
        )}

        {!loading && !error && passes.length > 0 && (
          <div className="customer-options">
            {passes.map((pass) => (
              <div className="customer-card" key={pass.ParkingPassID}>
                <h3>Parking Pass #{pass.ParkingPassID}</h3>
                <p>
                  <strong>Parking Lot:</strong> {pass.ParkingLotName}
                </p>
                <p>
                  <strong>Visit Date:</strong> {formatDate(pass.VisitDate)}
                </p>
                <p>
                  <strong>Arrival:</strong> {formatTime(pass.ArrivalTime)}
                </p>
                <p>
                  <strong>Departure:</strong> {formatTime(pass.DepartureTime)}
                </p>
                <p>
                  <strong>Total Paid:</strong>{' '}
                  ${Number(pass.TotalPrice).toFixed(2)}
                </p>
                <button
                  type="button"
                  className="cancel-parking-button"
                  onClick={() => handleCancel(pass.ParkingPassID)}
                  disabled={cancellingID === pass.ParkingPassID}
                >
                  {cancellingID === pass.ParkingPassID
                    ? 'Cancelling...'
                    : 'Cancel Pass'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default CustomerParkingPasses
