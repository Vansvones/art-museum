import { useEffect, useState } from 'react'

export default function CustomerGalleries() {
  const [galleries, setGalleries] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/api/galleries')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load galleries.')
        return response.json()
      })
      .then(data => setGalleries(data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <section className="customer-home">
      <h2>Galleries</h2>
      {error && <p role="alert">{error}</p>}

      <div className="visitor-options">
        {galleries.map(gallery => (
          <article className="visitor-option" key={gallery.GalleryID}>
            <h3>{gallery.Name}</h3>
          </article>
        ))}
      </div>

      {!error && galleries.length === 0 && <p>No galleries found.</p>}
    </section>
  )
}
