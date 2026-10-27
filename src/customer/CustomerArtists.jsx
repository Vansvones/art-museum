import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CustomerArtists() {
  const [artists, setArtists] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('http://localhost:3000/api/artists')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load artists.')
        return response.json()
      })
      .then(data => setArtists(data))
      .catch(err => setError(err.message))
  }, [])

  const filteredArtists = artists.filter(artist =>
    `${artist.FirstName || ''} ${artist.MiddleName || ''} ${artist.LastName || ''} ${artist.Nationality || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
  <section className="galleries-page">
    <h2>Explore Artists</h2>
    <p>Discover the artists behind our collection.</p>

    {error && <p role="alert">{error}</p>}

    <input
      className="artist-search"
      type="text"
      placeholder="Search artists by name or nationality..."
      value={search}
      onChange={e => setSearch(e.target.value)}
    />

    <div className="visitor-options">
      {filteredArtists.map(artist => (
        <article
          className="visitor-option artist-option"
          key={artist.ArtistID}
          onClick={() => navigate(`/customer/artists/${artist.ArtistID}`)}
          role="link"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate(`/customer/artists/${artist.ArtistID}`)
            }
          }}
        >
          <h3>
            {artist.FirstName}{' '}
            {artist.MiddleName ? `${artist.MiddleName} ` : ''}
            {artist.LastName}
          </h3>

          <p>
            <strong>Nationality:</strong> {artist.Nationality || 'Unknown'}
          </p>

          <p>
            <strong>Born:</strong>{' '}
            {artist.BirthDate
              ? new Date(artist.BirthDate).getUTCFullYear()
              : 'Unknown'}
          </p>

          <p>
            <strong>Died:</strong>{' '}
            {artist.DeathDate
              ? new Date(artist.DeathDate).getUTCFullYear()
              : 'Living / Unknown'}
          </p>
        </article>
      ))}
    </div>

    {!error && filteredArtists.length === 0 && (
      <p>{search ? 'No artists match your search.' : 'No artists found.'}</p>
    )}
  </section>
)
}