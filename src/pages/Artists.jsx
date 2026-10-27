import { useEffect, useState } from 'react'

function Artists() {
	const [artists, setArtists] = useState([])
	const [search, setSearch] = useState('')
	const [showForm, setShowForm] = useState(false)
	const [editingId, setEditingId] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	const [firstName, setFirstName] = useState('')
	const [middleName, setMiddleName] = useState('')
	const [lastName, setLastName] = useState('')
	const [nationality, setNationality] = useState('')
	const [birthDate, setBirthDate] = useState('')
	const [deathDate, setDeathDate] = useState('')

	async function loadArtists() {
		try {
			const response = await fetch('http://localhost:3000/api/artists')

			if (!response.ok) {
				throw new Error()
			}

			setArtists(await response.json())
			setError('')
		} catch {
			setError('Could not load artists from the database.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadArtists()
	}, [])

	function clearForm() {
		setFirstName('')
		setMiddleName('')
		setLastName('')
		setNationality('')
		setBirthDate('')
		setDeathDate('')
		setEditingId(null)
		setShowForm(false)
	}

	async function saveArtist(e) {
		e.preventDefault()
		setError('')

		const artist = {
			FirstName: firstName.trim(),
			MiddleName: middleName.trim() || null,
			LastName: lastName.trim(),
			Nationality: nationality.trim() || null,
			BirthDate: birthDate || null,
			DeathDate: deathDate || null
		}

		try {
			let response

			if (editingId === null) {
				const nextId =
					Math.max(0, ...artists.map(a => Number(a.ArtistID))) + 1

				response = await fetch('http://localhost:3000/api/artists', {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...artist,
						ArtistID: nextId
					})
				})
			} else {
				response = await fetch(
					`http://localhost:3000/api/artists/${editingId}`,
					{
						method: 'PUT',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(artist)
					}
				)
			}

			if (!response.ok) {
				const result = await response.json()
				throw new Error(result.error || 'Failed to save artist')
			}

			await loadArtists()
			clearForm()
		} catch (err) {
			setError(err.message || 'Could not save artist.')
		}
	}

	function startEditing(artist) {
		setEditingId(artist.ArtistID)
		setFirstName(artist.FirstName || '')
		setMiddleName(artist.MiddleName || '')
		setLastName(artist.LastName || '')
		setNationality(artist.Nationality || '')
		setBirthDate(
			artist.BirthDate ? String(artist.BirthDate).slice(0, 10) : ''
		)
		setDeathDate(
			artist.DeathDate ? String(artist.DeathDate).slice(0, 10) : ''
		)
		setShowForm(true)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	async function deleteArtist(id) {
		if (!window.confirm('Are you sure you want to delete this artist?')) {
			return
		}

		setError('')

		try {
			const response = await fetch(
				`http://localhost:3000/api/artists/${id}`,
				{
					method: 'DELETE',
					credentials: 'include'
				}
			)

			if (!response.ok) {
				const result = await response.json()
				throw new Error(result.error || 'Failed to delete artist')
			}

			if (editingId === id) {
				clearForm()
			}

			await loadArtists()
		} catch (err) {
			setError(err.message || 'Could not delete artist.')
		}
	}

	const filteredArtists = artists.filter(artist =>
		(artist.FirstName || '').toLowerCase().includes(search.toLowerCase()) ||
		(artist.MiddleName || '').toLowerCase().includes(search.toLowerCase()) ||
		(artist.LastName || '').toLowerCase().includes(search.toLowerCase()) ||
		(artist.Nationality || '').toLowerCase().includes(search.toLowerCase())
	)

	if (loading) {
		return <p>Loading artists...</p>
	}

	return (
		<div className="artists-page">
			<h2>Artists</h2>
			<p>Browse and manage the museum's artists.</p>

			{error && <p role="alert">{error}</p>}

			<button
				type="button"
				className="artist-toggle-button"
				onClick={() => {
					if (showForm) {
						clearForm()
					} else {
						clearForm()
						setShowForm(true)
					}
				}}
			>
				{showForm ? 'Cancel' : 'Add Artist'}
			</button>

			{showForm && (
				<form
					className="artist-form artist-management-form"
					onSubmit={saveArtist}
				>
					<h3>{editingId === null ? 'New Artist' : 'Edit Artist'}</h3>

					<div className="artist-form-grid">
						<div className="artist-field">
							<label>First Name</label>
							<input
								placeholder="First name"
								value={firstName}
								onChange={e => setFirstName(e.target.value)}
								maxLength={30}
								required
							/>
						</div>

						<div className="artist-field">
							<label>Middle Name</label>
							<input
								placeholder="Middle name (optional)"
								value={middleName}
								onChange={e => setMiddleName(e.target.value)}
								maxLength={30}
							/>
						</div>

						<div className="artist-field">
							<label>Last Name</label>
							<input
								placeholder="Last name"
								value={lastName}
								onChange={e => setLastName(e.target.value)}
								maxLength={30}
								required
							/>
						</div>

						<div className="artist-field">
							<label>Nationality</label>
							<input
								placeholder="Nationality"
								value={nationality}
								onChange={e => setNationality(e.target.value)}
								maxLength={30}
							/>
						</div>

						<div className="artist-field">
							<label>Birth Date</label>
							<input
								type="date"
								value={birthDate}
								onChange={e => setBirthDate(e.target.value)}
							/>
						</div>

						<div className="artist-field">
							<label>Death Date</label>
							<input
								type="date"
								value={deathDate}
								onChange={e => setDeathDate(e.target.value)}
							/>
						</div>
					</div>

					<button type="submit">
						{editingId === null ? 'Save Artist' : 'Save Changes'}
					</button>

					<button type="button" onClick={clearForm}>
						Cancel
					</button>
				</form>
			)}

			<input
				className="artist-search"
				placeholder="Search by name or nationality..."
				value={search}
				onChange={e => setSearch(e.target.value)}
			/>

			<div className="artist-list">
				{filteredArtists.map(artist => (
						<div className="artist-card" key={artist.ArtistID}>
							<img
								src={`/MuseumArtistImages/${artist.ArtistID}.jpeg`}
								alt={`${artist.FirstName} ${artist.LastName}`}
								className="artist-image"
								onError={e => {
									e.currentTarget.style.display = 'none'
								}}
							/>
						<h3>
							{[artist.FirstName, artist.MiddleName, artist.LastName]
								.filter(Boolean)
								.join(' ')}
						</h3>

						<p>
							<strong>Artist ID:</strong> {artist.ArtistID}
						</p>

						<p>
							<strong>Nationality:</strong> {artist.Nationality || '—'}
						</p>

						<p>
							<strong>Birth Date:</strong>{' '}
							{artist.BirthDate
								? String(artist.BirthDate).slice(0, 10)
								: '—'}
						</p>

						<p>
							<strong>Death Date:</strong>{' '}
							{artist.DeathDate
								? String(artist.DeathDate).slice(0, 10)
								: '—'}
						</p>

						<div className="artist-card-actions">
							<button
								type="button"
								onClick={() => startEditing(artist)}
							>
								Edit
							</button>

							<button
								type="button"
								className="delete-button"
								onClick={() => deleteArtist(artist.ArtistID)}
							>
								Delete
							</button>
						</div>
					</div>
				))}

				{filteredArtists.length === 0 && <p>No artists found.</p>}
			</div>
		</div>
	)
}

export default Artists
