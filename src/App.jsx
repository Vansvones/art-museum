import {BrowserRouter, Routes, Route, Link, NavLink, useNavigate} from 'react-router-dom'
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
import CustomerStoreCheckout from './customer/CustomerStoreCheckout'
import CustomerStorePurchases from './customer/CustomerStorePurchases'
import CustomerMemberships from './customer/CustomerMemberships'
import CustomerParking from './customer/CustomerParking'
import CustomerParkingCheckout from './customer/CustomerParkingCheckout'
import CustomerParkingPasses from './customer/CustomerParkingPasses'
import CustomerTickets from './customer/CustomerTickets'
import CustomerCheckout from './customer/CustomerCheckout'
import CustomerArtistArtworks from './customer/CustomerArtistArtworks'
import CustomerAccount from './customer/CustomerAccount'
import MyTickets from './customer/MyTickets'
import Tickets from './pages/Tickets'
import ParkingPasses from './pages/ParkingPasses'
import Memberships from './pages/Memberships'
import AdminDashboard from './admin/AdminDashboard'
import ClerkDashboard from './clerk/ClerkDashboard'
import CuratorDashboard from './curator/CuratorDashboard'
import Login from './auth/Login'
import Register from './auth/Register'
import ChangePassword from './auth/ChangePassword'
import RequireAdmin from './auth/RequireAdmin';
import RequireClerk from './auth/RequireClerk';
import RequireCurator from './auth/RequireCurator'
import Stores from './pages/Stores'
import AdminStoreOrders from './pages/AdminStoreOrders'
import DataReport from './pages/DataReport'
import Visitors from './pages/Visitors'
import './App.css'

function VisitorNav({ user, onLogout }) {
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      onLogout()
    }
  }

  return (
    <nav className="visitor-nav">
      <NavLink to="/">Main Home</NavLink>
      <NavLink to="/customer" end>Home</NavLink>
      <NavLink to="/customer/artworks">Artworks</NavLink>
      <NavLink to="/customer/artists">Artists</NavLink>
      <NavLink to="/customer/galleries">Galleries</NavLink>
      <NavLink to="/customer/exhibitions">Exhibitions</NavLink>
      <NavLink to="/customer/my-tickets">My Tickets</NavLink>
      <NavLink to="/customer/tickets">Buy Tickets</NavLink>
      <NavLink to="/customer/stores">Museum Stores</NavLink>
      <NavLink to="/customer/memberships">Memberships</NavLink>
      <NavLink to="/customer/parking">Parking</NavLink>
      <NavLink to="/customer/account">My Account</NavLink>

      {user && (
        <button type="button" onClick={handleLogout}>
          Log Out
        </button>
      )}
    </nav>
  )
}

