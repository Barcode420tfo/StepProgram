import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useData } from '../context/DataContext';
import { getAllAssignedStoreRecords } from '../config/storeAllocations';
import { agentId, rowAgent } from '../config/agentIdentity';
import { normalizeStoreKey } from '../config/storeIdentity';
import { AUGUST_2026_CLUSTER_TARGETS, AUGUST_2026_INDIVIDUAL_TARGETS, isAugust2026Range } from '../config/kpiTargets';

const GROWTH_PARTNERS = ['Jessica', 'Towobola', 'Chile Nwaiwu', 'Mohammed', 'Esther', 'Sarah'];
const SALES_AGENTS = ['Peace', 'Queen', 'Ifeoma'];
const CLUSTERS = [
  { id: 'computer-village', name: 'Computer Village', territory: 'Computer Village', supervisors: ['Towobola', 'Jessica'], agents: [], stores: null },
  { id: 'lawanson', name: 'Lawanson', territory: 'Lawanson', supervisors: ['Chile Nwaiwu'], agents: [], stores: null },
  { id: 'ikorodu', name: 'Ikorodu', territory: 'Ikorodu', supervisors: ['Esther'], agents: [], stores: null },
  { id: 'unilag-akoka', name: 'UNILAG / Akoka', territory: 'UNILAG / Akoka', supervisors: ['Mohammed'], agents: [], stores: null },
  { id: 'abule-egba-sango', name: 'Abule Egba–Sango Axis', territory: 'Abule Egba–Sango Axis', supervisors: ['Sarah'], agents: [], stores: null },
  { id: 'alaba', name: 'Alaba', territory: 'Alaba', supervisors: ['Chile Nwaiwu'], agents: [], stores: null },
  { id: 'saka-tinubu', name: 'Saka Tinubu', territory: 'Saka Tinubu', supervisors: ['Babatunde'], agents: [], stores: null },
];
const STORE_ASSIGNMENTS = getAllAssignedStoreRecords();

