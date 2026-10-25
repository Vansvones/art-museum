import { Link } from 'react-router-dom'

function AdminDashboard() {
  return (
    <div className="admin-page">
      <h1>Museum Administration</h1>
      <p>Manage museum records and review museum activity.</p>

      <div className="admin-options">
        <div className="admin-card">
          <h3>Manage Artworks</h3>
          <p>Add, edit, delete, and search artworks.</p>
          <Link to="/admin/artworks">
            <button type="button">Manage Artworks</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Artists</h3>
          <p>Maintain information about museum artists.</p>
          <Link to="/admin/artists">
            <button type="button">Manage Artists</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Galleries</h3>
          <p>Manage museum galleries and their information.</p>
          <Link to="/admin/galleries">
            <button type="button">Manage Galleries</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Stores</h3>
          <p>Maintain museum store information and records.</p>
          <Link to="/admin/stores">
            <button type="button">Manage Stores</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Exhibitions</h3>
          <p>Maintain exhibitions and their displayed artworks.</p>
          <Link to="/admin/exhibitions">
            <button type="button">Manage Exhibitions</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Employees</h3>
          <p>View and manage museum employee records.</p>
          <Link to="/admin/employees">
            <button type="button">Manage Employees</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Tickets</h3>
          <p>Review and manage museum ticket records.</p>
          <Link to="/admin/tickets">
            <button type="button">Manage Tickets</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Reports</h3>
          <p>Review museum statistics and activity reports.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
