import {BrowserRouter, Routes, Route, Link, useNavigate} from 'react-router-dom'
import { useEffect, useState } from 'react'
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
import CustomerCheckout from './customer/CustomerCheckout'
import CustomerArtistArtworks from './customer/CustomerArtistArtworks'
import CustomerAccount from './customer/CustomerAccount'
import MyTickets from './customer/MyTickets'
import Tickets from './pages/Tickets'
import Memberships from './pages/Memberships'
import AdminDashboard from './admin/AdminDashboard'
import Login from './auth/Login'
import Register from './auth/Register'
import ChangePassword from './auth/ChangePassword'
import RequireAdmin from './auth/RequireAdmin';
import Stores from './pages/Stores'
import Visitors from './pages/Visitors'
import './App.css'


function Home({user, authChecked}) {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-content">
          <p className="home-eyebrow">MUSEUM OF FINE ARTS</p>

          <h2>Discover the beauty of art.</h2>

          <p className="home-description">
            Explore remarkable artworks, learn about the artists behind
            them, and discover exhibitions that bring creativity to life.
          </p>

          <div className="home-buttons">
            <Link to="/customer/artworks" className="home-button primary">
              Explore Artworks
            </Link>

            <Link to="/customer/exhibitions" className="home-button secondary">
              View Exhibitions
            </Link>
          </div>
        </div>
      </section>

      <section className="home-discover">
        <div className="home-section-heading">
          <p className="home-eyebrow">EXPLORE OUR COLLECTION</p>
          <h2>There is something for everyone.</h2>
          <p>
            Discover the stories, people, and experiences behind our collection.
          </p>
        </div>

        <div className="home-feature-grid">
          <Link to="/customer/artworks" className="home-feature-card">
            <span className="home-feature-number">01</span>
            <h3>Artworks</h3>
            <p>
              Explore works of art, their histories, and the details that
              make each piece unique.
            </p>
            <span className="home-feature-link">Explore collection →</span>
          </Link>

          <Link to="/customer/artists" className="home-feature-card">
            <span className="home-feature-number">02</span>
            <h3>Artists</h3>
            <p>
              Discover the artists, their backgrounds, and the people
              behind the collection.
            </p>
            <span className="home-feature-link">Meet the artists →</span>
          </Link>

          <Link to="/customer/exhibitions" className="home-feature-card">
            <span className="home-feature-number">03</span>
            <h3>Exhibitions</h3>
            <p>
              Browse exhibitions and discover artworks brought together
              for visitors to experience.
            </p>
            <span className="home-feature-link">View exhibitions →</span>
          </Link>
        </div>
      </section>

      <section className="home-visit">
        <div>
          <p className="home-eyebrow">PLAN YOUR VISIT</p>
          <h2>Your next discovery awaits.</h2>
          <p>
            Explore visitor services, learn about memberships, and
            plan your museum experience.
          </p>
        </div>

        <Link to="/customer" className="home-button primary">
          Visit the Museum
        </Link>
      </section>

      {authChecked && !user && (
        <section className="home-account">
          <p>Make the most of your museum experience.</p>
          <div>
            <Link to="/login">Log in</Link>
            <span>or</span>
            <Link to="/register">Create an account</Link>
          </div>
        </section>
      )}
    </div>
  )
}


function VisitorLayout( {onLogout} ) {
  return (
    <>
      <nav className="visitor-nav">
        <Link to="/customer">Visitor Home</Link>
        <Link to="/customer/artworks">Artworks</Link>
        <Link to="/customer/artists">Artists</Link>
        <Link to="/customer/galleries">Galleries</Link>
        <Link to="/customer/exhibitions">Exhibitions</Link>
        <Link to="/customer/my-tickets">My Tickets</Link>
        <Link to="/customer/tickets">Buy Tickets</Link>
        <Link to="/customer/stores">Museum Stores</Link>
        <Link to="/customer/memberships">Memberships</Link>
        <Link to="/customer/parking">Parking</Link>
        <Link to="/">Main Home</Link>
        <Link to="/customer/account">My Account</Link>
      </nav>

      <Routes>
        <Route path="/" element={<CustomerHome />} />
        <Route path="/artworks" element={<CustomerArtworks />} />
        <Route path="/artists" element={<CustomerArtists />} />
        <Route path="/artists/:artistId" element={<CustomerArtistArtworks />} />
        <Route path="/galleries" element={<CustomerGalleries />} />
        <Route path="/exhibitions" element={<CustomerExhibitions />} />
        <Route path="/tickets" element={<CustomerTickets />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/checkout" element={<CustomerCheckout />} />
        <Route path="/stores" element={<CustomerStores />} />
        <Route path="/memberships" element={<CustomerMemberships />} />
        <Route path="/parking" element={<CustomerParking />} />
        <Route
          path="/account"
          element={<CustomerAccount onLogout={onLogout} />}
        />
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
        <Link to="/admin/visitors">Manage Visitors</Link>
        <Link to="/admin/tickets">Manage Tickets</Link>
        <Link to="/admin/memberships">Manage Memberships</Link>
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
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/memberships" element={<Memberships />} />
      </Routes>
    </>
  )
}


function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    fetch('http://localhost:3000/api/auth/me', {
      credentials: 'include'
    })
      .then(response => {
        if (!response.ok) {
          setUser(null)
          return null
        }

        return response.json()
      })
      .then(data => {
        if (data) {
          setUser(data.user || data)
        }
      })
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true))
  }, [])

  return (
    <BrowserRouter>
      <header>
        <h1>Museum of Fine Arts</h1>
        <nav className="main-nav">
          <Link to="/customer">Home</Link>

          {authChecked && !user && (
            <>
              <Link to="/login">Log In</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={<Home user={user} authChecked={authChecked} />}
          />
          <Route
            path="/login"
            element={<Login onLogin={(loggedInUser) => setUser(loggedInUser)} />}
          />
          <Route
            path="/customer/*"
            element={<VisitorLayout onLogout={() => setUser(null)} />}
          />
          <Route path="/register" element={<Register />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/admin/*" element={<RequireAdmin><AdminLayout />
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
