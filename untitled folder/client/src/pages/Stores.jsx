
import { useEffect, useState } from 'react'

function Stores() {
  const [stores, setStores] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const emptyForm = {
    StoreID: '',
    Name: '',
    Type: '',
    Location: ''
  }

  const [form, setForm] = useState(emptyForm)

  async function loadStores() {
    try {
      const response = await fetch('http://localhost:3000/api/stores')

      if (!response.ok) {
        throw new Error('Failed to load stores')
      }

      const data = await response.json()
      setStores(data)
      setError('')
    } catch (error) {
      setError(error.message)
    }
  }

  useEffect(() => {
    loadStores()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })
  }

  function resetForm() {
    setForm({ ...emptyForm })
    setEditingId(null)
  }

  async function saveStore(event) {
    event.preventDefault()
    setError('')

    const store = {
      StoreID: Number(form.StoreID),
      Name: form.Name.trim(),
      Type: form.Type.trim(),
      Location: form.Location.trim() || null
    }

    if (!store.StoreID || !store.Name || !store.Type) {
      setError('Store ID, name, and type are required.')
      return
    }

    try {
      const response = await fetch(
        editingId !== null
          ? `http://localhost:3000/api/stores/${editingId}`
          : 'http://localhost:3000/api/stores',
        {
          method: editingId !== null ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(store)
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save store')
      }

      resetForm()
      await loadStores()
    } catch (error) {
      setError(error.message)
    }
  }

  function startEditing(store) {
    setEditingId(store.StoreID)
    setForm({
      StoreID: String(store.StoreID),
      Name: store.Name || '',
      Type: store.Type || '',
      Location: store.Location || ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteStore(id) {
    if (!window.confirm('Are you sure you want to delete this store?')) {
      return
    }

    setError('')

    try {
      const response = await fetch(
        `http://localhost:3000/api/stores/${id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete store')
      }

      if (editingId === id) {
        resetForm()
      }

      await loadStores()
    } catch (error) {
      setError(error.message)
    }
  }

  const filteredStores = stores.filter((store) =>
    `${store.StoreID} ${store.Name} ${store.Type} ${store.Location || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div className="galleries-page">
      <h2>Manage Stores</h2>

      {error && <p className="error-message">{error}</p>}

      <form className="gallery-form" onSubmit={saveStore}>
        <h3>{editingId !== null ? 'Edit Store' : 'Add Store'}</h3>

        <div className="gallery-form-grid">
          <div className="gallery-field">
            <label htmlFor="StoreID">Store ID</label>
            <input
              id="StoreID"
              name="StoreID"
              type="number"
              min="1"
              value={form.StoreID}
              onChange={handleChange}
              disabled={editingId !== null}
              required
            />
          </div>

          <div className="gallery-field">
            <label htmlFor="Name">Store Name</label>
            <input
              id="Name"
              name="Name"
              value={form.Name}
              onChange={handleChange}
              maxLength="50"
              required
            />
          </div>

          <div className="gallery-field">
            <label htmlFor="Type">Store Type</label>
            <input
              id="Type"
              name="Type"
              value={form.Type}
              onChange={handleChange}
              maxLength="30"
              placeholder="e.g. Gift Shop"
              required
            />
          </div>

          <div className="gallery-field">
            <label htmlFor="Location">Location</label>
            <input
              id="Location"
              name="Location"
              value={form.Location}
              onChange={handleChange}
              maxLength="100"
              placeholder="Optional"
            />
          </div>
        </div>

        <button type="submit">
          {editingId !== null ? 'Save Changes' : 'Add Store'}
        </button>

        {editingId !== null && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <div className="gallery-section">
        <h3>Stores</h3>

        <input
          className="gallery-search"
          type="text"
          placeholder="Search stores..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="gallery-list">
          {filteredStores.length === 0 ? (
            <p>No stores found.</p>
          ) : (
            filteredStores.map((store) => (
              <div className="gallery-card" key={store.StoreID}>
                <h4>{store.Name}</h4>

                <p>
                  <strong>ID:</strong> {store.StoreID}
                </p>

                <p>
                  <strong>Type:</strong> {store.Type}
                </p>

                <p>
                  <strong>Location:</strong>{' '}
                  {store.Location || 'Not specified'}
                </p>

                <div className="gallery-card-actions">
                  <button
                    type="button"
                    onClick={() => startEditing(store)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteStore(store.StoreID)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Stores
