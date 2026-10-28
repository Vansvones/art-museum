import { useEffect, useRef, useState } from 'react'

function Artworks() {
  const [artworks, setArtworks] = useState([])
  const [artists, setArtists] = useState([])
  const [selectedArtists, setSelectedArtists] = useState([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('Painting')
  const [origin, setOrigin] = useState('')
  const [creationYear, setCreationYear] = useState('')
  const formRef = useRef(null)

  async function loadArtworks() {
    try {
      const response = await fetch('http://localhost:5000/api/artworks')
      if (!response.ok) throw new Error()
      setArtworks(await response.json())
      setError('')
    } catch {
      setError('Could not load artworks from the database.')
    } finally {
      setLoading(false)
    }
  }

  async function loadArtists() {
    try {
      const response = await fetch('http://localhost:5000/api/artists')
      if (!response.ok) throw new Error()
      setArtists(await response.json())
    } catch {
      setError('Could not load artists from the database.')
    }
  }

  function addArtist() {
    if (!selectedArtist) return

    const artistID = Number(selectedArtist)

    if (!selectedArtists.includes(artistID)) {
      setSelectedArtists([...selectedArtists, artistID])
    }

    setSelectedArtist('')
  }

  useEffect(() => {
    loadArtworks()
    loadArtists()
  }, [])

  function clearForm() {
    setName('')
    setDescription('')
    setType('Painting')
    setOrigin('')
    setCreationYear('')
    setSelectedArtists([])
    setSelectedArtist('')
    setEditingId(null)
    setShowForm(false)
  }

  async function saveArtwork(e) {
    e.preventDefault()

    const artwork = {
      Name: name.trim(),
      Description: description.trim() || null,
      Type: type,
      Origin: origin.trim() || null,
      CreationYear: creationYear ? Number(creationYear) : null,
      ArtistIDs: selectedArtists
    }

    try {
      let response

      if (editingId === null) {
        const nextId = Math.max(0, ...artworks.map(a => a.ArtworkID)) + 1

        response = await fetch('http://localhost:5000/api/artworks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...artwork, ArtworkID: nextId })
      })
      } else {
        response = await fetch(
        `http://localhost:5000/api/artworks/${editingId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(artwork)
        }
      )}

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to save artwork')
      }

      await loadArtworks()
      clearForm()
    } catch (err) {
      setError(err.message || 'Could not save artwork.')
    }
  }

  function startEditing(artwork) {
    setEditingId(artwork.ArtworkID)
    setName(artwork.Name)
    setDescription(artwork.Description || '')
    setType(artwork.Type || 'Other')
    setOrigin(artwork.Origin || '')
    setCreationYear(artwork.CreationYear ?? '')
    setShowForm(true)
    setSelectedArtists(
      artwork.ArtistIDs
        ? String(artwork.ArtistIDs).split(',').map(Number)
        : []
    )

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
  }

  async function deleteArtwork(id) {
    if (!window.confirm('Are you sure you want to delete this artwork?')) {
      return
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/artworks/${id}`,
        { method: 'DELETE', credentials: 'include' }
      )

      if (!response.ok) throw new Error('Failed to delete artwork')

      await loadArtworks()

      if (editingId === id) clearForm()
    } catch (err) {
      setError(err.message || 'Could not delete artwork.')
    }
  }

  const filteredArtworks = artworks.filter(artwork =>
    (artwork.Name || '').toLowerCase().includes(search.toLowerCase()) ||
    (artwork.Origin || '').toLowerCase().includes(search.toLowerCase()) ||
    (artwork.ArtistNames || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p>Loading artworks...</p>

  return (
    <div className="artworks-page">
      <h2>Manage Artworks</h2>
      <p>Browse and manage the museum collection.</p>

      {error && <p role="alert">{error}</p>}

      <button
        type="button"
        onClick={() => {
          if (showForm) {
            clearForm()
          } else {
            clearForm()
            setShowForm(true)
          }
        }}
      >
        {showForm ? 'Cancel' : 'Add Artwork'}
      </button>

      
      {showForm && (
        <form
          className="exhibition-form artwork-form"
          onSubmit={saveArtwork}
          ref={formRef}
        >
          <h3>{editingId === null ? 'New Artwork' : 'Edit Artwork'}</h3>

          <div className="exhibition-form-grid">
            <div className="exhibition-field">
              <label>Artwork Name</label>
              <input
                placeholder="Artwork name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className="exhibition-field exhibition-field-wide">
              <label>Description</label>
              <textarea
                placeholder="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="exhibition-field">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option>Painting</option>
                <option>Sculpture</option>
                <option>Photograph</option>
                <option>Other</option>
              </select>
            </div>

            <div className="exhibition-field">
              <label>Artist</label>
              <div className="artist-selection">
                <select
                  value={selectedArtist}
                  onChange={e => setSelectedArtist(e.target.value)}
                >
                  <option value="">Select an artist</option>
                  {artists.map(artist => (
                    <option key={artist.ArtistID} value={artist.ArtistID}>
                      {artist.FirstName} {artist.LastName}
                    </option>
                  ))}
                </select>

                <button type="button" onClick={addArtist}>
                  Add Artist
                </button>
              </div>
            </div>

            <div className="exhibition-field exhibition-field-wide">
              <label>Selected Artists</label>
              <div className="selected-artists">
                {selectedArtists.map(id => {
                  const artist = artists.find(
                    a => Number(a.ArtistID) === id
                  )

                  return artist ? (
                    <div key={id}>
                      {artist.FirstName} {artist.LastName}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedArtists(
                            selectedArtists.filter(a => a !== id)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ) : null
                })}
              </div>
            </div>

            <div className="exhibition-field">
              <label>Country of Origin</label>
              <input
                placeholder="Country of origin"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="exhibition-field">
              <label>Creation Year</label>
              <input
                type="number"
                placeholder="e.g. 1889"
                value={creationYear}
                onChange={e => setCreationYear(e.target.value)}
                min="1000"
                max="2155"
              />
            </div>
          </div>

          <div className="exhibition-form-actions">
            <button type="submit">
              {editingId === null ? 'Save Artwork' : 'Save Changes'}
            </button>

            <button type="button" onClick={clearForm}>
              Cancel
            </button>
          </div>
        </form>
      )}


      <input
        placeholder="Search by artwork, artist, or origin..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="artwork-list">
        {filteredArtworks.map(artwork => (
          
          <div className="artwork-card" key={artwork.ArtworkID}>
            <img
              src={`/MuseumImages/${artwork.ArtworkID}.jpeg`}
              alt={artwork.Name}
              className="artwork-image"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <h3>{artwork.Name}</h3>

            <p><strong>Artwork ID:</strong> {artwork.ArtworkID}</p>
            <p><strong>Artist(s):</strong> {artwork.ArtistNames || 'Not assigned'}</p>
            <p><strong>Description:</strong> {artwork.Description || '—'}</p>
            <p><strong>Type:</strong> {artwork.Type || '—'}</p>
            <p><strong>Origin:</strong> {artwork.Origin || '—'}</p>
            <p>
              <strong>Creation Year:</strong> {artwork.CreationYear ?? '—'}
            </p>

          <div className="artwork-actions">
            <button
              type="button"
              onClick={() => startEditing(artwork)}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => deleteArtwork(artwork.ArtworkID)}
            >
              Delete
            </button>
            </div>
          </div>
        ))}

        {filteredArtworks.length === 0 && <p>No artworks found.</p>}
      </div>
    </div>
  )
}

export default Artworks