import { Bar } from 'react-chartjs-2';
import { useData } from '../context/DataContext';
import Scorecard from '../components/ui/Scorecard';
import { uniq } from '../utils/dataUtils';

const GRID = 'rgba(0,0,0,0.05)';

function parseActivityDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(.*))?$/);
  if (!match) return null;
  const [, day, month, year, time = '00:00'] = match;
  const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${normaliseTime(time)}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normaliseTime(value) {
  const text = String(value || '').trim();
  if (!text) return '00:00:00';
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return '00:00:00';
  let hour = Number(match[1]);
  const suffix = match[4]?.toUpperCase();
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
}

function dateLabel(value, includeTime = false) {
  const date = parseActivityDate(value);
  if (!date) return String(value || '—');
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Africa/Lagos',
  });
}

function dateKey(value) {
  const date = parseActivityDate(value);
  if (!date) return String(value || 'Unknown');
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Africa/Lagos' }).format(date);
}

function aggregate(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${dateKey(row.Timestamp)}|${row['Agent Name'] || 'Unassigned'}`;
    const current = map.get(key) || {
      date: dateKey(row.Timestamp), agent: row['Agent Name'] || 'Unassigned',
      zones: new Set(), acquisitions: 0, devfin: 0, devpro: 0, latest: row.Timestamp,
    };
    current.zones.add(row['Assigned Zone'] || 'Unassigned');
    if (row['Activity Type'] === 'Merchant Acquisition') current.acquisitions += 1;
    if (row['Activity Type'] === 'DEVFIN') current.devfin += 1;
    if (row['Activity Type'] === 'DEVPRO') current.devpro += 1;
    const currentTime = parseActivityDate(current.latest)?.getTime() || 0;
    const rowTime = parseActivityDate(row.Timestamp)?.getTime() || 0;
    if (rowTime > currentTime) current.latest = row.Timestamp;
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => (parseActivityDate(b.latest)?.getTime() || 0) - (parseActivityDate(a.latest)?.getTime() || 0));
}

export default function FieldOps() {
  const { filtered, filters } = useData();
  const activities = filtered.daily;
  const daily = aggregate(activities);
  const agents = uniq(activities.map((row) => row['Agent Name']));
  const acquisitionCount = activities.filter((row) => row['Activity Type'] === 'Merchant Acquisition').length;
  const devfinCount = activities.filter((row) => row['Activity Type'] === 'DEVFIN').length;
  const devproCount = activities.filter((row) => row['Activity Type'] === 'DEVPRO').length;

  const chartData = {
    labels: agents.length ? agents : ['No activity'],
    datasets: [
      { label: 'Merchant acquisitions', data: agents.length ? agents.map((agent) => activities.filter((row) => row['Agent Name'] === agent && row['Activity Type'] === 'Merchant Acquisition').length) : [0], backgroundColor: '#34a853', borderRadius: 4 },
      { label: 'DEVFIN', data: agents.length ? agents.map((agent) => activities.filter((row) => row['Agent Name'] === agent && row['Activity Type'] === 'DEVFIN').length) : [0], backgroundColor: '#f9ab00', borderRadius: 4 },
      { label: 'DEVPRO', data: agents.length ? agents.map((agent) => activities.filter((row) => row['Agent Name'] === agent && row['Activity Type'] === 'DEVPRO').length) : [0], backgroundColor: '#9334e6', borderRadius: 4 },
    ],
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 9, boxHeight: 9 } } },
    scales: { x: { grid: { color: GRID } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID } } },
  };

  return <div>
    <div className="src-banner">
      <div className="src-banner-item"><span className="src-dot" style={{ background: 'var(--green)' }} /><span><span className="src-banner-label">Derived Daily Activity</span> Built from source timestamps on Merchant Acquisition, DEVFIN and DEVPRO sheets</span></div>
    </div>
    <div className="sec">Daily activity report — {filters.date || 'all source dates'}</div>
    <div className="r g4">
      <Scorecard source="3 Live Sheets" colorClass="bl" label="Total Activities" value={activities.length} sub="Distinct timestamped source rows" subType="up" />
      <Scorecard source="Acquisition" colorClass="gr" label="Merchant Acquisitions" value={acquisitionCount} sub="Stores logged by activity date" subType="up" />
      <Scorecard source="DEVFIN" colorClass="am" label="DEVFIN Sales" value={devfinCount} sub="Approved and fulfilled sales" subType="up" />
      <Scorecard source="DEVPRO" colorClass="pu" label="DEVPRO Sales" value={devproCount} sub={`${agents.length} active agent${agents.length === 1 ? '' : 's'}`} subType="up" />
    </div>
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="ct">Agent activity mix <span className="ds">Timestamp derived</span></div>
      <div className="cs">Every bar is calculated from the original date and time captured by its source sheet.</div>
      <div className="cw" style={{ height: 260 }}><Bar data={chartData} options={chartOptions} /></div>
    </div>
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="ct">Daily agent summary <span className="ds">3 source sheets</span></div>
      <div className="cs">One row per agent per activity date. DEVFIN, DEVPRO and acquisitions remain separate.</div>
      <div className="tw"><table><thead><tr><th>Date</th><th>Agent</th><th>Location/zone</th><th>Merchant acquisitions</th><th>DEVFIN</th><th>DEVPRO</th><th>Total</th><th>Latest activity</th></tr></thead><tbody>
        {daily.length ? daily.map((row) => <tr key={`${row.date}-${row.agent}`}><td><strong>{dateLabel(row.latest)}</strong></td><td><strong>{row.agent}</strong></td><td>{[...row.zones].join(' · ')}</td><td><span className="pill active">{row.acquisitions}</span></td><td>{row.devfin}</td><td>{row.devpro}</td><td><strong>{row.acquisitions + row.devfin + row.devpro}</strong></td><td>{dateLabel(row.latest, true)}</td></tr>) : <tr><td colSpan="8" className="empty-detail">No timestamped activity matches the current filters.</td></tr>}
      </tbody></table></div>
    </div>
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="ct">Activity timeline</div><div className="cs">Transaction-level evidence, newest first.</div>
      <div className="tw"><table><thead><tr><th>Date and time</th><th>Agent</th><th>Activity</th><th>Store</th><th>Location</th><th>Source</th></tr></thead><tbody>
        {[...activities].sort((a, b) => (parseActivityDate(b.Timestamp)?.getTime() || 0) - (parseActivityDate(a.Timestamp)?.getTime() || 0)).slice(0, 100).map((row) => <tr key={row['Activity ID']}><td>{dateLabel(row.Timestamp, true)}</td><td><strong>{row['Agent Name']}</strong></td><td><span className={`activity-pill ${String(row['Activity Type']).toLowerCase().replace(' ', '-')}`}>{row['Activity Type']}</span></td><td>{row['Store Name']}</td><td>{row['Assigned Zone']}</td><td>{row['Activity Source']}</td></tr>)}
      </tbody></table></div>
    </div>
    <div className="footer">Daily Reports &bull; Merchant Acquisition + DEVFIN + DEVPRO &bull; Source timestamp driven</div>
  </div>;
}