function clean(value) { return String(value || '').trim().toLowerCase(); }
function owns(row, name) {
  return rowAgent(row)?.id === agentId(name);
}
function parseDate(row) {
  const value = row?.Timestamp || row?.Date || row?.['Transaction Date'];
  const direct = value ? new Date(value) : null;
  return direct && !Number.isNaN(direct.getTime()) ? direct : null;
}
function monthValue(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthName(value) { return new Date(`${value}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); }
function inRange(row, range) {
  const date = parseDate(row);
  if (!date) return false;
  return date >= range.start && date <= range.end;
}
function monthRange(month, mtd = false) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = mtd && year === new Date().getFullYear() && monthNumber - 1 === new Date().getMonth()
    ? new Date()
    : new Date(year, monthNumber, 0, 23, 59, 59, 999);
  return { start, end, label: `${mtd ? 'MTD · ' : ''}${monthName(month)}` };
}
function workingDays(range) {
  let total = 0;
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
  while (cursor <= end) { if (cursor.getDay() !== 0) total += 1; cursor.setDate(cursor.getDate() + 1); }
  return total;
}
function isHistoricalFullMonth(range) {
  const last = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0);
  const currentStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return range.start.getDate() === 1 && range.end.getDate() === last.getDate() && range.end < currentStart;
}
function territoryFor(row) {
  const location = clean(row['Assigned Zone'] || row['Store Location'] || row.Territory || row.Location);
  if (location.includes('lawanson') || location.includes('surulere')) return 'Lawanson Phone Village';
  if (location.includes('computer') || location.includes('ikeja')) return 'Computer Village';
  const owner = clean(row['Agent Name'] || row['Field Agent Name'] || row['Sale Owner']);
  if (['peace', 'queen', 'jessica', 'towobola'].includes(owner)) return 'Computer Village';
  if (['ifeoma', 'chile nwaiwu', 'chilee nwaiwu', 'chile'].includes(owner)) return 'Lawanson Phone Village';
  return 'Other / Unassigned';
}
function clusterFor(row) {
  const location = clean(row['Assigned Zone'] || row['Store Location'] || row.Territory || row.Location);
  if (location.includes('alaba')) return 'alaba';
  if (location.includes('saka tinubu')) return 'saka-tinubu';
  if (location.includes('lawanson') || location.includes('surulere')) return 'lawanson';
  if (location.includes('unilag') || location.includes('akoka')) return 'unilag-akoka';
  if (location.includes('ikorodu')) return 'ikorodu';
  if (location.includes('sango') || location.includes('abule egba')) return 'abule-egba-sango';
  if (location.includes('computer') || location.includes('ikeja')) return 'computer-village';
  const ownerId = rowAgent(row)?.id;
  const direct = CLUSTERS.find((cluster) => [...cluster.supervisors, ...cluster.agents].some((name) => agentId(name) === ownerId));
  if (direct) return direct.id;
  const storeKey = normalizeStoreKey(row._storeName || row['Store Name'] || row['Merchant Business Name'] || row['Merchant Name']);
  if (storeKey) {
    const assignment = STORE_ASSIGNMENTS.find((store) => normalizeStoreKey(store.name) === storeKey);
    if (assignment) return CLUSTERS.find((cluster) => cluster.agents.includes(assignment.assignedAgent))?.id || null;
  }
  return null;
}
function pct(actual, target) { return target ? Math.round((actual / target) * 100) : 0; }
function amount(value) { const parsed = Number(String(value || '').replace(/[^0-9.-]/g, '')); return Number.isFinite(parsed) ? parsed : 0; }
function money(value) { return `₦${Math.round(value || 0).toLocaleString('en-NG')}`; }
function delta(current, previous) { return previous ? Math.round(((current - previous) / previous) * 100) : current ? 100 : 0; }
function sellerName(row) {
  return rowAgent(row)?.name || String(row?.['Agent Name'] || row?.['Field Agent Name'] || row?.['Sale Owner'] || row?.['Sales Agent'] || 'Unattributed').trim();
}
function sellerRole(name) {
  if (SALES_AGENTS.some((agent) => agentId(agent) === agentId(name))) return 'Sales Agent';
  if (GROWTH_PARTNERS.some((agent) => agentId(agent) === agentId(name))) return 'Growth Partner';
  return 'Unassigned';
}

function buildPeriod(raw, range) {
  const onboarding = raw.onboarding.filter((row) => inRange(row, range));
  const devfin = raw.devfin.filter((row) => inRange(row, range));
  const devpro = raw.devpro.filter((row) => inRange(row, range));
  const days = workingDays(range);
  const historicalMonth = isHistoricalFullMonth(range);
  const augustTargets = isAugust2026Range(range);
  const sellerRows = new Map();
  [...devfin.map((row) => ({ row, product: 'devfin' })), ...devpro.map((row) => ({ row, product: 'devpro' }))].forEach(({ row, product }) => {
    const name = sellerName(row);
    const key = agentId(name) || clean(name);
    const current = sellerRows.get(key) || { id: key, name, role: sellerRole(name), devfin: 0, devpro: 0 };
    current[product] += 1;
    sellerRows.set(key, current);
  });
  const sellers = [...sellerRows.values()].sort((a, b) => (b.devfin + b.devpro) - (a.devfin + a.devpro) || a.name.localeCompare(b.name));
  const people = (names, role) => names.map((name) => {
    const personalOnboarding = onboarding.filter((row) => owns(row, name));
    const personalDaily = raw.daily.filter((row) => inRange(row, range) && owns(row, name));
    const personalDevfin = devfin.filter((row) => owns(row, name));
    const personalDevpro = devpro.filter((row) => owns(row, name));
    const capturedEngagements = personalDaily.reduce((sum, row) => sum + amount(row['Customer Engagements'] || row['Total Merchants Visited Today']), 0);
    return {
      id: agentId(name), name, role,
      onboarding: personalOnboarding.length,
      engagements: capturedEngagements || personalOnboarding.length,
      devfin: personalDevfin.length,
      devfinValue: personalDevfin.reduce((sum, row) => sum + amount(row['Device Price'] || row.Value), 0),
      devpro: personalDevpro.length,
      devproValue: personalDevpro.reduce((sum, row) => sum + amount(row.Value || row['Device Price']), 0),
    };
  });
  const clusters = CLUSTERS.map((cluster) => {
    const periodOnboarding = onboarding.filter((row) => clusterFor(row) === cluster.id).length;
    const portfolioStores = raw.onboarding.filter((row) => cluster.supervisors.some((name) => owns(row, name))).length;
    const df = devfin.filter((row) => clusterFor(row) === cluster.id).length;
    const dp = devpro.filter((row) => clusterFor(row) === cluster.id).length;
    const devfinValue = devfin.filter((row) => clusterFor(row) === cluster.id).reduce((sum, row) => sum + amount(row['Device Price'] || row.Value), 0);
    const devproValue = devpro.filter((row) => clusterFor(row) === cluster.id).reduce((sum, row) => sum + amount(row.Value || row['Device Price']), 0);
    const configuredTarget = augustTargets ? AUGUST_2026_CLUSTER_TARGETS[cluster.id] : null;
    const devfinTarget = configuredTarget?.devfin ?? (cluster.supervisors.length * 26 + cluster.agents.length * (historicalMonth ? 26 : days * 2));
    const devproTarget = configuredTarget?.devpro ?? (cluster.supervisors.length * 52 + cluster.agents.length * (historicalMonth ? 52 : days * 3));
    return { ...cluster, stores: portfolioStores, onboarding: periodOnboarding, devfin: df, devpro: dp, devfinValue, devproValue, totalSales: df + dp, devfinTarget, devproTarget, devfinValueTarget: configuredTarget?.devfinValue, devproValueTarget: configuredTarget?.devproValue, score: Math.round((pct(df, devfinTarget) + pct(dp, devproTarget)) / 2) };
  });
  return { onboarding, devfin, devpro, days, clusters, sellers, growthPartners: people(GROWTH_PARTNERS, 'Growth Partner'), salesAgents: people(SALES_AGENTS, 'Sales Agent') };
}

function Delta({ value }) { return <span className={`analytics-delta ${value > 0 ? 'up' : value < 0 ? 'down' : ''}`}>{value > 0 ? '↑' : value < 0 ? '↓' : '—'} {Math.abs(value)}%</span>; }
function Metric({ label, value, note, comparison }) { return <div className="executive-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small>{comparison !== undefined && <Delta value={comparison} />}</div>; }
function Achievement({ actual, target }) { const value = pct(actual, target); return <div className="analytics-achievement"><div><strong>{actual}/{target}</strong><span>{value}%</span></div><div><i style={{ width: `${Math.min(value, 100)}%` }} /></div></div>; }

export default function AdminAnalytics() {
  const { raw } = useData();
  const now = new Date();
  const currentMonth = monthValue(now);
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [mode, setMode] = useState('mtd');
  const [primaryMonth, setPrimaryMonth] = useState(currentMonth);
  const [compareMonth, setCompareMonth] = useState(monthValue(previousDate));
  const [fromDate, setFromDate] = useState(`${currentMonth}-01`);
  const [toDate, setToDate] = useState(now.toISOString().slice(0, 10));
  const [selectedCluster, setSelectedCluster] = useState('all');

  const ranges = useMemo(() => {
    if (mode === 'range') return { primary: { start: new Date(`${fromDate}T00:00:00`), end: new Date(`${toDate}T23:59:59`), label: `${fromDate} → ${toDate}` }, comparison: monthRange(compareMonth) };
    return { primary: monthRange(primaryMonth, mode === 'mtd'), comparison: monthRange(compareMonth) };
  }, [mode, primaryMonth, compareMonth, fromDate, toDate]);
  const primary = useMemo(() => buildPeriod(raw, ranges.primary), [raw, ranges.primary]);
  const comparison = useMemo(() => buildPeriod(raw, ranges.comparison), [raw, ranges.comparison]);
  const compareEnabled = mode === 'compare';
  const visibleClusters = selectedCluster === 'all' ? primary.clusters : primary.clusters.filter((cluster) => cluster.id === selectedCluster);
  const chartData = { labels: visibleClusters.map((item) => item.name), datasets: [
    { label: 'DEVFIN', data: visibleClusters.map((item) => item.devfin), backgroundColor: '#f9ab00', borderRadius: 4 },
    { label: 'DEVPRO', data: visibleClusters.map((item) => item.devpro), backgroundColor: '#9334e6', borderRadius: 4 },
  ] };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 9, boxHeight: 9 } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } };

  return <div>
    <div className="executive-hero"><div><span>Executive analytics · Restricted access</span><h1>STEP performance intelligence</h1><p>Territory, cluster and individual comparisons across Growth Partners and Sales Agents.</p></div><div><small>Active period</small><strong>{ranges.primary.label}</strong><span>{primary.days} eligible working days</span></div></div>
    <div className="analytics-controls"><div className="section-tabs"><button className={mode === 'mtd' ? 'active' : ''} onClick={() => setMode('mtd')}>Month to date</button><button className={mode === 'compare' ? 'active' : ''} onClick={() => setMode('compare')}>Month vs month</button><button className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')}>Date to date</button></div><label>Cluster view<select value={selectedCluster} onChange={(event) => setSelectedCluster(event.target.value)}><option value="all">All clusters</option>{CLUSTERS.map((cluster) => <option value={cluster.id} key={cluster.id}>{cluster.name}</option>)}</select></label>{mode !== 'range' ? <label>Primary month<input type="month" value={primaryMonth} onChange={(event) => setPrimaryMonth(event.target.value)} /></label> : <><label>From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>To<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></>}{mode === 'compare' && <label>Compare with<input type="month" value={compareMonth} onChange={(event) => setCompareMonth(event.target.value)} /></label>}</div>
    <div className="executive-metrics"><Metric label="Active sellers" value={primary.sellers.length} note="People with DEVFIN or DEVPRO sales" comparison={compareEnabled ? delta(primary.sellers.length, comparison.sellers.length) : undefined} /><Metric label="DEVFIN sales" value={primary.devfin.length} note="Fulfilled source rows" comparison={compareEnabled ? delta(primary.devfin.length, comparison.devfin.length) : undefined} /><Metric label="DEVPRO sales" value={primary.devpro.length} note="Completed source rows" comparison={compareEnabled ? delta(primary.devpro.length, comparison.devpro.length) : undefined} /><Metric label="Total sales" value={primary.devfin.length + primary.devpro.length} note={`${primary.devfin.length} DEVFIN · ${primary.devpro.length} DEVPRO`} comparison={compareEnabled ? delta(primary.devfin.length + primary.devpro.length, comparison.devfin.length + comparison.devpro.length) : undefined} /></div>
    <div className="analytics-grid two"><section className="role-panel"><div className="role-panel-head"><div><h2>Cluster performance comparison</h2><p>DEVFIN and DEVPRO sales by KPI cluster for {ranges.primary.label}</p></div></div><div style={{ height: 280 }}><Bar data={chartData} options={chartOptions} /></div></section><section className="role-panel"><div className="role-panel-head"><div><h2>Cluster target ranking</h2><p>Average DEVFIN and DEVPRO count achievement</p></div></div><div className="cluster-ranking">{[...visibleClusters].sort((a,b)=>b.score-a.score).map((cluster,index)=><div key={cluster.id}><span>{index+1}</span><div><strong>{cluster.name}</strong><small>{cluster.supervisors.join(' / ')} · {cluster.totalSales} completed sales</small></div><b>{cluster.score}%</b></div>)}</div></section></div>
    <ClusterKpiTable rows={visibleClusters} />
    <IndividualKpiTable title="Growth Partner monthly KPI" type="gp" rows={primary.growthPartners} compareRows={comparison.growthPartners} compareEnabled={compareEnabled} />
    <IndividualKpiTable title="Sales Agent monthly KPI" type="agent" rows={primary.salesAgents} compareRows={comparison.salesAgents} compareEnabled={compareEnabled} />
    <div className="analytics-method">Executive Workspace access is restricted to the two approved Firebase UIDs. Comparisons use original source timestamps and keep Growth Partner personal results separate from Sales Agent performance.</div>
  </div>;
}

function IndividualKpiTable({ title, type, rows, compareRows, compareEnabled }) {
  const targets = AUGUST_2026_INDIVIDUAL_TARGETS;
  return <section className="role-panel people-analytics"><div className="role-panel-head"><div><h2>{title}</h2><p>Each person carries the complete August target independently. Targets are not combined with another role.</p></div></div><div className="role-table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Store onboarding</th><th>Customer engagements</th><th>DEVFIN count</th><th>DEVFIN value</th><th>DEVPRO count</th><th>DEVPRO value</th>{compareEnabled && <th>Sales change</th>}</tr></thead><tbody>{rows.map((row)=>{const previous=compareRows.find((item)=>item.id===row.id);return <tr key={row.id}><td><strong>{row.name}</strong></td><td><span className={`people-role ${type}`}>{row.role}</span></td><td><Achievement actual={row.onboarding} target={targets.onboarding}/></td><td><Achievement actual={row.engagements} target={targets.engagements}/></td><td><Achievement actual={row.devfin} target={targets.devfin}/></td><td><strong>{money(row.devfinValue)}</strong><small className="role-row-label">of {money(targets.devfinValue)}</small></td><td><Achievement actual={row.devpro} target={targets.devpro}/></td><td><strong>{money(row.devproValue)}</strong><small className="role-row-label">of {money(targets.devproValue)}</small></td>{compareEnabled&&<td><Delta value={delta(row.devfin+row.devpro,(previous?.devfin||0)+(previous?.devpro||0))}/></td>}</tr>})}</tbody></table></div></section>;
}

function ClusterKpiTable({ rows }) {
  return <section className="role-panel people-analytics"><div className="role-panel-head"><div><h2>Cluster target-versus-actual</h2><p>Approved August cluster targets. Store allocation is intentionally excluded pending reassignment.</p></div></div><div className="role-table-wrap"><table><thead><tr><th>Cluster</th><th>Cluster ownership</th><th>DEVFIN count</th><th>DEVFIN value</th><th>DEVPRO count</th><th>DEVPRO value</th><th>Total sales</th></tr></thead><tbody>{rows.map((cluster)=><tr key={cluster.id}><td><strong>{cluster.name}</strong></td><td>{cluster.supervisors.join(' / ')}</td><td><Achievement actual={cluster.devfin} target={cluster.devfinTarget}/></td><td><strong>{money(cluster.devfinValue)}</strong><small className="role-row-label">of {money(cluster.devfinValueTarget)}</small></td><td><Achievement actual={cluster.devpro} target={cluster.devproTarget}/></td><td><strong>{money(cluster.devproValue)}</strong><small className="role-row-label">of {money(cluster.devproValueTarget)}</small></td><td><strong>{cluster.totalSales}</strong></td></tr>)}</tbody></table></div></section>;
}
