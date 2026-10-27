import { useEffect, useRef, useState } from 'react'

function DataReport() {
    const emptyForm = {
        ReportType: '',
        Subtype: '',
        Price: '',
        Type: 'General Admission',
        VisitorID: '',
        ExhibitionID: '',
        GeneralAdmissionTicketID: ''
    };


    // const [reports, setReports] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    // setReports(["Exhibition", "Stores"]);
    const reports = ["Information", "Sold", "Profit"];

    function handleChange(event) {
        const { name, value } = event.target;

        setForm({
                ...form,
                [name]: value
            });
    }

    async function getReport(event) {
        event.preventDefault();
        setError('');
    }

    return (
        <div className="galleries-page">
            <h2>Data Reports</h2>

            {error && <p className="error-message">{error}</p>}

            <form className="ticket-form">
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
                            {reports.map(report => (
                                <option key={report} value={report} onChange={handleChange}>{report}</option>
                            ))}
                        </select>
                    </div>
                    {form.ReportType === 'Information' && (
                        <>
                            <label>Type of Information</label>
                            <select name="Subtype" value={form.Subtype} onChange={handleChange} required>
                                <option value="">Select an attribute</option>
                                <option value="Exhibitions">Exhibitions</option>
                                <option value="Memberships">Memberships</option>
                                <option value="Stores">Stores</option>
                                <option value="Employees">Employees</option>
                            </select>
                        </>
                    )}
                    {form.ReportType === 'Sold' && (
                        <>
                            <label>Type of Information</label>
                            <select name="Subtype" value={form.Subtype} onChange={handleChange} required>
                                <option value="">Select an attribute</option>
                                <option value="Tickets">Tickets</option>
                                <option value="ExhibitionTickets">Exhibition Tickets</option>
                                <option value="StoreItems">Store Items</option>
                            </select>
                        </>
                    )}
                    {form.ReportType === 'Profit' && (
                        <>
                            <label>Type of Information</label>
                            <select name="Subtype" value={form.Subtype} onChange={handleChange} required>
                                <option value="">Select an attribute</option>
                                <option value="Parking">Parking Passes</option>
                                <option value="StoreItems">Store Items</option>
                            </select>
                        </>
                    )}

                </div>
                <button type="submit">Generate Report</button>
            </form>
        </div>
    )
}

export default DataReport;