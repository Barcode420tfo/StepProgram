import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ROLES, SUPERVISOR_PORTFOLIOS } from '../config/accessControl';
import AssignedStoreList from '../components/performance/AssignedStoreList';
import SupervisorStoreAccess from '../components/performance/SupervisorStoreAccess';
import AgentPerformanceDetail from '../components/performance/AgentPerformanceDetail';
import SupervisorSalesOverview from '../components/performance/SupervisorSalesOverview';
import SalesAgentMockPerformance from '../components/performance/SalesAgentMockPerformance';
import GrowthPartnerAttendance from '../components/performance/GrowthPartnerAttendance';
import AdminAnalytics from './AdminAnalytics';
import { AUGUST_2026_INDIVIDUAL_TARGETS } from '../config/kpiTargets';

const DAILY_TARGETS = { engagements: 10, devfin: 2, devpro: 3 };
const GP_TARGETS = { stores: AUGUST_2026_INDIVIDUAL_TARGETS.onboarding, devfin: AUGUST_2026_INDIVIDUAL_TARGETS.devfin, devpro: AUGUST_2026_INDIVIDUAL_TARGETS.devpro };

function text(value) {
  return String(value || '').trim().toLowerCase();
}

function belongsTo(row, name) {
  const expected = text(name);
  return [row?.['Agent Name'], row?.['Field Agent Name'], row?.['Sale Owner'], row?.['Sales Agent']]
    .some((value) => text(value) === expected);
}
function isCurrentMtd(row) {
  const value = row?.Timestamp || row?.Date || row?.['Transaction Date'];
  const date = value ? new Date(value) : null;
  const now = new Date();
  return date && !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date <= now;
}

function Metric({ label, value, note, tone = 'blue' }) {
  return (
    <div className={`role-metric ${tone}`}>
      <div className="role-metric-label">{label}</div>
      <div className="role-metric-value">{value}</div>
      <div className="role-metric-note">{note}</div>
    </div>
  );
}

function PageIntro({ eyebrow, title, copy, badge }) {
  return (
    <div className="role-hero">
      <div>
        <div className="role-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <span className="role-badge">{badge}</span>
    </div>
  );
}

function AdminHome() {
  return <AdminAnalytics />;
}

function GrowthPartnerHome() {
  const { profile } = useAuth();
  const { raw } = useData();
  const portfolio = profile.portfolio;
  const agent = portfolio?.agent || 'Assigned Sales Agent';
  const personalStores = raw.onboarding.filter((row) => belongsTo(row, portfolio?.name) && isCurrentMtd(row)).length;
  const personalDevfin = raw.devfin.filter((row) => belongsTo(row, portfolio?.name) && isCurrentMtd(row)).length;
  const personalDevpro = raw.devpro.filter((row) => belongsTo(row, portfolio?.name) && isCurrentMtd(row)).length;
  const agentDevfin = raw.devfin.filter((row) => belongsTo(row, agent) && isCurrentMtd(row)).length;
  const agentDevpro = raw.devpro.filter((row) => belongsTo(row, agent) && isCurrentMtd(row)).length;
  const score = Math.round((
    Math.min(personalStores / GP_TARGETS.stores, 1) * 40
    + Math.min(personalDevfin / GP_TARGETS.devfin, 1) * 30
    + Math.min(personalDevpro / GP_TARGETS.devpro, 1) * 30
  ) * 100) / 100;

  return (
    <div>
      <PageIntro eyebrow={portfolio?.territory || 'Assigned territory'} title={`${portfolio?.name || 'Growth Partner'} territory workspace`} copy={`Supervise ${agent}, monitor territory execution and keep personal performance separate from team sales.`} badge="Territory access" />
      <GrowthPartnerAttendance name={portfolio?.name} />
      <div className="role-metrics four">
        <Metric label="Original portfolio" value={portfolio?.stores || 0} note="Stores personally onboarded · not an allocation" />
        <Metric label="Personal onboarding" value={`${personalStores}/${GP_TARGETS.stores}`} note="₦3,000 per qualifying store" tone="green" />
        <Metric label="Personal DEVFIN" value={`${personalDevfin}/${GP_TARGETS.devfin}`} note="₦500 per personal sale" tone="amber" />
        <Metric label="Personal DEVPRO" value={`${personalDevpro}/${GP_TARGETS.devpro}`} note="₦500 per personal sale" tone="purple" />
      </div>
      <div className="role-grid two">
        <section className="role-panel">
          <div className="role-panel-head"><div><h2>Personal scorecard</h2><p>Direct obligations only · 40/30/30 weighting</p></div><strong className="panel-stat">{score}%</strong></div>
          <PerformanceLine label="Store onboarding" actual={personalStores} target={GP_TARGETS.stores} />
          <PerformanceLine label="Personal DEVFIN" actual={personalDevfin} target={GP_TARGETS.devfin} />
          <PerformanceLine label="Personal DEVPRO" actual={personalDevpro} target={GP_TARGETS.devpro} />
        </section>
        <section className="role-panel">
          <div className="role-panel-head"><div><h2>{agent} · territory contribution</h2><p>Agent sales give territory credit, not personal incentive</p></div></div>
          <div className="territory-sales"><div><span>DEVFIN</span><strong>{agentDevfin}</strong></div><div><span>DEVPRO</span><strong>{agentDevpro}</strong></div></div>
          <div className="scope-note">This role can view only its assigned territory, Sales Agent, attendance summaries, store coverage and exception recommendations.</div>
        </section>
      </div>
      <SupervisorStoreAccess supervisorName={portfolio?.name} agentName={agent} territory={portfolio?.territory} />
      <SupervisorSalesOverview supervisorName={portfolio?.name} agentName={agent} territory={portfolio?.territory} />
      <AgentPerformanceDetail agentName={agent} compact />
    </div>
  );
}

