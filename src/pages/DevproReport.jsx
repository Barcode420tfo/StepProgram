import { SalesReportPage } from './StorePerformance';

export default function DevproReport() {
  return (
    <SalesReportPage
      sourceKey="devpro"
      summaryKey="devproSummary"
      reportName="Devpro"
      reportLabel="Devpro Report"
      liveLabel="Live Devpro Sheet"
      supportsFinancing={false}
    />
  );
}
