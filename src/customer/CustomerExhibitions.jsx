import { useEffect, useRef, useState } from 'react'

export default function CustomerExhibitions() {
  const [exhibitions, setExhibitions] = useState([])
  const [error, setError] = useState('')
  const [selectedExhibition, setSelectedExhibition] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [artworksError, setArtworksError] = useState('')
  const artworksSectionRef = useRef(null)

  useEffect(() => {
    fetch('http://localhost:5000/api/exhibitions')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load exhibitions.')
        return response.json()
      })
      .then(data => setExhibitions(data))
      .catch(err => setError(err.message))
  }, [])

    async function handleExhibitionClick(exhibition) {
      setSelectedExhibition(exhibition)
      setArtworks([])
      setArtworksError('')

      try {
        const response = await fetch(
          `http://localhost:5000/api/exhibitions/${exhibition.ExhibitionID}/artworks`
        )

        if (!response.ok) {
          throw new Error('Failed to load exhibition artworks.')
        }

        setArtworks(await response.json())
        setTimeout(() => {
          artworksSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }, 100)
      } catch (err) {
        setArtworksError(err.message)
      }
    }

  return (
    <section className="exhibitions-page">
      <div className="exhibitions-header">
      <h2>Exhibitions</h2>
      <p>Browse the museum's exhibitions.</p>
      </div>
      {error && <p role="alert">{error}</p>}

      <div className="exhibition-list">
        {exhibitions.map(exhibition => (
          <article
            className="exhibition-card"
            key={exhibition.ExhibitionID}
            onClick={() => handleExhibitionClick(exhibition)}
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleExhibitionClick(exhibition)
              }
            }}
          >
            <h5 className="visitor-exhibition-title">
              {exhibition.Name}
            </h5>

            <p>{exhibition.Description}</p>

            <p>
              <strong>Type:</strong> {exhibition.ExhibitionType}
            </p>

            <p>
              <strong>Dates:</strong>{' '}
              {new Date(exhibition.StartDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC'
              })}
              {' – '}
              {new Date(exhibition.EndDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC'
              })}
            </p>

            <p>
              {new Date(exhibition.StartDate) <= new Date() &&
              new Date(exhibition.EndDate) >= new Date()
                ? 'Currently active'
                : new Date(exhibition.StartDate) > new Date()
                  ? 'Upcoming'
                  : 'Ended'}
            </p>

            <p>Click to view artworks</p>
          </article>
        ))}
      </div>

      {selectedExhibition && (
        <div className="exhibition-artworks-panel" ref={artworksSectionRef}>
          <h2>Artworks in {selectedExhibition.Name}</h2>

          {artworksError && <p role="alert">{artworksError}</p>}

          {!artworksError && artworks.length === 0 && (
            <p>No artworks found in this exhibition.</p>
          )}

          <div className="exhibition-artwork-list">
            {artworks.map(artwork => (
              <article className="exhibition-artwork-card" key={artwork.ArtworkID}>
                <img
                  src={`/MuseumImages/${artwork.ArtworkID}.jpeg`}
                  alt={artwork.Name}
                  className="artwork-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />

                <h3>{artwork.Name}</h3>
                <p><strong>Artist:</strong> {artwork.ArtistNames || 'Artist not listed'}</p>
                {artwork.Description && (
                  <p><strong>Description:</strong> {artwork.Description}</p>
                )}

                {artwork.Type && (
                  <p><strong>Type:</strong> {artwork.Type}</p>
                )}

                {artwork.Origin && (
                  <p><strong>Origin:</strong> {artwork.Origin}</p>
                )}

                {artwork.CreationDate && (
                  <p>
                    <strong>Creation Year:</strong>{' '}
                    {String(artwork.CreationDate).slice(0, 4)}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {!error && exhibitions.length === 0 && <p>No exhibitions found.</p>}
    </section>
  )
}