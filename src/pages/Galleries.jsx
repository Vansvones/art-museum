import { useEffect, useRef, useState } from 'react'

function Galleries() {
	const [galleries, setGalleries] = useState([])
	const [search, setSearch] = useState('')
	const [editingId, setEditingId] = useState(null)
	const [error, setError] = useState('')
	const [selectedGallery, setSelectedGallery] = useState(null)
	const [exhibitions, setExhibitions] = useState([])
	const [exhibitionsError, setExhibitionsError] = useState('')
	const exhibitionsSectionRef = useRef(null)
	const exhibitionFormRef = useRef(null)
	const galleryFormRef = useRef(null)
	const [editingExhibitionId, setEditingExhibitionId] = useState(null)

	const [exhibitionForm, setExhibitionForm] = useState({
			Name: '',
			Description: '',
			StartDate: '',
			EndDate: '',
			ExhibitionType: '',
			ManagerID: ''
	})

	const emptyForm = {
		Name: '',
		Location: '',
		Description: ''
	}

	const [form, setForm] = useState(emptyForm)

	// Load galleries from the database
	async function loadGalleries() {
		try {
			const response = await fetch('/api/galleries')

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

	async function openGallery(gallery) {
		setSelectedGallery(gallery)
		setTimeout(() => {
				exhibitionsSectionRef.current?.scrollIntoView({
						behavior: 'smooth',
						block: 'start'
				})
		}, 100)
		setExhibitionsError('')
		setExhibitions([])

		try {
			const response = await fetch('/api/exhibitions')

			if (!response.ok) {
				throw new Error('Failed to load exhibitions.')
			}

			const data = await response.json()

			setExhibitions(
				data.filter(
					exhibition =>
						Number(exhibition.GalleryID) === Number(gallery.GalleryID)
				)
			)
		} catch (error) {
			setExhibitionsError(error.message)
		}
	}

	// Update exhibition form fields
	function handleExhibitionChange(event) {
			const { name, value } = event.target

			setExhibitionForm({
					...exhibitionForm,
					[name]: value
			})
	}

	// Clear the exhibition form
	function resetExhibitionForm() {
			setExhibitionForm({
					Name: '',
					Description: '',
					StartDate: '',
					EndDate: '',
					ExhibitionType: '',
					ManagerID: ''
			})

			setEditingExhibitionId(null)
	}

	// Load an exhibition into the form for editing
	function startEditingExhibition(exhibition) {
			setEditingExhibitionId(exhibition.ExhibitionID)
			setExhibitionForm({
					Name: exhibition.Name || '',
					Description: exhibition.Description || '',
					StartDate: exhibition.StartDate
							? String(exhibition.StartDate).slice(0, 10)
							: '',
					EndDate: exhibition.EndDate
							? String(exhibition.EndDate).slice(0, 10)
							: '',
					ExhibitionType: exhibition.ExhibitionType || '',
					ManagerID: exhibition.ManagerID ?? ''
			})

			setTimeout(() => {
					exhibitionFormRef.current?.scrollIntoView({
							behavior: 'smooth',
							block: 'start'
					})
			}, 100)
	}

	async function getNextExhibitionId() {
			const response = await fetch('/api/exhibitions')

			if (!response.ok) {
					throw new Error('Failed to get exhibition IDs.')
			}

			const data = await response.json()

			return data.length > 0
					? Math.max(...data.map(item => Number(item.ExhibitionID))) + 1
					: 1
	}

	async function saveExhibition(event) {
    event.preventDefault()

    if (!selectedGallery) return

    setExhibitionsError('')

    const exhibition = {
        ...exhibitionForm,
        GalleryID: Number(selectedGallery.GalleryID),
        ManagerID: exhibitionForm.ManagerID === ''
            ? null
            : Number(exhibitionForm.ManagerID),
        StartDate: exhibitionForm.StartDate || null,
        EndDate: exhibitionForm.EndDate || null
    }

    try {
        const isEditing = editingExhibitionId !== null

        const response = await fetch(
            isEditing
                ? `/api/exhibitions/${editingExhibitionId}`
                : '/api/exhibitions',
            {
                method: isEditing ? 'PUT' : 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
									isEditing
											? exhibition
											: {
														...exhibition,
														ExhibitionID: await getNextExhibitionId()
												}
							)
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.error || 'Failed to save exhibition.')
        }

        resetExhibitionForm()
        await openGallery(selectedGallery)
			} catch (error) {
					setExhibitionsError(error.message)
			}
	}

	async function deleteGalleryExhibition(id) {
    if (!window.confirm('Are you sure you want to delete this exhibition?')) {
        return
    }

    setExhibitionsError('')

    try {
        const response = await fetch(
            `/api/exhibitions/${id}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete exhibition.')
        }

        if (editingExhibitionId === id) {
            resetExhibitionForm()
        }

        await openGallery(selectedGallery)
    } catch (error) {
        setExhibitionsError(error.message)
    }
}

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
					`/api/galleries/${editingId}`,
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

				response = await fetch('/api/galleries', {
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

		galleryFormRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
		})
	}

	// Delete a gallery
	async function deleteGallery(id) {
		if (!window.confirm('Are you sure you want to delete this gallery?')) {
			return
		}

		setError('')

		try {
			const response = await fetch(
				`/api/galleries/${id}`,
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

			<form className="gallery-form" onSubmit={saveGallery} ref={galleryFormRef}>
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
							<div
								className="gallery-card"
								key={gallery.GalleryID}
								onClick={() => openGallery(gallery)}
								style={{ cursor: 'pointer' }}
							>
								<h4>{gallery.Name}</h4>

								<p><strong>ID:</strong> {gallery.GalleryID}</p>
								<p><strong>Location:</strong> {gallery.Location || 'Not specified'}</p>
								<p><strong>Description:</strong> {gallery.Description || 'None'}</p>

								<div className="gallery-card-actions">
									<button
										type="button"
										onClick={event => {
											event.stopPropagation()
											startEditing(gallery)
									}}
									>
										Edit
									</button>

									<button
										type="button"
										className="delete-button"
										onClick={event => {
												event.stopPropagation()
												deleteGallery(gallery.GalleryID)
										}}
									>
										Delete
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>
			{selectedGallery && (
				<div className="gallery-exhibitions-section" ref={exhibitionsSectionRef}>
						<h3 className="gallery-exhibitions-title">Exhibitions in {selectedGallery.Name}</h3>
						<form className="gallery-form" onSubmit={saveExhibition} ref={exhibitionFormRef}>
							<h4>
									{editingExhibitionId !== null
											? 'Edit Exhibition'
											: 'Add Exhibition'}
							</h4>

							<div className="gallery-form-grid">
									<div className="gallery-field">
											<label>Exhibition Name</label>
											<input
													name="Name"
													value={exhibitionForm.Name}
													onChange={handleExhibitionChange}
													required
											/>
									</div>

									<div className="gallery-field gallery-field-wide">
											<label>Description</label>
											<textarea
													name="Description"
													value={exhibitionForm.Description}
													onChange={handleExhibitionChange}
											/>
									</div>

									<div className="gallery-field">
											<label>Start Date</label>
											<input
													type="date"
													name="StartDate"
													value={exhibitionForm.StartDate}
													onChange={handleExhibitionChange}
											/>
									</div>

									<div className="gallery-field">
											<label>End Date</label>
											<input
													type="date"
													name="EndDate"
													value={exhibitionForm.EndDate}
													onChange={handleExhibitionChange}
											/>
									</div>

									<div className="gallery-field">
											<label>Exhibition Type</label>
											<input
													name="ExhibitionType"
													value={exhibitionForm.ExhibitionType}
													onChange={handleExhibitionChange}
													required
											/>
									</div>

									<div className="gallery-field">
											<label>Manager Employee ID</label>
											<input
													type="number"
													name="ManagerID"
													value={exhibitionForm.ManagerID}
													onChange={handleExhibitionChange}
													min="1"
											/>
									</div>
							</div>

							<button type="submit">
									{editingExhibitionId !== null
											? 'Save Changes'
											: 'Add Exhibition'}
							</button>

							{editingExhibitionId !== null && (
									<button type="button" onClick={resetExhibitionForm}>
											Cancel
									</button>
							)}
					</form>

						{exhibitionsError && (
								<p className="error-message">{exhibitionsError}</p>
						)}

						{!exhibitionsError && exhibitions.length === 0 && (
								<p>No exhibitions found in this gallery.</p>
						)}

						<div className="gallery-list">
								{exhibitions.map(exhibition => (
										<div
												className="gallery-card"
												key={exhibition.ExhibitionID}
										>
												<h4>{exhibition.Name}</h4>
												<p>
														<strong>Description:</strong>{' '}
														{exhibition.Description || 'None'}
												</p>
												<p>
														<strong>Type:</strong>{' '}
														{exhibition.ExhibitionType || 'Not specified'}
												</p>
												<p>
														<strong>Start date:</strong>{' '}
														{exhibition.StartDate
																? new Date(exhibition.StartDate).toLocaleDateString(
																			'en-US',
																			{ timeZone: 'UTC' }
																	)
																: 'Not specified'}
												</p>
												<p>
														<strong>End date:</strong>{' '}
														{exhibition.EndDate
																? new Date(exhibition.EndDate).toLocaleDateString(
																			'en-US',
																			{ timeZone: 'UTC' }
																	)
																: 'Not specified'}
												</p>
												<div className="gallery-card-actions">
													<button
															type="button"
															onClick={() => startEditingExhibition(exhibition)}
													>
															Edit
													</button>

													<button
															type="button"
															className="delete-button"
															onClick={() => deleteGalleryExhibition(exhibition.ExhibitionID)}
													>
															Delete
													</button>
											</div>
										</div>
								))}
						</div>
				</div>
		)}
		</div>
	)
}

export default Galleries
