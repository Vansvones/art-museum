import { useEffect, useRef, useState } from 'react'

function DataReport() {
    const emptyForm = {
        ReportType: '',
        VisitDate: '',
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
    const reports = ["Exhibition", "Stores"];

    return (
        <div className="galleries-page">
            <h2>Data Reports</h2>

            {error && <p className="error-message">{error}</p>}

            <form className="ticket-form">
                <div className="ticket-form-grid">
                    <div className="ticket-field">
                        <label>Report Type</label>
                        <select
                            name="report-type"
                            value={form.ReportType}
                        //     onChange={handleChange}
                            required
                        >
                            <option value="">Select a report type</option>
                            {reports.map(report => (
                                <option key={report} value={report}>{report}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default DataReport;