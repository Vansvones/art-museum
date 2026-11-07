import { useState } from 'react'

function DataReport() {
    const emptyForm = {
        ReportType: '',
        Subtype: ''
    }

    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const reports = {
        Information: [
            { value: 'Exhibitions', label: 'Exhibitions' },
            { value: 'Memberships', label: 'Memberships' },
            { value: 'Stores', label: 'Stores' },
            { value: 'Employees', label: 'Employees' }
        ],
        Sold: [
            { value: 'Tickets', label: 'Tickets' },
            { value: 'ExhibitionTickets', label: 'Exhibition Tickets' },
            { value: 'StoreItems', label: 'Store Items' }
        ],
        Profit: [
            { value: 'Parking', label: 'Parking Passes' },
            { value: 'StoreItems', label: 'Store Items' }
        ]
    }

    function handleChange(event) {
        const { name, value } = event.target

        setForm({
            ...form,
            [name]: value,
            ...(name === 'ReportType' ? { Subtype: '' } : {})
        })

        setError('')
    }

    async function getReport(event) {
        event.preventDefault()
        setError('')

        if (!reports[form.ReportType] ||
            !reports[form.ReportType].some(
                report => report.value === form.Subtype
            )) {
            setError('Invalid report type or subtype.')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(
                `/api/report/${form.ReportType}/${form.Subtype}`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            )

            if (!res.ok) {
                const message = await res.text()
                let errorMessage = 'Failed to generate report.'

                try {
                    const errorData = JSON.parse(message)
                    errorMessage = errorData.error || errorMessage
                } catch {
                    errorMessage = message || errorMessage
                }

                throw new Error(errorMessage)
            }

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = url
            link.download = `${form.ReportType}_${form.Subtype}.pdf`

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            window.URL.revokeObjectURL(url)

        } catch (error) {
            setError(error.message || 'Failed to generate report.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="galleries-page">
            <h2>Data Reports</h2>

            {error && <p className="error-message">{error}</p>}

            <form className="ticket-form" onSubmit={getReport}>
                <div className="ticket-form-grid">

                    <div className="ticket-field">
                        <label>Report Type</label>
                        <select
                            name="ReportType"
                            value={form.ReportType}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select a report type</option>

                            {Object.keys(reports).map(report => (
                                <option key={report} value={report}>
                                    {report}
                                </option>
                            ))}
                        </select>
                    </div>

                    {form.ReportType && (
                        <div className="ticket-field">
                            <label>
                                {form.ReportType === 'Information'
                                    ? 'Type of Information'
                                    : form.ReportType === 'Sold'
                                        ? 'Type of Product'
                                        : 'Type of Sales'}
                            </label>

                            <select
                                name="Subtype"
                                value={form.Subtype}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select an attribute</option>

                                {reports[form.ReportType].map(report => (
                                    <option
                                        key={report.value}
                                        value={report.value}
                                    >
                                        {report.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                </div>

                <button type="submit" disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Report'}
                </button>
            </form>
        </div>
    )
}

export default DataReport
