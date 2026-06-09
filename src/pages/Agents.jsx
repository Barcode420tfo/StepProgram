import { Bar } from 'react-chartjs-2';
import { useData } from '../context/DataContext';
import Scorecard from '../components/ui/Scorecard';
import { uniq } from '../utils/dataUtils';

const GRID = 'rgba(0,0,0,0.05)';
const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

export default function Agents() {
  const { filtered } = useData();
  const O = filtered.onboarding;

  const allAgents = uniq(O.map((r) => r['Field Agent Name']));
  const agentTotals = allAgents.map((agent) => O.filter((r) => r['Field Agent Name'] === agent).length);
  const qrTotals = allAgents.map((agent) => O.filter((r) => r['Field Agent Name'] === agent && r['Is Merchant Interested In QR Activation?'] === 'Yes').length);
  const financingTotals = allAgents.map((agent) => O.filter((r) => r['Field Agent Name'] === agent && r['Existing Financing Providers In Store'] === 'Yes').length);
  const trafficTotals = allAgents.map((agent) => O.filter((r) => r['Field Agent Name'] === agent && r['Estimated Daily Customer Traffic'] === '50+').length);

  const topAgentIndex = agentTotals.reduce((bestIndex, value, index, arr) => (
    value > (arr[bestIndex] || 0) ? index : bestIndex
  ), 0);
  const topAgent = allAgents[topAgentIndex] || '';
  const topAgentTotal = agentTotals[topAgentIndex] || 0;

  const acquisitionData = {
    labels: allAgents.length ? allAgents : ['No data'],
    datasets: [
      { data: agentTotals.length ? agentTotals : [0], backgroundColor: '#1a73e8', borderRadius: 4, barThickness: 28 },
    ],
  };

  const qualityData = {
    labels: allAgents.length ? allAgents : ['No data'],
    datasets: [
      { label: 'Wants QR', data: qrTotals.length ? qrTotals : [0], backgroundColor: '#34a853', borderRadius: 4, barThickness: 18 },
      { label: 'Financing Present', data: financingTotals.length ? financingTotals : [0], backgroundColor: '#f9ab00', borderRadius: 4, barThickness: 18 },
      { label: '50+ Traffic', data: trafficTotals.length ? trafficTotals : [0], backgroundColor: '#9334e6', borderRadius: 4, barThickness: 18 },
    ],
  };

  const sharedScales = {
    x: { grid: { color: GRID }, border: { color: 'transparent' } },
    y: { beginAtZero: true, grid: { color: GRID }, border: { color: 'transparent' } },
  };
  const barOpts = { ...baseOpts, scales: sharedScales };
  const legendOpts = {
    ...baseOpts,
    scales: sharedScales,
    plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 9, boxHeight: 9, padding: 10 } } },
  };

  return (
    <div>
      <div className="src-banner">
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: 'var(--blue)' }} />
          <span><span className="src-banner-label">Live Acquisition Sheet</span> Agent output is measured from merchant acquisition records only</span>
        </div>
      </div>

      <div className="sec">Agent acquisition performance — who is sourcing the most merchants?</div>

      <div className="r g4">
        <Scorecard
          source="Live Sheet"
          colorClass="bl"
          label="Acquisition Agents"
          value={allAgents.length}
          sub={allAgents.join(' · ') || 'No agent records yet'}
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="gr"
          label="Total Acquisitions"
          value={O.length}
          sub={topAgent ? `${topAgent} leads with ${topAgentTotal}` : 'No acquisition rows yet'}
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="am"
          label="QR-Ready Captures"
          value={qrTotals.reduce((sum, value) => sum + value, 0)}
          sub="Acquired merchants already open to QR activation"
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="pu"
          label="High-Traffic Captures"
          value={trafficTotals.reduce((sum, value) => sum + value, 0)}
          sub="Merchants marked 50+ daily traffic"
          subType="up"
        />
      </div>

      <div className="r g2">
        <div className="card">
          <div className="ct">Acquisitions by agent <span className="ds">Live Sheet</span></div>
          <div className="cs">Straight count of merchant acquisition records captured by each field agent</div>
          <div className="cw" style={{ height: '210px' }}><Bar data={acquisitionData} options={barOpts} /></div>
        </div>
        <div className="card">
          <div className="ct">Acquisition quality signals <span className="ds">Live Sheet</span></div>
          <div className="cs">QR interest, financing presence, and high traffic help compare the strength of each agent's captured merchants</div>
          <div className="cw" style={{ height: '210px' }}><Bar data={qualityData} options={legendOpts} /></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Agent acquisition summary <span className="ds">Live Sheet</span></div>
        <div className="cs">One row per field agent, aligned to the current merchant acquisition sheet</div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Zones Worked</th>
                <th>Total Acquisitions</th>
                <th>Wants QR</th>
                <th>Financing Present</th>
                <th>50+ Traffic</th>
                <th>Notes Logged</th>
              </tr>
            </thead>
            <tbody>
              {allAgents.length ? allAgents.map((agent) => {
                const rows = O.filter((r) => r['Field Agent Name'] === agent);
                const zones = uniq(rows.map((r) => r['Assigned Zone']));
                const notes = rows.filter((r) => r['Additional Notes']).length;
                return (
                  <tr key={agent}>
                    <td><b>{agent}</b></td>
                    <td>{zones.join(' · ') || '—'}</td>
                    <td>{rows.length}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{rows.filter((r) => r['Is Merchant Interested In QR Activation?'] === 'Yes').length}</td>
                    <td style={{ color: '#92400e', fontWeight: 600 }}>{rows.filter((r) => r['Existing Financing Providers In Store'] === 'Yes').length}</td>
                    <td style={{ color: 'var(--purple)', fontWeight: 600 }}>{rows.filter((r) => r['Estimated Daily Customer Traffic'] === '50+').length}</td>
                    <td>{notes}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="7" style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--muted)', padding: '20px' }}>No agents match the current filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer">Agents &bull; Merchant acquisition sheet &bull; Live agent performance</div>
    </div>
  );
}
