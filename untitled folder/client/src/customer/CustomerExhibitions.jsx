import { useEffect, useState } from 'react'

export default function CustomerExhibitions() {
  const [exhibitions, setExhibitions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/api/exhibitions')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load exhibitions.')
        return response.json()
      })
      .then(data => setExhibitions(data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <section className="customer-home">
      <h2>Exhibitions</h2>
      {error && <p role="alert">{error}</p>}

      <div className="visitor-options">
        {exhibitions.map(exhibition => (
          <article className="visitor-option" key={exhibition.ExhibitionID}>
            <h3>{exhibition.Name}</h3>
          </article>
        ))}
      </div>

      {!error && exhibitions.length === 0 && <p>No exhibitions found.</p>}
    </section>
  )
}