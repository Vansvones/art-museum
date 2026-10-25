
import { Link } from 'react-router-dom'

function CustomerHome() {
  return (
    <div className="customer-page">
      <section className="hero">
        <h1>Discover Art and History</h1>
        <p>
          Explore remarkable artworks, discover talented artists,
          and experience exhibitions at our museum.
        </p>

        <Link to="/customer/artworks">
          <button type="button">Explore Artworks</button>
        </Link>
      </section>

      <section className="customer-content">
        <h2>Explore the Museum</h2>
        <p>
          Learn about our collection and plan your next museum visit.
        </p>

        <div className="customer-options">
          <div className="customer-card">
            <h3>Artworks</h3>
            <p>Discover paintings, sculptures, and other works of art.</p>
            <Link to="/customer/artworks">Browse Artworks</Link>
          </div>

          <div className="customer-card">
            <h3>Artists</h3>
            <p>Learn about the artists behind the collection.</p>
            <Link to="/customer/artists">Explore Artists</Link>
          </div>

          <div className="customer-card">
            <h3>Galleries</h3>
            <p>Explore the museum's galleries and discover where artworks are displayed.</p>
            <Link to="/customer/galleries">View Galleries</Link>
          </div>

          <div className="customer-card">
            <h3>Exhibitions</h3>
            <p>Discover special exhibitions and museum displays.</p>
            <Link to="/customer/exhibitions">View Exhibitions</Link>
          </div>

          <div className="customer-card">
            <h3>Tickets</h3>
            <p>View ticket information for your museum visit.</p>
            <Link to="/customer/tickets">Ticket Information</Link>
          </div>

          <div className="customer-card">
            <h3>Museum Stores</h3>
            <p>Explore the gift shops and specialty stores available at our museum.</p>
            <Link to="/customer/stores">View Stores</Link>
          </div>

          <div className="customer-card">
            <h3>Memberships</h3>
            <p>Explore museum membership options and benefits.</p>
            <Link to="/customer/memberships">Explore Memberships</Link>
          </div>

          <div className="customer-card">
            <h3>Parking</h3>
            <p>View museum parking locations, capacity, and hourly rates.</p>
            <Link to="/customer/parking">View Parking</Link>
          </div>

        </div>
      </section>
    </div>
  )
}

export default CustomerHome
