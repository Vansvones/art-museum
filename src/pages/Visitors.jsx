import { useEffect, useState } from 'react'

function formatPhone(phone) {
	if (!phone) return 'Not specified'

	const digits = String(phone).replace(/\D/g, '')

	if (digits.length === 10) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
	}

	return phone
}

function Visitors() {
	const [visitors, setVisitors] = useState([])
	const [search, setSearch] = useState('')
	const [editingId, setEditingId] = useState(null)
	const [error, setError] = useState('')

	const emptyForm = {
		FirstName: '',
		MiddleName: '',
		LastName: '',
		Email: '',
		Phone: ''
	}

	const [form, setForm] = useState(emptyForm)

	// Load visitors from the database
	async function loadVisitors() {
		try {
			const response = await fetch(
				'http://localhost:3000/api/visitors',
				{
					credentials: 'include'
				}
			)

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Failed to load visitors.')
			}

			setVisitors(data)
			setError('')
		} catch (error) {
			setError(error.message)
		}
	}

	useEffect(() => {
		loadVisitors()
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

	// Add or update a visitor
	async function saveVisitor(event) {
		event.preventDefault()
		setError('')

		const visitor = {
			FirstName: form.FirstName.trim(),
			MiddleName: form.MiddleName.trim() || null,
			LastName: form.LastName.trim(),
			Email: form.Email.trim() || null,
			Phone: form.Phone.trim() || null
		}

		try {
			let response

			if (editingId !== null) {
				response = await fetch(
					`http://localhost:3000/api/visitors/${editingId}`,
					{
						method: 'PUT',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(visitor)
					}
				)
			} else {
				response = await fetch(
					'http://localhost:3000/api/visitors',
					{
						method: 'POST',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(visitor)
					}
				)
			}

			const result = await response.json()

			if (!response.ok) {
				throw new Error(
					result.error || 'Failed to save visitor.'
				)
			}

			resetForm()
			await loadVisitors()
		} catch (error) {
			setError(error.message)
		}
	}

	// Load a visitor into the form for editing
	function startEditing(visitor) {
		setEditingId(visitor.VisitorID)

		setForm({
			FirstName: visitor.FirstName || '',
			MiddleName: visitor.MiddleName || '',
			LastName: visitor.LastName || '',
			Email: visitor.Email || '',
			Phone: visitor.Phone || ''
		})

		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		})
	}

	// Delete a visitor
	async function deleteVisitor(id) {
		if (!window.confirm(
			'Are you sure you want to delete this visitor?'
		)) {
			return
		}

		setError('')

		try {
			const response = await fetch(
				`http://localhost:3000/api/visitors/${id}`,
				{
					method: 'DELETE',
					credentials: 'include'
				}
			)

			const result = await response.json()

			if (!response.ok) {
				throw new Error(
					result.error || 'Failed to delete visitor.'
				)
			}

			if (editingId === id) {
				resetForm()
			}

			await loadVisitors()
		} catch (error) {
			setError(error.message)
		}
	}

	// Search visitors
	const filteredVisitors = visitors.filter(visitor =>
		`${visitor.VisitorID} ${visitor.FirstName} ${visitor.MiddleName || ''} ${visitor.LastName} ${visitor.Email || ''} ${visitor.Phone || ''}`
			.toLowerCase()
			.includes(search.toLowerCase())
	)

	return (
		<div className="visitors-page">
			<h2>Manage Visitors</h2>

			{error && (
				<p className="error-message">{error}</p>
			)}

			<form
				className="visitor-form"
				onSubmit={saveVisitor}
			>
				<h3>
					{editingId !== null
						? 'Edit Visitor'
						: 'Add Visitor'}
				</h3>

				<div className="visitor-form-grid">
					<div className="visitor-field">
						<label>First Name *</label>
						<input
							name="FirstName"
							value={form.FirstName}
							onChange={handleChange}
							maxLength="30"
							required
						/>
					</div>

					<div className="visitor-field">
						<label>Middle Name</label>
						<input
							name="MiddleName"
							value={form.MiddleName}
							onChange={handleChange}
							maxLength="30"
						/>
					</div>

					<div className="visitor-field">
						<label>Last Name *</label>
						<input
							name="LastName"
							value={form.LastName}
							onChange={handleChange}
							maxLength="30"
							required
						/>
					</div>

					<div className="visitor-field">
						<label>Email</label>
						<input
							type="email"
							name="Email"
							value={form.Email}
							onChange={handleChange}
							maxLength="50"
						/>
					</div>

					<div className="visitor-field">
						<label>Phone</label>
						<input
							type="tel"
							name="Phone"
							value={form.Phone}
							onChange={handleChange}
							maxLength="15"
							placeholder="Enter phone number"
						/>
					</div>
				</div>

				<div className="visitor-form-actions">
					<button type="submit">
						{editingId !== null
							? 'Save Changes'
							: 'Add Visitor'}
					</button>

					{editingId !== null && (
						<button
							type="button"
							onClick={resetForm}
						>
							Cancel
						</button>
					)}
				</div>
			</form>

			<div className="visitor-section">
				<h3>Visitors</h3>

				<input
					className="visitor-search"
					type="text"
					placeholder="Search visitors..."
					value={search}
					onChange={event =>
						setSearch(event.target.value)
					}
				/>

				<div className="visitor-list">
					{filteredVisitors.length === 0 ? (
						<p>
							{visitors.length === 0
								? 'No visitors found.'
								: 'No matching visitors found.'}
						</p>
					) : (
						filteredVisitors.map(visitor => (
							<div
								className="visitor-card"
								key={visitor.VisitorID}
							>
								<h4>
									{visitor.FirstName}{' '}
									{visitor.MiddleName
										? `${visitor.MiddleName} `
										: ''}
									{visitor.LastName}
								</h4>

								<p>
									<strong>ID:</strong>{' '}
									{visitor.VisitorID}
								</p>

								<p>
									<strong>Email:</strong>{' '}
									{visitor.Email || 'Not specified'}
								</p>

								<p>
									<strong>Phone:</strong>{' '}
									{formatPhone(visitor.Phone)}
								</p>

								<div className="visitor-card-actions">
									<button
										type="button"
										onClick={() =>
											startEditing(visitor)
										}
									>
										Edit
									</button>

									<button
										type="button"
										className="delete-button"
										onClick={() =>
											deleteVisitor(
												visitor.VisitorID
											)
										}
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

export default Visitors
