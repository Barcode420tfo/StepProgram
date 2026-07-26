import { useData } from '../../context/DataContext';
import ExportReportsButton from '../ui/ExportReportsButton';

export default function StatusBar() {
  const { status } = useData();
  return (
    <div className={`status ${status.type}`}>
      <span>{status.message}</span>
      <ExportReportsButton />
    </div>
  );
}
