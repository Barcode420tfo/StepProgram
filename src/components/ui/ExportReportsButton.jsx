import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { exportAllReports } from '../../utils/exportReports';

export default function ExportReportsButton() {
  const { raw } = useData();
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setError('From date must be before to date');
      return;
    }
    setIsExporting(true);
    setError('');
    try {
      await exportAllReports(raw, { fromDate, toDate });
      setIsOpen(false);
    } catch (exportError) {
      console.error('Spreadsheet export failed', exportError);
      setError(exportError.message || 'Export failed — please try again');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-wrap">
      {error && <span className="export-error">{error}</span>}
      <button
        className="export-btn"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={isExporting}
        title="Choose a date range and download every report"
      >
        {isExporting ? 'Preparing spreadsheet…' : '⇩ Export reports'}
      </button>
      {isOpen && (
        <div className="export-panel">
          <div className="export-panel-title">Choose export date range</div>
          <label>
            <span>From date</span>
            <input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            <span>To date</span>
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <div className="export-panel-actions">
            <button type="button" className="export-clear-btn" onClick={() => { setFromDate(''); setToDate(''); setError(''); }}>
              All dates
            </button>
            <button type="button" className="export-download-btn" onClick={handleExport} disabled={isExporting}>
              Download Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
