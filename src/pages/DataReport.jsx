
import { useState } from 'react'

function DataReport() {
    const [form, setForm] = useState({
        ReportType: '',
        StartDate: '',
        EndDate: ''
    })

    const [report, setReport] = useState(null)

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
        setReport(null)

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
                `/api/report/${form.ReportType}?format=json`,
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

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.error || 'Failed to generate report.'
                )
            }

            setReport(data)

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
                    {loading ? 'Generating Report...' : 'Generate Report'}
                </button>
            </form>


        {report && (
            <div className="report-results">
            
                <div className="report-header">
                    <h2>{report.title}</h2>
        
                    <p>
                        Reporting Period: {report.startDate} to {report.endDate}
                    </p>
                </div>
        
                {report.sections.map((section, index) => {
                
                    const columns = section.rows.length > 0
                        ? Object.keys(section.rows[0])
                        : []
                
                    return (
                        <div className="report-section" key={index}>
                        
                            <h3>{section.title}</h3>
                    
                            {section.summary && (
                                <p className="report-summary">
                                    {section.summary}
                                </p>
                            )}

                            {section.rows.length === 0 ? (
                                <p>No records found for this period.</p>
                            ) : (
                                <div className="report-table-container">
                                
                                    <table className="report-table">
                            
                                        <thead>
                                            <tr>
                                                {columns.map(column => (
                                                    <th key={column}>
                                                        {column}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                            
                                        <tbody>
                                            {section.rows.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {columns.map(column => (
                                                        <td key={column}>
                                                            {row[column] === null ||
                                                             row[column] === undefined
                                                                ? '—'
                                                                : String(row[column])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )}
        </div>
    )
}

export default DataReport
