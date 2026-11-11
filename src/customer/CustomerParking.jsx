import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function CustomerParking() {
  const navigate = useNavigate()
  const location = useLocation()
  const purchase = location.state?.reservation
  const confirmedLot = location.state?.parkingLot

  const [parkingLots, setParkingLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [parkingLotID, setParkingLotID] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [arrivalHour, setArrivalHour] = useState('')
  const [arrivalMinute, setArrivalMinute] = useState('')
  const [arrivalPeriod, setArrivalPeriod] = useState('')

  const [departureHour, setDepartureHour] = useState('')
  const [departureMinute, setDepartureMinute] = useState('')
  const [departurePeriod, setDeparturePeriod] = useState('')
  const selectedLot = parkingLots.find(
    (lot) => lot.ParkingLotID === Number(parkingLotID)
  )

  useEffect(() => {
    async function loadParkingLots() {
      try {
        const response = await fetch('/api/parking-lots')

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

  function formatTime(time) {
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12

    return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`
  }

  function handleContinue(event) {
    event.preventDefault()
    setError('')

    if (
      !parkingLotID ||
      !visitDate ||
      !arrivalHour ||
      !arrivalMinute ||
      !arrivalPeriod ||
      !departureHour ||
      !departureMinute ||
      !departurePeriod
    ) {
      setError('Please complete all reservation fields.')
      return
    }

    function convertTo24Hour(hour, minute, period) {
      let convertedHour = Number(hour)

      if (period === 'AM' && convertedHour === 12) {
        convertedHour = 0
      } else if (period === 'PM' && convertedHour !== 12) {
        convertedHour += 12
      }

      return `${String(convertedHour).padStart(2, '0')}:${minute}`
    }

    const arrivalTime = convertTo24Hour(
      arrivalHour, arrivalMinute, arrivalPeriod
    )

    const departureTime = convertTo24Hour(
      departureHour, departureMinute, departurePeriod
    )

    if (departureTime <= arrivalTime) {
      setError('Departure time must be later than arrival time.')
      return
    }

    navigate('/customer/parking-checkout', {
      state: {
        parkingLot: selectedLot,
        visitDate,
        arrivalTime,
        departureTime
      }
    })
  }

  return (
    <div className="customer-page">
      <section className="parking-page">
        <div className="parking-page-header">
          <h2>Museum Parking</h2>

          <button
            type="button"
            className="parking-passes-button"
            onClick={() => navigate('/customer/my-parking-passes')}
          >
            My Parking Passes
          </button>
        </div>

        {purchase && (
          <div className="customer-card">
            <h3>Parking Reservation Confirmed!</h3>

            <p>Your parking reservation was successfully recorded.</p>

            <p>
              <strong>Parking Pass ID:</strong> {purchase.ParkingPassID}
            </p>

            <p>
              <strong>Parking Lot:</strong> {confirmedLot?.Name}
            </p>

            <p>
              <strong>Visit Date:</strong> {location.state.visitDate}
            </p>

            <p>
              <strong>Arrival:</strong> {formatTime(location.state.arrivalTime)}
            </p>

            <p>
              <strong>Departure:</strong> {formatTime(location.state.departureTime)}
            </p>

            <p>
              <strong>Total Paid:</strong> ${Number(purchase.totalPrice).toFixed(2)}
            </p>
          </div>
        )}

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
          <>
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

            <div className="parking-form-card">
            <h3>Reserve Parking</h3>
            <p>Select your parking location and reservation times.</p>

            <form className="parking-form" onSubmit={handleContinue}>
              <div className="parking-field">
                <label>Parking Lot</label>
                <select
                  value={parkingLotID}
                  onChange={(event) => setParkingLotID(event.target.value)}
                  required
                >
                  <option value="">Select a parking lot</option>
                  {parkingLots.map((lot) => (
                    <option key={lot.ParkingLotID} value={lot.ParkingLotID}>
                      {lot.Name} - ${Number(lot.HourlyRate).toFixed(2)}/hour
                    </option>
                  ))}
                </select>
              </div>

              {selectedLot && (
                <div className="parking-selection-summary">
                  <p><strong>Selected location:</strong> {selectedLot.Name}</p>
                  <p><strong>Capacity:</strong> {selectedLot.Capacity}</p>
                  <p>
                    <strong>Hourly rate:</strong>{' '}
                    ${Number(selectedLot.HourlyRate).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="parking-field">
                <label>Visit Date</label>
                <input
                  type="date"
                  value={visitDate}
                  min={new Date().toLocaleDateString('en-CA')}
                  onChange={(event) => setVisitDate(event.target.value)}
                  required
                />
              </div>

              <div className="parking-time-grid">
                <div className="parking-time-group">
                  <label>Arrival Time</label>
                  <div className="parking-time-select">
                    <select value={arrivalHour} onChange={(event) => setArrivalHour(event.target.value)} required>
                      <option value="">Hour</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                        <option key={hour} value={String(hour)}>{hour}</option>
                      ))}
                    </select>

                    <select value={arrivalMinute} onChange={(event) => setArrivalMinute(event.target.value)} required>
                      <option value="">Min</option>
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>

                    <select value={arrivalPeriod} onChange={(event) => setArrivalPeriod(event.target.value)} required>
                      <option value="">AM/PM</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="parking-time-group">
                  <label>Departure Time</label>
                  <div className="parking-time-select">
                    <select value={departureHour} onChange={(event) => setDepartureHour(event.target.value)} required>
                      <option value="">Hour</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                        <option key={hour} value={String(hour)}>{hour}</option>
                      ))}
                    </select>

                    <select value={departureMinute} onChange={(event) => setDepartureMinute(event.target.value)} required>
                      <option value="">Min</option>
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>

                    <select value={departurePeriod} onChange={(event) => setDeparturePeriod(event.target.value)} required>
                      <option value="">AM/PM</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit">Continue to Checkout</button>
            </form>
          </div>
          </>
        )}
      </section>
    </div>
  )
}

export default CustomerParking
