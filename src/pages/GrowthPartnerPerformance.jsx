import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import AgentPerformanceDetail from '../components/performance/AgentPerformanceDetail';
import SupervisorStoreAccess from '../components/performance/SupervisorStoreAccess';
import SupervisorSalesOverview from '../components/performance/SupervisorSalesOverview';
import { agentId, rowAgent } from '../config/agentIdentity';
import { AUGUST_2026_INDIVIDUAL_TARGETS } from '../config/kpiTargets';
import GrowthPartnerAttendance from '../components/performance/GrowthPartnerAttendance';

function owns(row, name) {
  return rowAgent(row)?.id === agentId(name);
}
function isCurrentMtd(row) {
  const value = row?.Timestamp || row?.Date || row?.['Transaction Date'];
  const date = value ? new Date(value) : null;
  const now = new Date();
  return date && !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date <= now;
}

export default function GrowthPartnerPerformance() {
  const { profile } = useAuth();
  const { raw } = useData();
  const portfolio = profile.portfolio;
  const personalName = portfolio?.name;
  const personalStores = raw.onboarding.filter((row) => owns(row, personalName) && isCurrentMtd(row)).length;
  const personalDevfin = raw.devfin.filter((row) => owns(row, personalName) && isCurrentMtd(row)).length;
  const personalDevpro = raw.devpro.filter((row) => owns(row, personalName) && isCurrentMtd(row)).length;
  const incentive = personalStores * 3000 + (personalDevfin + personalDevpro) * 500;

  return <div>
    <div className="role-hero"><div><div className="role-eyebrow">Performance preview</div><h1>{personalName || 'Growth Partner'} scorecard</h1><p>Personal obligations, incentive estimate, territory supervision and assigned Sales Agent performance.</p></div><span className="role-badge">{portfolio?.territory || 'No territory assigned'}</span></div>
    <GrowthPartnerAttendance name={personalName} />
    <div className="role-metrics four">
      <div className="role-metric green"><div className="role-metric-label">Personal stores</div><div className="role-metric-value">{personalStores}/{AUGUST_2026_INDIVIDUAL_TARGETS.onboarding}</div><div className="role-metric-note">August original onboarding credit</div></div>
      <div className="role-metric amber"><div className="role-metric-label">Personal DEVFIN</div><div className="role-metric-value">{personalDevfin}/{AUGUST_2026_INDIVIDUAL_TARGETS.devfin}</div><div className="role-metric-note">August direct sales only</div></div>
      <div className="role-metric purple"><div className="role-metric-label">Personal DEVPRO</div><div className="role-metric-value">{personalDevpro}/{AUGUST_2026_INDIVIDUAL_TARGETS.devpro}</div><div className="role-metric-note">August direct sales only</div></div>
      <div className="role-metric"><div className="role-metric-label">Estimated incentive</div><div className="role-metric-value">₦{incentive.toLocaleString()}</div><div className="role-metric-note">Subject to final verification</div></div>
    </div>
    {portfolio?.agent && <SupervisorSalesOverview supervisorName={portfolio.name} agentName={portfolio.agent} territory={portfolio.territory} />}
    <SupervisorStoreAccess supervisorName={portfolio?.name} agentName={portfolio?.agent} territory={portfolio?.territory} />
    {portfolio?.agent ? <AgentPerformanceDetail agentName={portfolio.agent} compact /> : <div className="scope-note">No supervised Sales Agent is assigned. This account still retains full access to every store it originally onboarded.</div>}
  </div>;
}
