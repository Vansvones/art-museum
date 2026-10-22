import { useEffect, useState } from 'react'

function Exhibitions() {
  const [exhibitions, setExhibitions] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    Name: '',
    Description: '',
    StartDate: '',
    EndDate: '',
    ExhibitionType: '',
    GalleryID: '',
    ManagerID: ''
  })

  // Load exhibitions from the database
  async function loadExhibitions() {
    try {
      const response = await fetch('http://localhost:3000/api/exhibitions')

      if (!response.ok) {
        throw new Error('Failed to load exhibitions')
      }

      const data = await response.json()
      setExhibitions(data)
      setError('')
    } catch (error) {
      setError(error.message)
    }
  }

  useEffect(() => {
    loadExhibitions()
  }, [])

  // Update form fields
  function handleChange(event) {
    const { name, value } = event.target

    setForm({
      ...form,
      [name]: value
    })
  }

  // Clear the form
  function resetForm() {
    setForm({
      Name: '',
      Description: '',
      StartDate: '',
      EndDate: '',
      ExhibitionType: '',
      GalleryID: '',
      ManagerID: ''
    })

    setEditingId(null)
  }

  // Add or update an exhibition
  async function saveExhibition(event) {
    event.preventDefault()
    setError('')

    const exhibition = {
    ...form,
    GalleryID: form.GalleryID === '' ? null : Number(form.GalleryID),
    ManagerID: form.ManagerID === '' ? null : Number(form.ManagerID),
    StartDate: form.StartDate || null,
    EndDate: form.EndDate || null
    }

    try {
      let response

      if (editingId !== null) {
        response = await fetch(
          `http://localhost:3000/api/exhibitions/${editingId}`,
          {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exhibition)
          }
        )
      } else {
        const nextId = exhibitions.length > 0
          ? Math.max(...exhibitions.map(item => Number(item.ExhibitionID))) + 1
          : 1

        response = await fetch('http://localhost:3000/api/exhibitions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...exhibition,
            ExhibitionID: nextId
          })
        })
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save exhibition')
      }

      resetForm()
      await loadExhibitions()
    } catch (error) {
      setError(error.message)
    }
  }

  // Load an exhibition into the form for editing
  function startEditing(exhibition) {
    setEditingId(exhibition.ExhibitionID)

    setForm({
      Name: exhibition.Name || '',
      Description: exhibition.Description || '',
      StartDate: exhibition.StartDate
        ? String(exhibition.StartDate).slice(0, 10)
        : '',
      EndDate: exhibition.EndDate
        ? String(exhibition.EndDate).slice(0, 10)
        : '',
      ExhibitionType: exhibition.ExhibitionType || '',
      GalleryID: exhibition.GalleryID ?? '',
      ManagerID: exhibition.ManagerID ?? ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Delete an exhibition
  async function deleteExhibition(id) {
    if (!window.confirm('Are you sure you want to delete this exhibition?')) {
      return
    }

    setError('')

    try {
      const response = await fetch(
        `http://localhost:3000/api/exhibitions/${id}`,
        { method: 'DELETE', credentials: 'include' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete exhibition')
      }

      if (editingId === id) {
        resetForm()
      }

      await loadExhibitions()
    } catch (error) {
      setError(error.message)
    }
  }

  // Search exhibitions
  const filteredExhibitions = exhibitions.filter(exhibition =>
    `${exhibition.Name} ${exhibition.Description || ''} ${exhibition.ExhibitionType}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div className="exhibitions-page">
        <div className="exhibitions-header">
        <h2>Exhibitions</h2>
        <p>Browse and manage the museum's exhibitions.</p>
    </div>
        {error && <p className="error-message">{error}</p>}

        <form className="exhibition-form" onSubmit={saveExhibition}>
        <h3>{editingId !== null ? 'Edit Exhibition' : 'Add Exhibition'}</h3>
        <div className="exhibition-form-grid">

        <div className="exhibition-field">
            <label>Exhibition Name</label>
            <input
            name="Name"
            value={form.Name}
            onChange={handleChange}
            required
            />
        </div>

        <div className="exhibition-field exhibition-field-wide">
        <label>Description</label>
        <textarea
            name="Description"
            value={form.Description}
            onChange={handleChange}
        />
        </div>

        <div className="exhibition-field">
        <label>Start Date</label>
        <input
            type="date"
            name="StartDate"
            value={form.StartDate}
            onChange={handleChange}
        />
        </div>

        <div className="exhibition-field">
        <label>End Date</label>
        <input
            type="date"
            name="EndDate"
            value={form.EndDate}
            onChange={handleChange}
        />
        </div>

        <div className="exhibition-field">
        <label>Exhibition Type</label>
        <input
            name="ExhibitionType"
            value={form.ExhibitionType}
            onChange={handleChange}
            required
        />
        </div>

        <div className="exhibition-field">
        <label>Gallery ID</label>
        <input
            type="number"
            name="GalleryID"
            value={form.GalleryID}
            onChange={handleChange}
            min="1"
        />
        </div>

        <div className="exhibition-field">
        <label>Manager Employee ID</label>
        <input
            type="number"
            name="ManagerID"
            value={form.ManagerID}
            onChange={handleChange}
            min="1"
        />
        </div>
        </div>

        <div className="exhibition-form-actions">
            <button type="submit">
            {editingId !== null ? 'Save Changes' : 'Add Exhibition'}
            </button>

            {editingId !== null && (
            <button type="button" onClick={resetForm}>
                Cancel
            </button>
          )}
        </div>
        </form>

      <div className="exhibition-list">
        <h3>Exhibitions</h3>

        <input
          type="text"
          placeholder="Search exhibitions..."
          value={search}
          onChange={event => setSearch(event.target.value)}
        />

        {filteredExhibitions.length === 0 ? (
          <p>No exhibitions found.</p>
        ) : (
          filteredExhibitions.map(exhibition => (
            <div className="exhibition-card" key={exhibition.ExhibitionID}>
              <h4>{exhibition.Name}</h4>

              <p><strong>ID:</strong> {exhibition.ExhibitionID}</p>
              <p><strong>Description:</strong> {exhibition.Description || 'None'}</p>
              <p><strong>Type:</strong> {exhibition.ExhibitionType}</p>
              <p><strong>Start Date:</strong> {exhibition.StartDate ? String(exhibition.StartDate).slice(0, 10) : 'Not set'}</p>
              <p><strong>End Date:</strong> {exhibition.EndDate ? String(exhibition.EndDate).slice(0, 10) : 'Not set'}</p>
              <p><strong>Gallery ID:</strong> {exhibition.GalleryID ?? 'Not assigned'}</p>
              <p><strong>Manager ID:</strong> {exhibition.ManagerID ?? 'Not assigned'}</p>

            <div className="exhibition-card-actions">
                <button onClick={() => startEditing(exhibition)}>
                    Edit
                </button>

                <button onClick={() => deleteExhibition(exhibition.ExhibitionID)}>
                    Delete
                </button>
            </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Exhibitions