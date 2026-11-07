
import { Link } from 'react-router-dom'

function ClerkDashboard() {
  return (
    <div className="admin-page">
      <h1>Museum Clerk Dashboard</h1>
      <p>Manage museum tickets, stores, and inventory.</p>

      <div className="admin-options">
        <div className="admin-card">
          <h3>Manage Tickets</h3>
          <p>Review and manage museum ticket records.</p>
          <Link to="/clerk/tickets">
            <button type="button">Manage Tickets</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Stores</h3>
          <p>Maintain museum store information and records.</p>
          <Link to="/clerk/stores">
            <button type="button">Manage Stores</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Items</h3>
          <p>Manage museum store inventory, products, and prices.</p>
          <Link to="/clerk/items">
            <button type="button">Manage Items</button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ClerkDashboard
