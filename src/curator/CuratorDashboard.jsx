import { Link } from 'react-router-dom'

function CuratorDashboard() {
  return (
    <div className="admin-page">
      <h1>Museum Curation</h1>
      <p>Manage artworks, artists, and exhibitions.</p>

      <div className="admin-options">
        <div className="admin-card">
          <h3>Manage Artworks</h3>
          <p>Add, edit, delete, and search artworks.</p>
          <Link to="/curator/artworks">
            <button type="button">Manage Artworks</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Artists</h3>
          <p>Maintain information about museum artists.</p>
          <Link to="/curator/artists">
            <button type="button">Manage Artists</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>View Galleries</h3>
          <p>View museum galleries and their information.</p>
          <Link to="/curator/galleries">
            <button type="button">View Galleries</button>
          </Link>
        </div>

        <div className="admin-card">
          <h3>Manage Exhibitions</h3>
          <p>Maintain exhibitions and their displayed artworks.</p>
          <Link to="/curator/exhibitions">
            <button type="button">Manage Exhibitions</button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CuratorDashboard
