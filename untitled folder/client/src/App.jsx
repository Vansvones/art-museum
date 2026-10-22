import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import Artists from './pages/Artists'
import Artworks from './pages/Artworks'
import Exhibitions from './pages/Exhibitions'
import Galleries from './pages/Galleries'
import Employees from './pages/Employees'
import CustomerHome from './customer/CustomerHome'
import CustomerArtworks from './customer/CustomerArtworks'
import CustomerArtists from './customer/CustomerArtists'
import CustomerGalleries from './customer/CustomerGalleries'
import CustomerExhibitions from './customer/CustomerExhibitions'
import CustomerStores from './customer/CustomerStores'
import CustomerMemberships from './customer/CustomerMemberships'
import CustomerParking from './customer/CustomerParking'
import CustomerTickets from './customer/CustomerTickets'
import Tickets from './pages/Tickets'
import AdminDashboard from './admin/AdminDashboard'
import Login from './auth/Login'
import Register from './auth/Register'
import RequireAdmin from './auth/RequireAdmin';
import Stores from './pages/Stores'
import './App.css'

function Home() {
  return (
    <section className="hero">
      <h1>Welcome to Our Museum</h1>
      <p>Explore art, discover artists, and experience exhibitions.</p>

      <nav className="visitor-nav">
        <Link to="/customer">Visitor Home</Link>
        <Link to="/customer/artworks">Artworks</Link>
        <Link to="/customer/artists">Artists</Link>
        <Link to="/customer/galleries">Galleries</Link>
        <Link to="/customer/exhibitions">Exhibitions</Link>
        <Link to="/customer/tickets">Tickets</Link>
        <Link to="/customer/memberships">Memberships</Link>
        <Link to="/customer/stores">Museum Stores</Link>
        <Link to="/customer/parking">Parking</Link>
      </nav>

      <div className="home-auth-links">
        <Link to="/login">
          <button type="button">Log In</button>
        </Link>

        <Link to="/register">
          <button type="button">Register</button>
        </Link>
      </div>
    </section>
  )
}

function VisitorLayout() {
  return (
    <>
      <nav className="visitor-nav">
        <Link to="/customer">Visitor Home</Link>
        <Link to="/customer/artworks">Artworks</Link>
        <Link to="/customer/artists">Artists</Link>
        <Link to="/customer/galleries">Galleries</Link>
        <Link to="/customer/exhibitions">Exhibitions</Link>
        <Link to="/customer/tickets">Tickets</Link>
        <Link to="/customer/stores">Museum Stores</Link>
        <Link to="/customer/memberships">Memberships</Link>
        <Link to="/customer/parking">Parking</Link>
        <Link to="/">Main Home</Link>
      </nav>

      <Routes>
        <Route path="/" element={<CustomerHome />} />
        <Route path="/artworks" element={<CustomerArtworks />} />
        <Route path="/artists" element={<CustomerArtists />} />
        <Route path="/galleries" element={<CustomerGalleries />} />
        <Route path="/exhibitions" element={<CustomerExhibitions />} />
        <Route path="/tickets" element={<CustomerTickets />} />
        <Route path="/stores" element={<CustomerStores />} />
        <Route path="/memberships" element={<CustomerMemberships />} />
        <Route path="/parking" element={<CustomerParking />} />
      </Routes>
    </>
  )
}


function AdminLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <nav className="admin-nav">
        <Link to="/admin">Dashboard</Link>
        <Link to="/admin/artworks">Manage Artworks</Link>
        <Link to="/admin/artists">Manage Artists</Link>
        <Link to="/admin/galleries">Manage Galleries</Link>
        <Link to="/admin/stores">Manage Stores</Link>
        <Link to="/admin/exhibitions">Manage Exhibitions</Link>
        <Link to="/admin/employees">Manage Employees</Link>
        <Link to="/admin/tickets">Manage Tickets</Link>
        <Link to="/">Main Home</Link>

        <button type="button" onClick={handleLogout}>
          Log Out
        </button>
      </nav>

      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/artworks" element={<Artworks />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/galleries" element={<Galleries />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/exhibitions" element={<Exhibitions />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/tickets" element={<Tickets />} />
      </Routes>
    </>
  )
}


function App() {
  return (
    <BrowserRouter>
      <header>
        <h1>Museum of Fine Arts</h1>
        <nav className="main-nav">
          <Link to="/customer">Home</Link>
          <Link to="/login">Log In</Link>
          <Link to="/register">Register</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/customer/*" element={<VisitorLayout />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/admin/*"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          />
        </Routes>
      </main>

      <footer>
        <p>Museum of Fine Arts</p>
      </footer>
    </BrowserRouter>
  )
}

export default App
