import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { exportAllReports } from '../../utils/exportReports';

export default function ExportReportsButton() {
  const { raw } = useData();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    try {
      await exportAllReports(raw);
    } catch (exportError) {
      console.error('Spreadsheet export failed', exportError);
      setError('Export failed — please try again');
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
        onClick={handleExport}
        disabled={isExporting}
        title="Download every report in one Excel workbook"
      >
        {isExporting ? 'Preparing spreadsheet…' : '⇩ Export all reports'}
      </button>
    </div>
  );
}
