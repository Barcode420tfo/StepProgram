import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ROLES, SUPERVISOR_PORTFOLIOS } from '../config/accessControl';
import SupervisorStoreAccess from '../components/performance/SupervisorStoreAccess';
import AgentPerformanceDetail from '../components/performance/AgentPerformanceDetail';
import SupervisorSalesOverview from '../components/performance/SupervisorSalesOverview';
import GrowthPartnerAttendance from '../components/performance/GrowthPartnerAttendance';
import AssignedStoreList from '../components/performance/AssignedStoreList';
import AdminAnalytics from './AdminAnalytics';
import { AUGUST_2026_CLUSTER_TARGETS, AUGUST_2026_INDIVIDUAL_TARGETS } from '../config/kpiTargets';
import { agentId, rowAgent } from '../config/agentIdentity';

const GP_TARGETS = { stores: AUGUST_2026_INDIVIDUAL_TARGETS.onboarding, devfin: AUGUST_2026_INDIVIDUAL_TARGETS.devfin, devpro: AUGUST_2026_INDIVIDUAL_TARGETS.devpro };
const SALES_AGENT_CLUSTERS = Object.freeze({
  Peace: { name: 'Computer Village', targetKey: 'computer-village', members: ['Jessica', 'Towobola', 'Peace', 'Queen'] },
  Queen: { name: 'Computer Village', targetKey: 'computer-village', members: ['Jessica', 'Towobola', 'Peace', 'Queen'] },
  Ifeoma: { name: 'Lawanson Phone Village', targetKey: 'lawanson', members: ['Chile Nwaiwu', 'Ifeoma'] },
});
const SOLO_GROWTH_PARTNER_CLUSTERS = Object.freeze({
  Mohammed: 'unilag-akoka',
  Sarah: 'abule-egba-sango',
  Esther: 'ikorodu',
});

function belongsTo(row, name) {
  return rowAgent(row)?.id === agentId(name);
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
  const hasAssignedAgent = Boolean(portfolio?.agent);
  const soloClusterTarget = AUGUST_2026_CLUSTER_TARGETS[SOLO_GROWTH_PARTNER_CLUSTERS[portfolio?.name]];
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
      <PageIntro eyebrow={portfolio?.territory || 'Assigned territory'} title={`${portfolio?.name || 'Growth Partner'} territory workspace`} copy={hasAssignedAgent ? `Supervise ${agent}, monitor territory execution and keep personal performance separate from team sales.` : `Monitor your personal performance and ${portfolio?.territory || 'assigned cluster'} results.`} badge={hasAssignedAgent ? 'Growth Partner / Supervisor' : 'Growth Partner access'} />
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
        {hasAssignedAgent ? <section className="role-panel">
          <div className="role-panel-head"><div><h2>{agent} · territory contribution</h2><p>Agent sales give territory credit, not personal incentive</p></div></div>
          <div className="territory-sales"><div><span>DEVFIN</span><strong>{agentDevfin}</strong></div><div><span>DEVPRO</span><strong>{agentDevpro}</strong></div></div>
          <div className="scope-note">This role can view only its assigned territory, Sales Agent, attendance summaries, store coverage and exception recommendations.</div>
        </section> : soloClusterTarget ? <section className="role-panel">
          <div className="role-panel-head"><div><h2>{portfolio?.territory} cluster target versus actual</h2><p>August cluster responsibility</p></div><strong className="panel-stat">{personalDevfin + personalDevpro} sales</strong></div>
          <PerformanceLine label="Cluster DEVFIN" actual={personalDevfin} target={soloClusterTarget.devfin} />
          <PerformanceLine label="Cluster DEVPRO" actual={personalDevpro} target={soloClusterTarget.devpro} />
        </section> : null}
      </div>
      {hasAssignedAgent && <SupervisorStoreAccess supervisorName={portfolio?.name} agentName={agent} territory={portfolio?.territory} />}
      {hasAssignedAgent && <SupervisorSalesOverview supervisorName={portfolio?.name} agentName={agent} territory={portfolio?.territory} />}
      {hasAssignedAgent && <AgentPerformanceDetail agentName={agent} compact />}
    </div>
  );
}

