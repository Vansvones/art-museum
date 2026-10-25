import { useEffect, useState } from 'react'

export default function CustomerArtists() {
  const [artists, setArtists] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/api/artists')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load artists.')
        return response.json()
      })
      .then(data => setArtists(data))
      .catch(err => setError(err.message))
  }, [])

  return (
  <section className="customer-home">
    <h2>Explore Artists</h2>
    <p>Discover the artists behind our collection.</p>

    {error && <p role="alert">{error}</p>}

    <div className="visitor-options">
      {artists.map(artist => (
        <article className="visitor-option" key={artist.ArtistID}>
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

    {!error && artists.length === 0 && <p>No artists found.</p>}
  </section>
)
}