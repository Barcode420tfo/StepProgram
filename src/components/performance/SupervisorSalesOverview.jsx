import { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AUGUST_2026_INDIVIDUAL_TARGETS } from '../../config/kpiTargets';

const PERSONAL_TARGETS = { DEVFIN: AUGUST_2026_INDIVIDUAL_TARGETS.devfin, DEVPRO: AUGUST_2026_INDIVIDUAL_TARGETS.devpro };
const AGENT_DAILY_TARGETS = { DEVFIN: 2, DEVPRO: 3 };

function clean(value) { return String(value || '').trim().toLowerCase(); }
function owns(row, name) {
  const expected = clean(name);
  return [row?.['Agent Name'], row?.['Field Agent Name'], row?.['Sale Owner'], row?.['Sales Agent']].some((value) => clean(value) === expected);
}
function parseDate(row) {
  const value = row?.Timestamp || row?.['Transaction Date'] || row?.Date;
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}
function isMtd(row, now = new Date()) {
  const date = parseDate(row);
  return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date <= now;
}
function eligibleWorkingDays(now = new Date()) {
  const finalDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let total = 0;
  for (let day = 1; day <= finalDay; day += 1) if (new Date(now.getFullYear(), now.getMonth(), day).getDay() !== 0) total += 1;
  return total;
}
function metric(actual, target) {
  return { actual, target, remaining: Math.max(target - actual, 0), achievement: target ? Math.round((actual / target) * 100) : 0 };
}

function ProductBlock({ product, personal, agent, supervisorName, agentName }) {
  return <section className={`sales-overview-product ${product.toLowerCase()}`}>
    <div className="sales-product-head"><div><span>{product}</span><small>Independent August target progress</small></div></div>
    <div className="sales-progress-rows">
      <ProgressRow label={`${supervisorName} · Personal`} value={personal} />
      <ProgressRow label={`${agentName} · Sales Agent`} value={agent} />
    </div>
  </section>;
}

function ProgressRow({ label, value, total = false }) {
  return <div className={`sales-progress-row${total ? ' total' : ''}`}><div><span>{label}</span><strong>{value.actual}/{value.target} <small>{value.achievement}%</small></strong></div><div className="sales-progress-track"><i style={{ width: `${Math.min(value.achievement, 100)}%` }} /></div><div className="sales-progress-foot"><span>{value.remaining} remaining</span><span>{value.actual > value.target ? `${value.actual - value.target} above target` : value.achievement >= 100 ? 'Target achieved' : 'In progress'}</span></div></div>;
}

export default function SupervisorSalesOverview({ supervisorName, agentName, territory }) {
  const { raw } = useData();
  const summary = useMemo(() => {
    const workingDays = eligibleWorkingDays();
    const build = (product, rows) => {
      const personalActual = rows.filter((row) => isMtd(row) && owns(row, supervisorName)).length;
      const agentActual = rows.filter((row) => isMtd(row) && owns(row, agentName)).length;
      const personal = metric(personalActual, PERSONAL_TARGETS[product]);
      const agent = metric(agentActual, PERSONAL_TARGETS[product]);
      return { personal, agent };
    };
    return { DEVFIN: build('DEVFIN', raw.devfin), DEVPRO: build('DEVPRO', raw.devpro), workingDays };
  }, [raw.devfin, raw.devpro, supervisorName, agentName]);

  const totalActual = summary.DEVFIN.personal.actual + summary.DEVFIN.agent.actual + summary.DEVPRO.personal.actual + summary.DEVPRO.agent.actual;
  return <section className="role-panel supervisor-sales-overview">
    <div className="role-panel-head"><div><h2>Growth Partner and Sales Agent performance</h2><p>{territory} · Each person has a separate full monthly KPI.</p></div><div className="cluster-overall"><small>Total recorded activity</small><strong>{totalActual}</strong><span>No combined target applied</span></div></div>
    <div className="sales-overview-grid">
      <ProductBlock product="DEVFIN" personal={summary.DEVFIN.personal} agent={summary.DEVFIN.agent} supervisorName={supervisorName} agentName={agentName} />
      <ProductBlock product="DEVPRO" personal={summary.DEVPRO.personal} agent={summary.DEVPRO.agent} supervisorName={supervisorName} agentName={agentName} />
    </div>
    <div className="cluster-method-note">August targets come from the approved STEP KPI workbook. Growth Partner and Sales Agent targets remain independent; cluster targets are intentionally deferred.</div>
  </section>;
}