function SalesAgentHome() {
  const { profile } = useAuth();
  const { scopedRaw: raw, raw: organisationRaw } = useData();
  const portfolio = profile.portfolio;
  const name = portfolio?.name || 'Sales Agent';
  const dailyRows = raw.daily.filter((row) => belongsTo(row, name) && isCurrentMtd(row));
  const devfin = raw.devfin.filter((row) => belongsTo(row, name) && isCurrentMtd(row)).length;
  const devpro = raw.devpro.filter((row) => belongsTo(row, name) && isCurrentMtd(row)).length;
  const storesOnboarded = raw.onboarding.filter((row) => belongsTo(row, name) && isCurrentMtd(row)).length;
  const cluster = SALES_AGENT_CLUSTERS[name];
  const clusterTarget = cluster ? AUGUST_2026_CLUSTER_TARGETS[cluster.targetKey] : null;
  const clusterOwns = (row) => cluster?.members.some((member) => belongsTo(row, member));
  const clusterDevfin = cluster ? organisationRaw.devfin.filter((row) => clusterOwns(row) && isCurrentMtd(row)).length : 0;
  const clusterDevpro = cluster ? organisationRaw.devpro.filter((row) => clusterOwns(row) && isCurrentMtd(row)).length : 0;
  const clusterContributions = cluster?.members.map((member) => ({
    name: member,
    devfin: organisationRaw.devfin.filter((row) => belongsTo(row, member) && isCurrentMtd(row)).length,
    devpro: organisationRaw.devpro.filter((row) => belongsTo(row, member) && isCurrentMtd(row)).length,
  })) || [];
  const today = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(new Date());

  return (
    <div>
      <PageIntro eyebrow={today} title={`${name}'s field workspace`} copy="Your personal attendance, stores onboarded, sales targets and verified performance activity." badge="Sales Agent · personal access" />
      <GrowthPartnerAttendance name={name === 'Sales Agent' ? 'Peace' : name} roleLabel="Sales Agent" />
      <div className="role-metrics three">
        <Metric label="Stores onboarded MTD" value={`${storesOnboarded}/${AUGUST_2026_INDIVIDUAL_TARGETS.onboarding}`} note={`${Math.max(AUGUST_2026_INDIVIDUAL_TARGETS.onboarding - storesOnboarded, 0)} remaining`} tone="green" />
        <Metric label="DEVFIN MTD" value={`${devfin}/${AUGUST_2026_INDIVIDUAL_TARGETS.devfin}`} note={`${Math.max(AUGUST_2026_INDIVIDUAL_TARGETS.devfin - devfin, 0)} remaining`} tone="amber" />
        <Metric label="DEVPRO MTD" value={`${devpro}/${AUGUST_2026_INDIVIDUAL_TARGETS.devpro}`} note={`${Math.max(AUGUST_2026_INDIVIDUAL_TARGETS.devpro - devpro, 0)} remaining`} tone="purple" />
      </div>
      {clusterTarget && <section className="role-panel">
        <div className="role-panel-head"><div><h2>Cluster target versus actual</h2><p>{cluster.name} · aggregate MTD performance only</p></div><strong className="panel-stat">{clusterDevfin + clusterDevpro} sales</strong></div>
        <PerformanceLine label="Cluster DEVFIN" actual={clusterDevfin} target={clusterTarget.devfin} />
        <PerformanceLine label="Cluster DEVPRO" actual={clusterDevpro} target={clusterTarget.devpro} />
        <div className="role-table-wrap"><table><thead><tr><th>Cluster member</th><th>DEVFIN contribution</th><th>DEVPRO contribution</th><th>Total contribution</th></tr></thead><tbody>
          {clusterContributions.map((member) => <tr key={member.name}><td><strong>{member.name}</strong>{member.name === name && <small className="role-row-label">You</small>}</td><td>{member.devfin}</td><td>{member.devpro}</td><td><strong>{member.devfin + member.devpro}</strong></td></tr>)}
          <tr><td><strong>{cluster.name} combined actual</strong></td><td><strong>{clusterDevfin}/{clusterTarget.devfin}</strong></td><td><strong>{clusterDevpro}/{clusterTarget.devpro}</strong></td><td><strong>{clusterDevfin + clusterDevpro}</strong></td></tr>
        </tbody></table></div>
        <div className="scope-note">Combined cluster performance includes every listed Growth Partner and Sales Agent. Transaction-level records remain private to the individual owner.</div>
      </section>}
      <AssignedStoreList agentName={name} title="My assigned stores" />
      <AgentPerformanceDetail agentName={name === 'Sales Agent' ? 'Peace' : name} compact targets={{ engagements: AUGUST_2026_INDIVIDUAL_TARGETS.onboarding, devfin: AUGUST_2026_INDIVIDUAL_TARGETS.devfin, devpro: AUGUST_2026_INDIVIDUAL_TARGETS.devpro }} />
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
