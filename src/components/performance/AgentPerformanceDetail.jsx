import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { SALES_AGENT_PORTFOLIOS } from '../../config/accessControl';
import { getMockAttendance, MOCK_ATTENDANCE_EVENT } from '../../utils/mockAttendance';
import { agentId, rowAgent } from '../../config/agentIdentity';
import { AUGUST_2026_INDIVIDUAL_TARGETS } from '../../config/kpiTargets';

const DAILY_TARGETS = { engagements: 10, devfin: 2, devpro: 3 };

function clean(value) { return String(value || '').trim().toLowerCase(); }
function owns(row, agent) {
  return rowAgent(row)?.id === agentId(agent);
}
function parseDate(row) {
  const value = row?.Timestamp || row?.Date || row?.['Transaction Date'];
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}
function isMtd(row, now = new Date()) {
  const date = parseDate(row);
  return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date <= now;
}
function eligibleDaysInMonth(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let total = 0;
  for (let day = 1; day <= end; day += 1) {
    const weekday = new Date(now.getFullYear(), now.getMonth(), day).getDay();
    if (weekday !== 0) total += 1;
  }
  return total;
}
function dateKey(row) {
  const date = parseDate(row);
  return date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : '';
}
function countEngagements(rows) {
  return rows.filter((row) => row['Activity Type'] === 'Merchant Acquisition').length;
}
function pct(actual, target) { return target ? Math.round((actual / target) * 100) : 0; }
function displayDate(row) {
  const date = parseDate(row);
  return date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }) : '—';
}

const ATTENDANCE_STORES = {
  peace: 'POINTEK, Computer Village',
  queen: 'Vivo Exclusive Royalline, Computer Village',
  ifeoma: 'Slot Lawanson, Lawanson Phone Village',
};

