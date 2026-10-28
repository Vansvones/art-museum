
import { useEffect, useState } from 'react'

function formatSalary(salary) {
	if (salary == null || salary === '') {
		return 'Not specified'
	}

	return Number(salary).toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD'
	})
}

function formatPhone(phone) {
	if (!phone) return 'Not specified'

	const digits = String(phone).replace(/\D/g, '')

	if (digits.length === 10) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
	}

	return phone
}

function Employees() {
	const [employees, setEmployees] = useState([])
	const [search, setSearch] = useState('')
	const [editingId, setEditingId] = useState(null)
	const [error, setError] = useState('')

	const emptyForm = {
		FirstName: '',
		MiddleName: '',
		LastName: '',
		SSN: '',
		Street: '',
		City: '',
		State: '',
		ZIPCode: '',
		Phone: '',
		Email: '',
		Salary: '',
		Sex: '',
		BirthDate: '',
		SupervisorID: ''
	}

	const [form, setForm] = useState(emptyForm)

	// Load employees from the database
	async function loadEmployees() {
		try {
			const response = await fetch('http://localhost:5000/api/employees')

			if (!response.ok) {
				throw new Error('Failed to load employees')
			}

			const data = await response.json()
			setEmployees(data)
			setError('')
		} catch (error) {
			setError(error.message)
		}
	}

	useEffect(() => {
		loadEmployees()
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

	// Add or update an employee
	async function saveEmployee(event) {
		event.preventDefault()
		setError('')

		const employee = {
			...form,
			FirstName: form.FirstName.trim(),
			LastName: form.LastName.trim(),
			MiddleName: form.MiddleName.trim() || null,
			SSN: form.SSN.trim() || null,
			Street: form.Street.trim() || null,
			City: form.City.trim() || null,
			State: form.State.trim() || null,
			ZIPCode: form.ZIPCode.trim() || null,
			Phone: form.Phone.trim() || null,
			Email: form.Email.trim() || null,
			Salary: form.Salary === '' ? null : Number(form.Salary),
			Sex: form.Sex || null,
			BirthDate: form.BirthDate || null,
			SupervisorID: form.SupervisorID === ''
				? null
				: Number(form.SupervisorID)
		}

		try {
			let response

			if (editingId !== null) {
				response = await fetch(
					`http://localhost:5000/api/employees/${editingId}`,
					{
						method: 'PUT',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(employee)
					}
				)
			} else {
				const nextId = employees.length > 0
					? Math.max(...employees.map(item => Number(item.EmployeeID))) + 1
					: 1

				response = await fetch('http://localhost:5000/api/employees', {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...employee,
						EmployeeID: nextId
					})
				})
			}

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Failed to save employee')
			}

			resetForm()
			await loadEmployees()
		} catch (error) {
			setError(error.message)
		}
	}

	// Load an employee into the form for editing
	function startEditing(employee) {
		setEditingId(employee.EmployeeID)

		setForm({
			FirstName: employee.FirstName || '',
			MiddleName: employee.MiddleName || '',
			LastName: employee.LastName || '',
			SSN: employee.SSN || '',
			Street: employee.Street || '',
			City: employee.City || '',
			State: employee.State || '',
			ZIPCode: employee.ZIPCode || '',
			Phone: employee.Phone || '',
			Email: employee.Email || '',
			Salary: employee.Salary ?? '',
			Sex: employee.Sex || '',
			BirthDate: employee.BirthDate
				? String(employee.BirthDate).slice(0, 10)
				: '',
			SupervisorID: employee.SupervisorID ?? ''
		})

		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	// Delete an employee
	async function deleteEmployee(id) {
		if (!window.confirm('Are you sure you want to delete this employee?')) {
			return
		}

		setError('')

		try {
			const response = await fetch(
				`http://localhost:5000/api/employees/${id}`,
				{
					method: 'DELETE',
					credentials: 'include'
				}
			)

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Failed to delete employee')
			}

			if (editingId === id) {
				resetForm()
			}

			await loadEmployees()
		} catch (error) {
			setError(error.message)
		}
	}

	// Search employees
	const filteredEmployees = employees.filter(employee =>
		`${employee.FirstName} ${employee.MiddleName || ''} ${employee.LastName} ${employee.Email || ''}`
			.toLowerCase()
			.includes(search.toLowerCase())
	)

	return (
		<div className="employees-page">
			<h2>Manage Employees</h2>

			{error && <p className="error-message">{error}</p>}

			<form className="employee-form" onSubmit={saveEmployee}>
				<h3>{editingId !== null ? 'Edit Employee' : 'Add Employee'}</h3>

				<div className="employee-form-grid">
					<div className="employee-field">
						<label>First Name *</label>
						<input
							name="FirstName"
							value={form.FirstName}
							onChange={handleChange}
							maxLength="30"
							required
						/>
					</div>

					<div className="employee-field">
						<label>Middle Name</label>
						<input
							name="MiddleName"
							value={form.MiddleName}
							onChange={handleChange}
							maxLength="30"
						/>
					</div>

					<div className="employee-field">
						<label>Last Name *</label>
						<input
							name="LastName"
							value={form.LastName}
							onChange={handleChange}
							maxLength="30"
							required
						/>
					</div>

					<div className="employee-field">
						<label>SSN (optional)</label>
						<input
							name="SSN"
							value={form.SSN}
							onChange={handleChange}
							maxLength="9"
							placeholder="9 digits, no dashes"
						/>
					</div>

					<div className="employee-field employee-field-wide">
						<label>Street</label>
						<input
							name="Street"
							value={form.Street}
							onChange={handleChange}
							maxLength="100"
						/>
					</div>

					<div className="employee-field">
						<label>City</label>
						<input
							name="City"
							value={form.City}
							onChange={handleChange}
							maxLength="50"
						/>
					</div>

					<div className="employee-field">
						<label>State</label>
						<input
							name="State"
							value={form.State}
							onChange={handleChange}
							maxLength="30"
						/>
					</div>

					<div className="employee-field">
						<label>ZIP Code</label>
						<input
							name="ZIPCode"
							value={form.ZIPCode}
							onChange={handleChange}
							maxLength="20"
						/>
					</div>

					<div className="employee-field">
						<label>Phone</label>
						<input
							name="Phone"
							value={form.Phone}
							onChange={handleChange}
							maxLength="15"
						/>
					</div>

					<div className="employee-field">
						<label>Email</label>
						<input
							type="email"
							name="Email"
							value={form.Email}
							onChange={handleChange}
							maxLength="50"
						/>
					</div>

					<div className="employee-field">
						<label>Salary ($)</label>
						<input
							type="number"
							name="Salary"
							value={form.Salary}
							onChange={handleChange}
							min="0"
							step="0.01"
						/>
					</div>

					<div className="employee-field">
						<label>Sex</label>
						<select
							name="Sex"
							value={form.Sex}
							onChange={handleChange}
						>
							<option value="">Not specified</option>
							<option value="M">M</option>
							<option value="F">F</option>
						</select>
					</div>

					<div className="employee-field">
						<label>Birth Date</label>
						<input
							type="date"
							name="BirthDate"
							value={form.BirthDate}
							onChange={handleChange}
						/>
					</div>

					<div className="employee-field">
						<label>Supervisor Employee ID</label>
						<input
							type="number"
							name="SupervisorID"
							value={form.SupervisorID}
							onChange={handleChange}
							min="1"
							placeholder="Leave blank if none"
						/>
					</div>
				</div>

				<div className="employee-form-actions">
					<button type="submit">
						{editingId !== null ? 'Save Changes' : 'Add Employee'}
					</button>

					{editingId !== null && (
						<button type="button" onClick={resetForm}>
							Cancel
						</button>
					)}
				</div>
			</form>

			<div className="employee-section">
				<h3>Employees</h3>

				<input
					className="employee-search"
					type="text"
					placeholder="Search employees..."
					value={search}
					onChange={event => setSearch(event.target.value)}
				/>

				<div className="employee-list">
					{filteredEmployees.length === 0 ? (
						<p>No employees found.</p>
					) : (
						filteredEmployees.map(employee => (
							<div
								className="employee-card"
								key={employee.EmployeeID}
							>
								<h4>
									{employee.FirstName} {employee.MiddleName
										? `${employee.MiddleName} `
										: ''}{employee.LastName}
								</h4>

								<p><strong>ID:</strong> {employee.EmployeeID}</p>
								<p><strong>Email:</strong> {employee.Email || 'Not specified'}</p>
								<p><strong>Phone:</strong> {formatPhone(employee.Phone)}</p>
								<p><strong>City:</strong> {employee.City || 'Not specified'}</p>
								<p><strong>Salary:</strong> {formatSalary(employee.Salary)}</p>
								<p><strong>Supervisor ID:</strong> {employee.SupervisorID ?? 'None'}</p>

								<div className="employee-card-actions">
									<button
										type="button"
										onClick={() => startEditing(employee)}
									>
										Edit
									</button>

									<button
										type="button"
										className="delete-button"
										onClick={() => deleteEmployee(employee.EmployeeID)}
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

export default Employees
