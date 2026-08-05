import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import AgentPerformanceDetail from '../components/performance/AgentPerformanceDetail';
import { SALES_AGENT_PORTFOLIOS, SUPERVISOR_PORTFOLIOS } from '../config/accessControl';
import { agentId, rowAgent } from '../config/agentIdentity';
import { AUGUST_2026_INDIVIDUAL_TARGETS, isAugust2026Range } from '../config/kpiTargets';

const GP_TARGETS = { onboarding: 60, devfin: 26, devpro: 52 };
const AGENT_DAILY_TARGETS = { engagements: 10, devfin: 2, devpro: 3 };
const MOCK_ENGAGEMENTS = { Peace: 42, Queen: 37, Ifeoma: 51 };
const MOCK_ATTENDANCE = {
  Peace: ['present', 'present', 'present', 'present', 'late', 'present'],
  Queen: ['present', 'late', 'present', 'absent', 'present', 'present'],
  Ifeoma: ['present', 'present', 'present', 'present', 'present', 'present'],
};

function clean(value) { return String(value || '').trim().toLowerCase(); }
function owns(row, name) {
  return rowAgent(row)?.id === agentId(name);
}
function parseDate(row) {
  const value = row?.Timestamp || row?.Date || row?.['Transaction Date'];
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}
function isSelectedMonth(row, month) {
  const date = parseDate(row);
  if (!date) return false;
  const [year, monthNumber] = month.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() === monthNumber - 1;
}
function inRange(row, range) {
  const date = parseDate(row);
  return date && date >= range.start && date <= range.end;
}
function monthRange(month, mtd = false) {
  const [year, monthNumber] = month.split('-').map(Number);
  const now = new Date();
  const current = year === now.getFullYear() && monthNumber - 1 === now.getMonth();
  return { start: new Date(year, monthNumber - 1, 1), end: mtd && current ? now : new Date(year, monthNumber, 0, 23, 59, 59, 999) };
}
function daysInRange(range) {
  let total = 0;
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
  while (cursor <= end) { if (cursor.getDay() !== 0) total += 1; cursor.setDate(cursor.getDate() + 1); }
  return total;
}
function eligibleDays(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const finalDay = new Date(year, monthNumber, 0).getDate();
  let total = 0;
  for (let day = 1; day <= finalDay; day += 1) if (new Date(year, monthNumber - 1, day).getDay() !== 0) total += 1;
  return total;
}
function elapsedWeekdays(now = new Date()) {
  const day = now.getDay();
  if (day === 0) return 6;
  return Math.min(day, 6);
}
function percent(actual, target) { return target ? Math.round((actual / target) * 100) : 0; }
function ProgressValue({ actual, target, color = 'blue', comparison }) {
  const achievement = percent(actual, target);
  return <div className={`table-progress ${color}`}><div><strong>{actual}/{target}</strong><span>{achievement}%</span></div><div><i style={{ width: `${Math.min(achievement, 100)}%` }} /></div><small>{comparison === undefined ? `${Math.max(target - actual, 0)} remaining` : `${actual-comparison>=0?'+':''}${actual-comparison} vs comparison month`}</small></div>;
}

