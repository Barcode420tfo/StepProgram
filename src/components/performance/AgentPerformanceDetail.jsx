import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { SALES_AGENT_PORTFOLIOS } from '../../config/accessControl';
import { agentId, rowAgent } from '../../config/agentIdentity';
import { AUGUST_2026_INDIVIDUAL_TARGETS } from '../../config/kpiTargets';
import { auth } from '../../lib/firebase';

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
function displayTime(value) {
  return value ? new Date(value).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }) : 'Not captured';
}

function Kpi({ label, actual, target, tone }) {
  const achievement = pct(actual, target);
  return <div className={`agent-kpi ${tone || ''}`}><span>{label}</span><strong>{actual}</strong><small>{target ? `${achievement}% of ${target} monthly target` : 'No target configured'}</small><div><i style={{ width: `${Math.min(achievement, 100)}%` }} /></div></div>;
}

export default function AgentPerformanceDetail({ agentName, onClose, compact = false, range, periodLabel, targets }) {
  const { raw } = useData();
  const [attendanceHistory, setAttendanceHistory] = useState(null);
  useEffect(() => {
    let active = true;
    setAttendanceHistory(null);
    const load = async () => {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/.netlify/functions/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'agent_history', agentName }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (active) setAttendanceHistory((data.attendance || []).map((row) => ({
        Date: row.date,
        'Attendance Status': row.status,
        'Attendance Store': row.store,
        'Clock-In Time': row.clockIn,
        'Clock-Out Time': row.clockOut,
        Distance: row.clockInDistance,
        'GPS Accuracy': row.clockInAccuracy,
        'Geofence Status': row.insideClockIn ? 'Inside geofence' : 'Outside geofence',
        Coordinates: row.clockInCoordinates,
        'Exception Reason': row.exceptionReason,
      })));
    };
    load().catch(() => {});
    return () => { active = false; };
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
  const hasScopedAttendance = Array.isArray(attendanceHistory);
  const hasSheetClockData = liveLogs.some((row) => row['Clock-In Time'] || row['Clock-Out Time']);
  const hasClockData = hasScopedAttendance || hasSheetClockData;
  const logs = hasScopedAttendance ? attendanceHistory : hasSheetClockData ? liveLogs : [];
  const attendanceDays = logs.filter((row) => !['Absent'].includes(row.status || row['Attendance Status'])).length;
  const salesLog = [
    ...report.devfin.map((row) => ({ ...row, _product: 'DEVFIN' })),
    ...report.devpro.map((row) => ({ ...row, _product: 'DEVPRO' })),
  ].sort((a, b) => (parseDate(b)?.getTime() || 0) - (parseDate(a)?.getTime() || 0));
  return (
    <section className={`agent-drilldown${compact ? ' compact' : ''}`}>
      <div className="agent-drilldown-head">
        <div><div className="role-eyebrow">{periodLabel || 'Month-to-date performance'}</div><h2>{agentName}</h2><p>{report.portfolio?.territory || 'Territory not assigned'} · Supervisor: <strong>{report.portfolio?.supervisor || 'Not assigned'}</strong></p></div>
        {onClose && <button className="detail-close" onClick={onClose}>Close ×</button>}
      </div>
      <div className="agent-profile-strip">
        <div><small>Stores onboarded · period</small><strong>{report.onboarding.length}</strong></div>
        <div><small>DEVFIN · period</small><strong>{report.devfin.length}</strong></div>
        <div><small>DEVPRO · period</small><strong>{report.devpro.length}</strong></div>
        <div><small>Attendance days</small><strong>{attendanceDays}</strong></div>
      </div>
      <div className="agent-kpi-grid">
        <Kpi label="Stores onboarded" actual={report.onboarding.length} target={report.targets.engagements} tone="green" />
        <Kpi label="DEVFIN" actual={report.devfin.length} target={report.targets.devfin} tone="amber" />
        <Kpi label="DEVPRO" actual={report.devpro.length} target={report.targets.devpro} tone="purple" />
      </div>
      <div className="role-panel">
        <div className="role-panel-head"><div><h2>Sales performance log</h2><p>Live DEVFIN and DEVPRO records attributed to {agentName}.</p></div></div>
        <div className="role-table-wrap"><table><thead><tr><th>Date</th><th>Product</th><th>Store</th><th>Location</th><th>Device</th><th>Value</th></tr></thead><tbody>
          {salesLog.length ? salesLog.slice(0, 50).map((row, index) => <tr key={`${row._product}-${dateKey(row)}-${index}`}><td><strong>{displayDate(row)}</strong></td><td><span className={`attendance-status ${row._product.toLowerCase()}`}>{row._product}</span></td><td>{row['Store Name'] || '—'}</td><td>{row['Store Location'] || row.Location || '—'}</td><td>{row['Device Model'] || row['Device Type'] || '—'}</td><td>{row.Value || row['Device Price'] || row['Loan Amount'] || '—'}</td></tr>) : <tr><td colSpan="6" className="empty-detail">No live sales records found for this period.</td></tr>}
        </tbody></table></div>
      </div>
      <div className="role-panel attendance-log-panel">
        <div className="role-panel-head"><div><h2>Attendance and location log</h2><p>{hasClockData ? 'Live clock-in and clock-out evidence.' : 'No live attendance has been recorded for this period.'}</p></div></div>
        <div className="role-table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Attendance store</th><th>Clock in</th><th>Clock out</th><th>Distance</th><th>GPS accuracy</th><th>Location</th><th>Engagements</th></tr></thead><tbody>
          {logs.length ? logs.slice(0, 12).map((row, index) => {
            const status = row['Attendance Status'] || 'Reported';
            const outside = row['Geofence Status'] === 'Outside geofence';
            return <tr key={`${dateKey(row)}-${index}`}><td><strong>{displayDate(row)}</strong>{row['Exception Reason'] ? <small className="log-note">{row['Exception Reason']}</small> : null}</td><td><span className={`attendance-status ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></td><td>{row['Attendance Store'] || 'Assigned store'}</td><td>{displayTime(row['Clock-In Time'])}</td><td>{displayTime(row['Clock-Out Time'])}</td><td>{row['Distance'] != null ? `${row['Distance']}m` : '—'}</td><td>{row['GPS Accuracy'] != null ? `±${row['GPS Accuracy']}m` : '—'}</td><td><span className={`location-result ${outside ? 'outside' : 'inside'}`}>{row['Geofence Status'] || 'Not captured'}</span>{row.Coordinates && <small className="coordinates">{row.Coordinates}</small>}</td><td>{Number(row['Customer Engagements']) || Number(row['Total Merchants Visited Today']) || 0}</td></tr>;
          }) : <tr><td colSpan="9" className="empty-detail">No attendance records found for this agent.</td></tr>}
        </tbody></table></div>
      </div>
    </section>
  );
}
