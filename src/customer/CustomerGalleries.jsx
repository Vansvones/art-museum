import { useEffect, useRef, useState } from 'react'

export default function CustomerGalleries() {
  const [galleries, setGalleries] = useState([])
  const [error, setError] = useState('')
  const [selectedGallery, setSelectedGallery] = useState(null)
  const [exhibitions, setExhibitions] = useState([])
  const [exhibitionsError, setExhibitionsError] = useState('')
  const [loadingExhibitions, setLoadingExhibitions] = useState(false)
  const exhibitionsSectionRef = useRef(null)

  useEffect(() => {
    fetch('http://localhost:5000/api/galleries')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load galleries.')
        return response.json()
      })
      .then(data => setGalleries(data))
      .catch(err => setError(err.message))
  }, [])

  function handleGalleryClick(gallery) {
    setSelectedGallery(gallery)
    setTimeout(() => {
      exhibitionsSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
    setExhibitions([])
    setExhibitionsError('')
    setLoadingExhibitions(true)

    fetch(`http://localhost:5000/api/exhibitions`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load exhibitions.')
        return response.json()
      })
      .then(data => {
        setExhibitions(
          data.filter(exhibition => exhibition.GalleryID === gallery.GalleryID)
        )
      })
      .catch(err => setExhibitionsError(err.message))
      .finally(() => setLoadingExhibitions(false))
  }

  return (
    <section className="galleries-page">
      <h2>Galleries</h2>
      {error && <p role="alert">{error}</p>}

      <div className="visitor-options">
        {galleries.map(gallery => (
          <article
            className="visitor-option"
            key={gallery.GalleryID}
            onClick={() => handleGalleryClick(gallery)}
            style={{ cursor: 'pointer' }}
          >
            <h3>{gallery.Name}</h3>

            <p>{gallery.Description}</p>
            <p className="gallery-location">
              <strong>Location:</strong> {gallery.Location}
            </p>
            <p>Click to explore this gallery's exhibitions</p>
          </article>
        ))}
      </div>

      {selectedGallery && (
        <section className="gallery-exhibitions" ref={exhibitionsSectionRef}>
          <h2>Exhibitions in {selectedGallery.Name}</h2>

          {loadingExhibitions && <p>Loading exhibitions...</p>}

          {exhibitionsError && (
            <p role="alert">{exhibitionsError}</p>
          )}

          {!loadingExhibitions &&
            !exhibitionsError &&
            exhibitions.length === 0 && (
              <p>No exhibitions found in this gallery.</p>
            )}

          <div className="visitor-options">
            {exhibitions.map(exhibition => (
              <article
                className="visitor-option"
                key={exhibition.ExhibitionID}
              >
                <h3>{exhibition.Name}</h3>

                <p>{exhibition.Description}</p>

                <p className="exhibition-dates">
                  <span>
                    {new Date(exhibition.StartDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'UTC'
                    })}
                  </span>
                  {' - '}
                  <span>
                    {new Date(exhibition.EndDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'UTC'
                    })}
                  </span>
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {!error && galleries.length === 0 && <p>No galleries found.</p>}
    </section>
  )
}
