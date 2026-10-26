
import { useEffect, useState } from 'react'

function CustomerArtworks() {
  const [artworks, setArtworks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/api/artworks')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load artworks.')
        }

        return response.json()
      })
      .then((data) => {
        setArtworks(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        console.error('Error loading artworks:', error)
        setError('Could not load artworks. Please try again later.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredArtworks = artworks.filter((artwork) =>
    String(artwork.Name ?? '')
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    String(artwork.Description ?? '')
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div className="galleries-page">
      <h2>Explore Artworks</h2>
      <p>Browse the museum collection.</p>

      <input
        type="text"
        placeholder="Search by artwork or description..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p>Loading artworks...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && (
        <div className="artwork-list">
          {filteredArtworks.map((artwork) => (
            <div className="artwork-card" key={artwork.ArtworkID}>
              <h3>{artwork.Name}</h3>
              <p><strong>Artist:</strong> {artwork.ArtistNames || 'Unknown'}</p>
              <p><strong>Description:</strong> {artwork.Description || '—'}</p>
              <p><strong>Type:</strong> {artwork.Type || '—'}</p>
              <p><strong>Origin:</strong> {artwork.Origin || '—'}</p>
              <p><strong>Year:</strong> {artwork.CreationYear ?? '—'}</p>
            </div>
          ))}

          {filteredArtworks.length === 0 && (
            <p>No artworks found.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomerArtworks
