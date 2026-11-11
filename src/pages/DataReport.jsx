
import { useState } from 'react'

function DataReport() {
    const [form, setForm] = useState({
        ReportType: '',
        StartDate: '',
        EndDate: ''
    })

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const reports = {
        Financial: 'Financial Performance',
        Exhibitions: 'Exhibition Performance',
        Operations: 'Visitor and Staff'
    }

    function handleChange(event) {
        const { name, value } = event.target

        setForm(prev => ({
            ...prev,
            [name]: value
        }))

        setError('')
    }

    async function getReport(event) {
        event.preventDefault()
        setError('')

        if (!reports[form.ReportType]) {
            setError('Please select a report.')
            return
        }

        if (!form.StartDate || !form.EndDate) {
            setError('Please select both dates.')
            return
        }

        if (form.StartDate > form.EndDate) {
            setError('The start date cannot be after the end date.')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(
                `/api/report/${form.ReportType}`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        startDate: form.StartDate,
                        endDate: form.EndDate
                    })
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
            link.download =
                `${form.ReportType}_${form.StartDate}_to_${form.EndDate}.pdf`

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            window.setTimeout(() => {
                window.URL.revokeObjectURL(url)
            }, 1000)

        } catch (error) {
            setError(error.message || 'Failed to generate report.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="galleries-page">
            <h2>Museum Management Reports</h2>

            {error && (
                <p className="error-message">{error}</p>
            )}

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
                            <option value="">
                                Select a report
                            </option>

                            {Object.entries(reports).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="ticket-field">
                        <label>Start Date</label>

                        <input
                            type="date"
                            name="StartDate"
                            value={form.StartDate}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="ticket-field">
                        <label>End Date</label>

                        <input
                            type="date"
                            name="EndDate"
                            value={form.EndDate}
                            onChange={handleChange}
                            min={form.StartDate || undefined}
                            required
                        />
                    </div>

                </div>

                <button type="submit" disabled={loading}>
                    {loading ? 'Generating Report...' : 'Generate PDF Report'}
                </button>
            </form>
        </div>
    )
}

export default DataReport