function Home({user, authChecked, onLogout}) {
  return (
    <div className="home-page">
      <VisitorNav user={user} onLogout={onLogout} />
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


function VisitorLayout( {onLogout, user, authChecked} ) {
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      onLogout()
    }
  }
  return (
    <>
      <nav className="visitor-nav">
      <NavLink to="/">Main Home</NavLink>
      <NavLink to="/customer" end>Home</NavLink>
      <NavLink to="/customer/artworks">Artworks</NavLink>
      <NavLink to="/customer/artists">Artists</NavLink>
      <NavLink to="/customer/galleries">Galleries</NavLink>
      <NavLink to="/customer/exhibitions">Exhibitions</NavLink>
      <NavLink to="/customer/my-tickets">My Tickets</NavLink>
      <NavLink to="/customer/tickets">Buy Tickets</NavLink>
      <NavLink to="/customer/stores">Museum Stores</NavLink>
      <NavLink to="/customer/memberships">Memberships</NavLink>
      <NavLink to="/customer/parking">Parking</NavLink>
      <NavLink to="/customer/account">My Account</NavLink>

      {user && (
        <button type="button" onClick={handleLogout}>
          Log Out
        </button>
      )}
    </nav>

      <Routes>
        <Route path="/" element={<CustomerHome />} />
        <Route path="/artworks" element={<CustomerArtworks />} />
        <Route path="/artists" element={<CustomerArtists />} />
        <Route path="/artists/:artistId" element={<CustomerArtistArtworks />} />
        <Route path="/galleries" element={<CustomerGalleries />} />
        <Route path="/exhibitions" element={<CustomerExhibitions />} />
        <Route path="/tickets" element={<CustomerTickets user={user} authChecked={authChecked} />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/checkout" element={<CustomerCheckout />} />
        <Route path="/stores" element={<CustomerStores />} />
        <Route path="store-checkout" element={<CustomerStoreCheckout />} />
        <Route path="/store-purchases" element={<CustomerStorePurchases />} />
        <Route path="/memberships" element={<CustomerMemberships />} />
        <Route path="/parking" element={<CustomerParking />} />
        <Route path="/my-parking-passes" element={<CustomerParkingPasses />} />
        <Route path="/parking-checkout" element={<CustomerParkingCheckout />} />
        <Route path="/account" element={<CustomerAccount onLogout={onLogout} />} />
      </Routes>
    </>
  )
}


function AdminLayout({user, onLogout}) {
  const navigate = useNavigate()
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      onLogout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <nav className="admin-nav">
      <NavLink to="/admin" end>Dashboard</NavLink>
      <NavLink to="/admin/artworks">Manage Artworks</NavLink>
      <NavLink to="/admin/artists">Manage Artists</NavLink>
      <NavLink to="/admin/galleries">Manage Galleries</NavLink>
      <NavLink to="/admin/exhibitions">Manage Exhibitions</NavLink>
      <NavLink to="/admin/stores">Manage Stores</NavLink>
      <NavLink to="/admin/store-orders">Manage Store Orders</NavLink>
      <NavLink to="/admin/employees">Manage Employees</NavLink>
      <NavLink to="/admin/visitors">Manage Visitors</NavLink>
      <NavLink to="/admin/tickets">Manage Tickets</NavLink>
      <NavLink to="/admin/memberships">Manage Memberships</NavLink>
      <NavLink to="/admin/parking-passes">Manage Parking Passes</NavLink>

      {user && (
        <button type="button" onClick={handleLogout}>
          Log Out
        </button>
      )}
    </nav>

      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/artworks" element={<Artworks />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/galleries" element={<Galleries />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/store-orders" element={<AdminStoreOrders />} />
        <Route path="/exhibitions" element={<Exhibitions />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/data-report" element={<DataReport />} />
        <Route path="/memberships" element={<Memberships />} />
        <Route path="/parking-passes" element={<ParkingPasses />} />
      </Routes>
    </>
  )
}

function ClerkLayout({ user, onLogout }) {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      onLogout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <nav className="admin-nav">
        <NavLink to="/clerk" end>Dashboard</NavLink>
        <NavLink to="/clerk/tickets">Manage Tickets</NavLink>
        <NavLink to="/clerk/stores">Manage Stores</NavLink>

        {user && (
          <button type="button" onClick={handleLogout}>
            Log Out
          </button>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<ClerkDashboard />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/items" element={<Stores />} />
      </Routes>
    </>
  )
}

function CuratorLayout({ user, onLogout }) {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      onLogout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <nav className="admin-nav">
        <NavLink to="/curator" end>Dashboard</NavLink>
        <NavLink to="/curator/artworks">Manage Artworks</NavLink>
        <NavLink to="/curator/artists">Manage Artists</NavLink>
        <NavLink to="/curator/galleries">View Galleries</NavLink>
        <NavLink to="/curator/exhibitions">Manage Exhibitions</NavLink>

        {user && (
          <button type="button" onClick={handleLogout}>
            Log Out
          </button>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<CuratorDashboard />} />
        <Route path="/artworks" element={<Artworks />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/galleries" element={<Galleries user={user} />} />
        <Route path="/exhibitions" element={<Exhibitions />} />
      </Routes>
    </>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', {
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
            element={
              <Home
                user={user}
                authChecked={authChecked}
                onLogout={() => {
                  setUser(null)
                  window.location.href = '/'
                }}
              />
            }
          />
          <Route
            path="/login"
            element={<Login onLogin={(loggedInUser) => setUser(loggedInUser)} />}
          />
          <Route
            path="/customer/*"
            element={
              <VisitorLayout
                user={user}
                authChecked={authChecked}
                onLogout={() => {
                  setUser(null)
                  window.location.href = '/'
                }}
              />
            }
          />
          <Route path="/register" element={<Register />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route
            path="/admin/*"
            element={
              <RequireAdmin>
                <AdminLayout user={user}
                onLogout={() => setUser(null)} 
                />
              </RequireAdmin>
            }
          />
          <Route
            path="/clerk/*"
            element={
              <RequireClerk>
                <ClerkLayout
                  user={user}
                  onLogout={() => setUser(null)}
                />
              </RequireClerk>
            }
          />
          <Route
            path="/curator/*"
            element={
              <RequireCurator>
                <CuratorLayout
                  user={user}
                  onLogout={() => setUser(null)}
                />
              </RequireCurator>
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