function SalesAgentHome() {
  const { profile } = useAuth();
  const { raw } = useData();
  const portfolio = profile.portfolio;
  const name = portfolio?.name || 'Sales Agent';
  const dailyRows = raw.daily.filter((row) => belongsTo(row, name) && isCurrentMtd(row));
  const devfin = raw.devfin.filter((row) => belongsTo(row, name) && isCurrentMtd(row)).length;
  const devpro = raw.devpro.filter((row) => belongsTo(row, name) && isCurrentMtd(row)).length;
  const engagements = dailyRows.filter((row) => row['Activity Type'] === 'Merchant Acquisition').length;
  const today = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(new Date());

  return (
    <div>
      <PageIntro eyebrow={today} title={`${name}'s field workspace`} copy={`${portfolio?.stores || 0} assigned stores in ${portfolio?.territory || 'your territory'} · Supervisor: ${portfolio?.supervisor || 'Not assigned'}.`} badge="My performance only" />
      <GrowthPartnerAttendance name={name === 'Sales Agent' ? 'Peace' : name} roleLabel="Sales Agent" />
      <div className="role-metrics four">
        <Metric label="Assigned stores" value={portfolio?.stores || 0} note={portfolio?.territory || 'No territory'} />
        <Metric label="Acquisitions MTD" value={engagements} note="From timestamped merchant records" tone="green" />
        <Metric label="DEVFIN MTD" value={devfin} note={`Daily target ${DAILY_TARGETS.devfin}`} tone="amber" />
        <Metric label="DEVPRO MTD" value={devpro} note={`Daily target ${DAILY_TARGETS.devpro}`} tone="purple" />
      </div>
      <section className="role-panel">
        <div className="role-panel-head"><div><h2>My access</h2><p>Personal field actions and results</p></div></div>
        <div className="agent-actions">
          <div><strong>Attendance</strong><span>Clock in and out within 100m of the assigned attendance store.</span></div>
          <div><strong>Daily activity</strong><span>Record customer engagements, DEVFIN and DEVPRO activity.</span></div>
          <div><strong>Sales coverage</strong><span>Outside-cluster sales still count and are clearly labelled.</span></div>
          <div><strong>Performance</strong><span>View personal targets, remaining figures and incentive estimate.</span></div>
        </div>
      </section>
      <AssignedStoreList agentName={name} title="My assigned stores" />
      <SalesAgentMockPerformance agentName={name === 'Sales Agent' ? 'Peace' : name} />
    </div>
  );
}

function SupervisorHome() {
  const { profile } = useAuth();
  return <div><PageIntro eyebrow={profile?.portfolio?.territory || 'Assigned cluster'} title={`${profile?.portfolio?.name || 'Supervisor'} supervisor workspace`} copy="Monitor the assigned cluster’s acquisitions, activity and sales reports without Growth Partner personal KPI or onboarding incentive attribution." badge="Supervisor access" /><div className="scope-note">Use Overview, Acquisitions, Daily Reports, DEVFIN Report and DEVPRO Report for the assigned cluster. Store allocations are currently pending reassignment.</div></div>;
}

function PerformanceLine({ label, actual, target }) {
  const pct = target ? Math.min(Math.round((actual / target) * 100), 100) : 0;
  return <div className="performance-line"><div><span>{label}</span><strong>{actual} / {target}</strong></div><div className="performance-track"><span style={{ width: `${pct}%` }} /></div></div>;
}

export default function RoleHome() {
  const { role } = useAuth();
  const view = useMemo(() => {
    if (role === ROLES.GROWTH_PARTNER) return <GrowthPartnerHome />;
    if (role === ROLES.SUPERVISOR) return <SupervisorHome />;
    if (role === ROLES.SALES_AGENT) return <SalesAgentHome />;
    return <AdminHome />;
  }, [role]);
  return view;
}