function buildMockAttendance(agentName) {
  const store = ATTENDANCE_STORES[clean(agentName)] || 'Assigned Attendance Store';
  const seed = [...String(agentName || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const examples = [
    { date: '2026-08-01', status: 'Present', clockIn: '8:52 AM', clockOut: '6:08 PM', distance: 24, accuracy: 18, geofence: 'Inside geofence' },
    { date: '2026-07-31', status: 'Late', clockIn: '9:42 AM', clockOut: '6:02 PM', distance: 68, accuracy: 31, geofence: 'Inside geofence' },
    { date: '2026-07-30', status: 'Present', clockIn: '10:18 AM', clockOut: '6:11 PM', distance: 41, accuracy: 22, geofence: 'Inside geofence', note: 'Thursday schedule' },
    { date: '2026-07-29', status: 'Early Clock-Out', clockIn: '9:07 AM', clockOut: '4:46 PM', distance: 83, accuracy: 45, geofence: 'Inside geofence' },
    { date: '2026-07-28', status: 'Absent', clockIn: '10:14 AM', clockOut: '6:05 PM', distance: 57, accuracy: 29, geofence: 'Inside geofence', note: 'Clocked in after cutoff' },
    { date: '2026-07-27', status: 'Location Exception', clockIn: '9:16 AM', clockOut: '6:00 PM', distance: 136, accuracy: 38, geofence: 'Outside geofence', note: 'Mock supervisor review' },
  ];
  return examples.map((item, index) => ({
    ...item,
    store,
    engagements: Math.max(3, 7 + ((seed + index) % 6)),
    latitude: clean(agentName) === 'ifeoma' ? '6.5038' : '6.6018',
    longitude: clean(agentName) === 'ifeoma' ? '3.3534' : '3.3515',
    mock: true,
  }));
}

function Kpi({ label, actual, target, tone }) {
  const achievement = pct(actual, target);
  return <div className={`agent-kpi ${tone || ''}`}><span>{label}</span><strong>{actual}</strong><small>{target ? `${achievement}% of ${target} monthly target` : 'No target configured'}</small><div><i style={{ width: `${Math.min(achievement, 100)}%` }} /></div></div>;
}

export default function AgentPerformanceDetail({ agentName, onClose, compact = false, range, periodLabel, targets }) {
  const { raw } = useData();
  const [interactiveMock, setInteractiveMock] = useState(() => getMockAttendance(agentName));
  useEffect(() => {
    setInteractiveMock(getMockAttendance(agentName));
    const update = (event) => { if (event.detail?.agentName === agentName) setInteractiveMock(event.detail.record); };
    window.addEventListener(MOCK_ATTENDANCE_EVENT, update);
    return () => window.removeEventListener(MOCK_ATTENDANCE_EVENT, update);
  }, [agentName]);
  const report = useMemo(() => {
    const portfolio = SALES_AGENT_PORTFOLIOS.find((item) => clean(item.name) === clean(agentName));
    const selected = (row) => {
      if (!range) return isMtd(row);
      const date = parseDate(row);
      return date && date >= range.start && date <= range.end;
    };
    const onboarding = raw.onboarding.filter((row) => owns(row, agentName) && selected(row));
    const daily = raw.daily.filter((row) => owns(row, agentName) && selected(row));
    const devfin = raw.devfin.filter((row) => owns(row, agentName) && selected(row));
    const devpro = raw.devpro.filter((row) => owns(row, agentName) && selected(row));
    const workingDays = eligibleDaysInMonth();
    const reportingDays = new Set(daily.map(dateKey).filter(Boolean)).size;
    return {
      portfolio,
      onboarding,
      daily,
      devfin,
      devpro,
      reportingDays,
      engagements: countEngagements(daily),
      targets: {
        engagements: targets?.engagements ?? 0,
        devfin: targets?.devfin ?? AUGUST_2026_INDIVIDUAL_TARGETS.devfin,
        devpro: targets?.devpro ?? AUGUST_2026_INDIVIDUAL_TARGETS.devpro,
      },
    };
  }, [agentName, raw, range?.start?.getTime(), range?.end?.getTime(), targets?.engagements, targets?.devfin, targets?.devpro]);

  const liveLogs = [...report.daily].sort((a, b) => (parseDate(b)?.getTime() || 0) - (parseDate(a)?.getTime() || 0));
  const hasClockData = liveLogs.some((row) => row['Clock-In Time'] || row['Clock-Out Time']);
  const logs = hasClockData ? liveLogs : [interactiveMock, ...buildMockAttendance(agentName)].filter(Boolean);
  const attendanceDays = logs.filter((row) => !['Absent'].includes(row.status || row['Attendance Status'])).length;
  return (
    <section className={`agent-drilldown${compact ? ' compact' : ''}`}>
      <div className="agent-drilldown-head">
        <div><div className="role-eyebrow">{periodLabel || 'Month-to-date performance'}</div><h2>{agentName}</h2><p>{report.portfolio?.territory || 'Territory not assigned'} · Supervisor: <strong>{report.portfolio?.supervisor || 'Not assigned'}</strong></p></div>
        {onClose && <button className="detail-close" onClick={onClose}>Close ×</button>}
      </div>
      <div className="agent-profile-strip">
        <div><small>Assigned stores</small><strong>{report.portfolio?.stores ?? '—'}</strong></div>
        <div><small>{hasClockData ? 'Attendance days' : 'Attendance days · mock'}</small><strong>{hasClockData ? report.reportingDays : attendanceDays}</strong></div>
        <div><small>Stores onboarded · period</small><strong>{report.onboarding.length}</strong></div>
        <div><small>Total sales · period</small><strong>{report.devfin.length + report.devpro.length}</strong></div>
      </div>
      <div className="agent-kpi-grid">
        <Kpi label="Merchant acquisitions" actual={report.engagements} target={report.targets.engagements} tone="green" />
        <Kpi label="DEVFIN" actual={report.devfin.length} target={report.targets.devfin} tone="amber" />
        <Kpi label="DEVPRO" actual={report.devpro.length} target={report.targets.devpro} tone="purple" />
      </div>
      <div className="role-panel attendance-log-panel">
        <div className="role-panel-head"><div><h2>Attendance and location log</h2><p>{hasClockData ? 'Live clock-in and clock-out evidence.' : 'Mock preview data — visual demonstration only. It does not affect actual performance or attendance totals.'}</p></div>{!hasClockData && <span className="mock-data-badge">Mock data</span>}</div>
        <div className="role-table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Attendance store</th><th>Clock in</th><th>Clock out</th><th>Distance</th><th>GPS accuracy</th><th>Location</th><th>Engagements</th></tr></thead><tbody>
          {logs.length ? logs.slice(0, 12).map((row, index) => {
            const mock = row.mock;
            const status = mock ? row.status : (row['Attendance Status'] || 'Reported');
            const outside = mock ? row.geofence === 'Outside geofence' : row['Geofence Status'] === 'Outside geofence';
            return <tr key={`${mock ? row.date : dateKey(row)}-${index}`}><td><strong>{mock ? new Date(`${row.date}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : displayDate(row)}</strong>{mock && row.note ? <small className="log-note">{row.note}</small> : null}</td><td><span className={`attendance-status ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></td><td>{mock ? row.store : (row['Attendance Store'] || 'Assigned store')}</td><td>{mock ? row.clockIn : (row['Clock-In Time'] || 'Not captured')}</td><td>{mock ? row.clockOut : (row['Clock-Out Time'] || 'Not captured')}</td><td>{mock ? `${row.distance}m` : (row['Distance'] ? `${row['Distance']}m` : '—')}</td><td>{mock ? `±${row.accuracy}m` : (row['GPS Accuracy'] ? `±${row['GPS Accuracy']}m` : '—')}</td><td><span className={`location-result ${outside ? 'outside' : 'inside'}`}>{mock ? row.geofence : (row['Geofence Status'] || 'Not captured')}</span>{mock && <small className="coordinates">{row.latitude}, {row.longitude}</small>}</td><td>{mock ? row.engagements : (Number(row['Customer Engagements']) || Number(row['Total Merchants Visited Today']) || 0)}</td></tr>;
          }) : <tr><td colSpan="9" className="empty-detail">No attendance records found for this agent.</td></tr>}
        </tbody></table></div>
      </div>
    </section>
  );
}
