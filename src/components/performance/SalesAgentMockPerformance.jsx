const MOCK = {
  Peace: {
    engagements: { actual: 42, target: 260 },
    devfin: { actual: 11, target: 52 },
    devpro: { actual: 16, target: 78 },
    storesVisited: 9,
    assignedStores: 28,
    attendance: { present: 4, late: 1, absent: 1 },
    supervisor: 'Jessica',
    territory: 'Computer Village',
    supervisorDevfin: 7,
    supervisorDevpro: 11,
    supervisorDevfinTarget: 26,
    supervisorDevproTarget: 52,
  },
};

function pct(actual, target) { return target ? Math.round((actual / target) * 100) : 0; }

function PreviewMetric({ label, actual, target, note, tone }) {
  const achievement = pct(actual, target);
  return <div className={`mock-preview-metric ${tone}`}><span>{label}</span><strong>{actual}<small>/{target}</small></strong><div><i style={{ width: `${Math.min(achievement, 100)}%` }} /></div><p>{achievement}% achieved · {Math.max(target - actual, 0)} remaining</p>{note && <em>{note}</em>}</div>;
}

export default function SalesAgentMockPerformance({ agentName = 'Peace' }) {
  const data = MOCK[agentName] || MOCK.Peace;
  const finalSales = Math.min(pct(data.devfin.actual, data.devfin.target), pct(data.devpro.actual, data.devpro.target));
  const category = finalSales >= 80 ? 'A' : finalSales >= 70 ? 'B' : finalSales >= 60 ? 'C' : 'D';
  const clusterDevfin = data.devfin.actual + data.supervisorDevfin;
  const clusterDevpro = data.devpro.actual + data.supervisorDevpro;
  const clusterDevfinTarget = data.devfin.target + data.supervisorDevfinTarget;
  const clusterDevproTarget = data.devpro.target + data.supervisorDevproTarget;

  return <section className="mock-performance-preview">
    <div className="mock-preview-banner"><div><span className="mock-data-badge">Mock data</span><strong>{agentName} · individual and cluster preview</strong><small>Example presentation only — none of these figures affect live reports or incentives.</small></div><span>{data.territory}</span></div>
    <div className="mock-preview-section"><div className="mock-section-head"><div><h2>My individual performance</h2><p>Personal activity, target progress, attendance and store coverage</p></div><div><small>Current category preview</small><strong>{category}</strong><span>{finalSales}% final sales achievement</span></div></div>
      <div className="mock-preview-grid three"><PreviewMetric label="Merchant engagements" actual={data.engagements.actual} target={data.engagements.target} tone="green" /><PreviewMetric label="DEVFIN" actual={data.devfin.actual} target={data.devfin.target} tone="amber" /><PreviewMetric label="DEVPRO" actual={data.devpro.actual} target={data.devpro.target} tone="purple" /></div>
      <div className="mock-support-grid"><div><span>Store coverage</span><strong>{data.storesVisited}/{data.assignedStores}</strong><small>{pct(data.storesVisited, data.assignedStores)}% of assigned stores visited</small></div><div><span>Attendance</span><strong>{data.attendance.present} present</strong><small>{data.attendance.late} late · {data.attendance.absent} absent</small></div><div><span>Estimated allowance</span><strong>₦75,000</strong><small>Category D preview · subject to approval</small></div></div>
    </div>
    <div className="mock-preview-section cluster"><div className="mock-section-head"><div><h2>My cluster performance</h2><p>{agentName} + {data.supervisor} personal sales · {data.territory}</p></div><div><small>Contribution view</small><strong>{clusterDevfin + clusterDevpro}</strong><span>Total cluster sales</span></div></div>
      <div className="mock-cluster-products">
        <div><div className="cluster-product-title"><span>DEVFIN cluster</span><strong>{clusterDevfin}/{clusterDevfinTarget}</strong></div><div className="cluster-split"><span><b>{agentName}</b>{data.devfin.actual}</span><span><b>{data.supervisor}</b>{data.supervisorDevfin}</span><span><b>Achievement</b>{pct(clusterDevfin, clusterDevfinTarget)}%</span></div></div>
        <div><div className="cluster-product-title"><span>DEVPRO cluster</span><strong>{clusterDevpro}/{clusterDevproTarget}</strong></div><div className="cluster-split"><span><b>{agentName}</b>{data.devpro.actual}</span><span><b>{data.supervisor}</b>{data.supervisorDevpro}</span><span><b>Achievement</b>{pct(clusterDevpro, clusterDevproTarget)}%</span></div></div>
      </div>
      <div className="cluster-clarifier">Cluster performance is informational for the Sales Agent. Personal incentives are calculated from the agent’s own verified sales only.</div>
    </div>
  </section>;
}
