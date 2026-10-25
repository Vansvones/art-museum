
import { useEffect, useState } from 'react'

function Galleries() {
	const [galleries, setGalleries] = useState([])
	const [search, setSearch] = useState('')
	const [editingId, setEditingId] = useState(null)
	const [error, setError] = useState('')

	const emptyForm = {
		Name: '',
		Location: '',
		Description: ''
	}

	const [form, setForm] = useState(emptyForm)

	// Load galleries from the database
	async function loadGalleries() {
		try {
			const response = await fetch('http://localhost:3000/api/galleries')

			if (!response.ok) {
				throw new Error('Failed to load galleries')
			}

			const data = await response.json()
			setGalleries(data)
			setError('')
		} catch (error) {
			setError(error.message)
		}
	}

	useEffect(() => {
		loadGalleries()
	}, [])

	// Update form fields
	function handleChange(event) {
		const { name, value } = event.target

		setForm({
			...form,
			[name]: value
		})
	}

	// Clear the form
	function resetForm() {
		setForm({ ...emptyForm })
		setEditingId(null)
	}

	// Add or update a gallery
	async function saveGallery(event) {
		event.preventDefault()
		setError('')

		const gallery = {
			...form,
			Location: form.Location.trim() || null,
			Description: form.Description.trim() || null
		}

		try {
			let response

			if (editingId !== null) {
				response = await fetch(
					`http://localhost:3000/api/galleries/${editingId}`,
					{
						method: 'PUT',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(gallery)
					}
				)
			} else {
				const nextId = galleries.length > 0
					? Math.max(...galleries.map(item => Number(item.GalleryID))) + 1
					: 1

				response = await fetch('http://localhost:3000/api/galleries', {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...gallery,
						GalleryID: nextId
					})
				})
			}

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Failed to save gallery')
			}

			resetForm()
			await loadGalleries()
		} catch (error) {
			setError(error.message)
		}
	}

	// Load a gallery into the form for editing
	function startEditing(gallery) {
		setEditingId(gallery.GalleryID)

		setForm({
			Name: gallery.Name || '',
			Location: gallery.Location || '',
			Description: gallery.Description || ''
		})

		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	// Delete a gallery
	async function deleteGallery(id) {
		if (!window.confirm('Are you sure you want to delete this gallery?')) {
			return
		}

		setError('')

		try {
			const response = await fetch(
				`http://localhost:3000/api/galleries/${id}`,
				{
					method: 'DELETE',
					credentials: 'include'
				}
			)

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Failed to delete gallery')
			}

			if (editingId === id) {
				resetForm()
			}

			await loadGalleries()
		} catch (error) {
			setError(error.message)
		}
	}

	// Search galleries
	const filteredGalleries = galleries.filter(gallery =>
		`${gallery.Name} ${gallery.Location || ''} ${gallery.Description || ''}`
			.toLowerCase()
			.includes(search.toLowerCase())
	)

	return (
		<div className="galleries-page">
			<h2>Manage Galleries</h2>

			{error && <p className="error-message">{error}</p>}

			<form className="gallery-form" onSubmit={saveGallery}>
				<h3>{editingId !== null ? 'Edit Gallery' : 'Add Gallery'}</h3>

				<div className="gallery-form-grid">
					<div className="gallery-field">
						<label>Gallery Name</label>
						<input
							name="Name"
							value={form.Name}
							onChange={handleChange}
							maxLength="50"
							required
						/>
					</div>

					<div className="gallery-field">
						<label>Location</label>
						<input
							name="Location"
							value={form.Location}
							onChange={handleChange}
							maxLength="100"
						/>
					</div>

					<div className="gallery-field gallery-field-wide">
						<label>Description</label>
						<textarea
							name="Description"
							value={form.Description}
							onChange={handleChange}
							maxLength="250"
							rows={4}
						/>
					</div>
				</div>

				<button type="submit">
					{editingId !== null ? 'Save Changes' : 'Add Gallery'}
				</button>

				{editingId !== null && (
					<button type="button" onClick={resetForm}>
						Cancel
					</button>
				)}
			</form>

			<div className="gallery-section">
				<h3>Galleries</h3>

				<input
					className="gallery-search"
					type="text"
					placeholder="Search galleries..."
					value={search}
					onChange={event => setSearch(event.target.value)}
				/>

				<div className="gallery-list">
					{filteredGalleries.length === 0 ? (
						<p>No galleries found.</p>
					) : (
						filteredGalleries.map(gallery => (
							<div className="gallery-card" key={gallery.GalleryID}>
								<h4>{gallery.Name}</h4>

								<p><strong>ID:</strong> {gallery.GalleryID}</p>
								<p><strong>Location:</strong> {gallery.Location || 'Not specified'}</p>
								<p><strong>Description:</strong> {gallery.Description || 'None'}</p>

								<div className="gallery-card-actions">
									<button
										type="button"
										onClick={() => startEditing(gallery)}
									>
										Edit
									</button>

									<button
										type="button"
										className="delete-button"
										onClick={() => deleteGallery(gallery.GalleryID)}
									>
										Delete
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	)
}

export default Galleries