export default function Agents() {
  const { raw } = useData();
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [mode, setMode] = useState('mtd');
  const [compareMonth, setCompareMonth] = useState(`${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`);
  const [fromDate, setFromDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [toDate, setToDate] = useState(now.toISOString().slice(0, 10));
  const [selectedAgent, setSelectedAgent] = useState(null);
  const range = mode === 'range' ? { start: new Date(`${fromDate}T00:00:00`), end: new Date(`${toDate}T23:59:59.999`) } : monthRange(month, mode === 'mtd');
  const monthDays = daysInRange(range);
  const selectedIsCurrentMonth = month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` && mode !== 'range';
  const historicalMonthlyTargets = mode !== 'range' && !selectedIsCurrentMonth;
  const augustTargets = isAugust2026Range(range);
  const agentDevfinTarget = augustTargets ? AUGUST_2026_INDIVIDUAL_TARGETS.devfin : historicalMonthlyTargets ? 26 : AGENT_DAILY_TARGETS.devfin * monthDays;
  const agentDevproTarget = augustTargets ? AUGUST_2026_INDIVIDUAL_TARGETS.devpro : historicalMonthlyTargets ? 52 : AGENT_DAILY_TARGETS.devpro * monthDays;
  const gpDevfinTarget = augustTargets ? AUGUST_2026_INDIVIDUAL_TARGETS.devfin : GP_TARGETS.devfin;
  const gpDevproTarget = augustTargets ? AUGUST_2026_INDIVIDUAL_TARGETS.devpro : GP_TARGETS.devpro;
  const onboardingTarget = augustTargets ? AUGUST_2026_INDIVIDUAL_TARGETS.onboarding : GP_TARGETS.onboarding;
  const engagementTarget = augustTargets ? AUGUST_2026_INDIVIDUAL_TARGETS.engagements : AGENT_DAILY_TARGETS.engagements * monthDays;
  const elapsedThisWeek = elapsedWeekdays(now);
  const comparisonRange = monthRange(compareMonth);

  const growthPartners = useMemo(() => SUPERVISOR_PORTFOLIOS.map((partner) => ({
    ...partner,
    onboarding: raw.onboarding.filter((row) => owns(row, partner.name) && inRange(row, range)).length,
    devfin: raw.devfin.filter((row) => owns(row, partner.name) && inRange(row, range)).length,
    devpro: raw.devpro.filter((row) => owns(row, partner.name) && inRange(row, range)).length,
  })), [raw, range.start.getTime(), range.end.getTime()]);

  const salesAgents = useMemo(() => SALES_AGENT_PORTFOLIOS.map((agent) => {
    const attendance = MOCK_ATTENDANCE[agent.name] || [];
    const elapsedStatuses = attendance.slice(0, elapsedThisWeek);
    const attended = elapsedStatuses.filter((status) => status === 'present' || status === 'late').length;
    return {
      ...agent,
      engagements: MOCK_ENGAGEMENTS[agent.name] || 0,
      devfin: raw.devfin.filter((row) => owns(row, agent.name) && inRange(row, range)).length,
      devpro: raw.devpro.filter((row) => owns(row, agent.name) && inRange(row, range)).length,
      attended,
      elapsed: elapsedThisWeek,
      attendancePercentage: percent(attended, elapsedThisWeek),
    };
  }), [raw.devfin, raw.devpro, range.start.getTime(), range.end.getTime(), elapsedThisWeek]);
  const comparisonFor = (name, source) => source.filter((row) => owns(row, name) && inRange(row, comparisonRange)).length;

  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return <div>
    <div className="role-hero compact"><div><div className="role-eyebrow">Admin only</div><h1>People performance</h1><p>Growth Partners and Sales Agents are measured separately according to their own responsibilities.</p></div><span className="role-badge">Full organisation</span></div>
    <div className="analytics-controls"><div className="section-tabs"><button className={mode==='mtd'?'active':''} onClick={()=>setMode('mtd')}>Month to date</button><button className={mode==='compare'?'active':''} onClick={()=>setMode('compare')}>Month to month</button><button className={mode==='range'?'active':''} onClick={()=>setMode('range')}>Date to date</button></div>{mode!=='range'?<label>Performance month<input type="month" value={month} onChange={(event)=>setMonth(event.target.value)}/></label>:<><label>From<input type="date" value={fromDate} onChange={(event)=>setFromDate(event.target.value)}/></label><label>To<input type="date" value={toDate} onChange={(event)=>setToDate(event.target.value)}/></label></>}{mode==='compare'&&<label>Compare with<input type="month" value={compareMonth} onChange={(event)=>setCompareMonth(event.target.value)}/></label>}<div className="period-summary"><span>{mode==='range'?`${fromDate} → ${toDate}`:monthLabel}</span><strong>{historicalMonthlyTargets?'Historical targets: 26 DEVFIN · 52 DEVPRO':`${monthDays} eligible working days`}</strong></div></div>

    <section className="agent-category-section">
      <div className="agent-category-head"><div><span className="category-icon gp">GP</span><div><h2>Growth Partners</h2><p>No attendance measurement · Personal onboarding, DEVFIN and DEVPRO targets only</p></div></div><strong>{growthPartners.length} Growth Partners</strong></div>
      <div className="role-table-wrap category-table"><table><thead><tr><th>Growth Partner</th><th>Territory responsibility</th><th>Sales Agent supervised</th><th>Stores onboarded MTD</th><th>Personal DEVFIN MTD</th><th>Personal DEVPRO MTD</th></tr></thead><tbody>
        {growthPartners.map((partner) => <tr key={partner.name}><td><strong>{partner.name}</strong><small className="role-row-label">Growth Partner</small></td><td>{partner.territory}</td><td>{partner.agent || '—'}</td><td><ProgressValue actual={partner.onboarding} target={onboardingTarget} color="green" comparison={mode==='compare'?comparisonFor(partner.name,raw.onboarding):undefined} /></td><td><ProgressValue actual={partner.devfin} target={gpDevfinTarget} color="amber" comparison={mode==='compare'?comparisonFor(partner.name,raw.devfin):undefined} /></td><td><ProgressValue actual={partner.devpro} target={gpDevproTarget} color="purple" comparison={mode==='compare'?comparisonFor(partner.name,raw.devpro):undefined} /></td></tr>)}
      </tbody></table></div>
    </section>

    <section className="agent-category-section">
      <div className="agent-category-head"><div><span className="category-icon sa">SA</span><div><h2>Sales Agents</h2><p>Engagements, DEVFIN, DEVPRO and weekly attendance percentage</p></div></div><div className="weekly-rule"><span className="mock-data-badge">Attendance preview</span><strong>{elapsedThisWeek}/6 working days elapsed this week</strong></div></div>
      <div className="role-table-wrap category-table"><table><thead><tr><th>Sales Agent</th><th>Supervisor</th><th>Assigned stores</th><th>Engagements MTD</th><th>DEVFIN MTD</th><th>DEVPRO MTD</th><th>Weekly attendance</th></tr></thead><tbody>
        {salesAgents.map((agent) => <tr key={agent.name} className={`clickable-agent-row${selectedAgent === agent.name ? ' selected' : ''}`} onClick={() => setSelectedAgent(agent.name)}><td><button className="agent-name-link" onClick={() => setSelectedAgent(agent.name)}>{agent.name} <span>View →</span></button><small className="role-row-label">Sales Agent · {agent.territory}</small></td><td>{agent.supervisor}</td><td>{agent.stores}</td><td><ProgressValue actual={agent.engagements} target={engagementTarget} color="green" /></td><td><ProgressValue actual={agent.devfin} target={agentDevfinTarget} color="amber" comparison={mode==='compare'?comparisonFor(agent.name,raw.devfin):undefined} /></td><td><ProgressValue actual={agent.devpro} target={agentDevproTarget} color="purple" comparison={mode==='compare'?comparisonFor(agent.name,raw.devpro):undefined} /></td><td><div className="attendance-percentage"><strong>{agent.attendancePercentage}%</strong><span>{agent.attended}/{agent.elapsed} elapsed days attended</span><div><i style={{ width: `${agent.attendancePercentage}%` }} /></div><small>Resets every Monday</small></div></td></tr>)}
      </tbody></table></div>
    </section>

    {selectedAgent && <AgentPerformanceDetail agentName={selectedAgent} onClose={() => setSelectedAgent(null)} range={range} periodLabel={mode==='range'?`${fromDate} → ${toDate}`:monthLabel} targets={{ devfin: agentDevfinTarget, devpro: agentDevproTarget, engagements: engagementTarget }} />}
    <div className="attendance-formula-note"><strong>Weekly attendance formula:</strong> Present or Late days ÷ elapsed eligible Monday–Saturday working days × 100. Future days are not included. Example: 4 attended days on the fourth working day = 4 ÷ 4 = 100%.</div>
    <div className="footer">Admin People Performance &bull; Role-separated KPIs &bull; Weekly attendance + selectable MTD</div>
  </div>;
}
