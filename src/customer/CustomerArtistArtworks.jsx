
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function CustomerArtistArtworks() {
  const { artistId } = useParams()
  const navigate = useNavigate()

  const [artworks, setArtworks] = useState([])
  const [artistName, setArtistName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/artworks'),
      fetch('http://localhost:5000/api/artists')
    ])
      .then(async ([artworksResponse, artistsResponse]) => {
        if (!artworksResponse.ok || !artistsResponse.ok) {
          throw new Error('Failed to load artist artworks.')
        }

        return Promise.all([
          artworksResponse.json(),
          artistsResponse.json()
        ])
      })
      .then(([allArtworks, allArtists]) => {
        const artist = allArtists.find(
          item => String(item.ArtistID) === artistId
        )

        if (artist) {
          setArtistName(
            `${artist.FirstName} ${
              artist.MiddleName ? `${artist.MiddleName} ` : ''
            }${artist.LastName}`
          )
        }

        const artistArtworks = allArtworks.filter(artwork =>
          (artwork.ArtistIDs || '')
            .split(',')
            .includes(artistId)
        )

        setArtworks(artistArtworks)
      })
      .catch(err => setError(err.message))
  }, [artistId])

  return (
    <section className="galleries-page">
      <button type="button" onClick={() => navigate('/customer/artists')}>
        Back to Artists
      </button>

      <h2>{artistName || 'Artist Artworks'}</h2>
      <p>Explore artworks created by this artist.</p>

      {error && <p role="alert">{error}</p>}

      {!error && artworks.length === 0 && (
        <p>No artworks found for this artist.</p>
      )}

      <div className="visitor-options">
        {artworks.map(artwork => (
          <article className="visitor-option" key={artwork.ArtworkID}>
            <img
              src={`/MuseumImages/${artwork.ArtworkID}.jpeg`}
              alt={artwork.Name}
              className="artwork-image"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />

            <h3>{artwork.Name}</h3>

            <p>
              <strong>Type:</strong> {artwork.Type || 'Unknown'}
            </p>

            <p>
              <strong>Year:</strong> {artwork.CreationYear || 'Unknown'}
            </p>

            <p>
              <strong>Origin:</strong> {artwork.Origin || 'Unknown'}
            </p>

            <p>{artwork.Description || 'No description available.'}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
