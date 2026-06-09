import { Bar } from 'react-chartjs-2';
import { useData } from '../context/DataContext';
import Scorecard from '../components/ui/Scorecard';
import { groupCount, formatDate, uniq } from '../utils/dataUtils';

const PALETTE = ['#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#9334e6', '#00897b', '#e67c13', '#0097a7'];
const GRID = 'rgba(0,0,0,0.05)';
const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

export default function Merchants() {
  const { filtered } = useData();
  const O = filtered.onboarding;

  const total = O.length;
  const qrYes = O.filter((r) => r['Is Merchant Interested In QR Activation?'] === 'Yes').length;
  const financingYes = O.filter((r) => r['Existing Financing Providers In Store'] === 'Yes').length;
  const highTraffic = O.filter((r) => r['Estimated Daily Customer Traffic'] === '50+').length;
  const readyCount = O.filter((r) => r['Merchant Readiness Level'] === 'Active').length;
  const zones = uniq(O.map((r) => r['Assigned Zone']));

  const zoneMap = groupCount(O, 'Assigned Zone');
  const agentMap = groupCount(O, 'Field Agent Name');

  const zoneData = {
    labels: Object.keys(zoneMap).length ? Object.keys(zoneMap) : ['No data'],
    datasets: [{ data: Object.values(zoneMap).length ? Object.values(zoneMap) : [0], backgroundColor: PALETTE, borderRadius: 4, barThickness: 20 }],
  };
  const agentData = {
    labels: Object.keys(agentMap).length ? Object.keys(agentMap) : ['No data'],
    datasets: [{ data: Object.values(agentMap).length ? Object.values(agentMap) : [0], backgroundColor: '#1a73e8', borderRadius: 4, barThickness: 24 }],
  };
  const zoneOpts = {
    ...baseOpts,
    indexAxis: 'y',
    scales: { x: { beginAtZero: true, grid: { color: GRID }, border: { color: 'transparent' } }, y: { grid: { display: false } } },
  };
  const agentOpts = {
    ...baseOpts,
    scales: { x: { grid: { color: GRID }, border: { color: 'transparent' } }, y: { beginAtZero: true, grid: { color: GRID }, border: { color: 'transparent' } } },
  };

  return (
    <div>
      <div className="src-banner">
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: 'var(--blue)' }} />
          <span><span className="src-banner-label">Merchant Acquisition Sheet</span> Each row is a live acquisition record from the source sheet</span>
        </div>
      </div>

      <div className="sec">Merchant acquisition directory — every captured business in the live sheet</div>

      <div className="r g4">
        <Scorecard
          source="Live Sheet"
          colorClass="bl"
          label="Total Acquisitions"
          value={total}
          sub={`${zones.length} zone${zones.length !== 1 ? 's' : ''} covered`}
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="gr"
          label="Want QR Activation"
          value={qrYes}
          sub="Merchants already open to QR follow-up"
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="am"
          label="High-Traffic Stores"
          value={highTraffic}
          sub="Marked 50+ daily customer visits"
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="te"
          label="Financing Present"
          value={financingYes}
          sub={readyCount > 0 ? `${readyCount} currently marked Active` : 'No rows marked Active yet'}
          subType={financingYes > 0 ? 'wn' : 'up'}
        />
      </div>

      <div className="r g2">
        <div className="card">
          <div className="ct">
            Acquisition coverage by zone
            <span className="ds">Live Sheet</span>
          </div>
          <div className="cs">
            Where captured merchants are concentrated geographically
          </div>
          <div className="cw" style={{ height: '190px' }}>
            <Bar data={zoneData} options={zoneOpts} />
          </div>
        </div>
        <div className="card">
          <div className="ct">
            Acquisitions by agent
            <span className="ds">Live Sheet</span>
          </div>
          <div className="cs">
            Which field agents are contributing the most merchant capture records
          </div>
          <div className="cw" style={{ height: '190px' }}>
            <Bar data={agentData} options={agentOpts} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">
          Acquisition directory
          <span className="ds">Live Sheet</span>
        </div>
        <div className="cs">
          Full merchant acquisition log aligned to the current sheet structure
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Date Captured</th>
                <th>Business Name</th>
                <th>Merchant / Attendant</th>
                <th>Contact</th>
                <th>Zone</th>
                <th>Store Type</th>
                <th>Traffic</th>
                <th>Financing Present</th>
                <th>Wants QR</th>
                <th>Readiness</th>
                <th>Acquired By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {O.length ? O.map((r, i) => (
                <tr key={i}>
                  <td>{formatDate(r['Timestamp'])}</td>
                  <td><b>{r['Merchant Business Name'] || '—'}</b></td>
                  <td>
                    <div>{r['Merchant Name'] || '—'}</div>
                    {r['Store Attendant Name'] && (
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Attendant: {r['Store Attendant Name']}</div>
                    )}
                  </td>
                  <td>
                    <div>{r['Phone Number'] || '—'}</div>
                    {r['WhatsApp Number'] && (
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>WhatsApp: {r['WhatsApp Number']}</div>
                    )}
                  </td>
                  <td>{r['Assigned Zone'] || '—'}</td>
                  <td>{r['Type of Store'] || '—'}</td>
                  <td>{r['Estimated Daily Customer Traffic'] || '—'}</td>
                  <td>
                    <span className={`pill ${r['Existing Financing Providers In Store'] === 'Yes' ? 'yes' : 'no'}`}>
                      {r['Existing Financing Providers In Store'] || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${r['Is Merchant Interested In QR Activation?'] === 'Yes' ? 'yes' : 'no'}`}>
                      {r['Is Merchant Interested In QR Activation?'] || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${r['Merchant Readiness Level'] === 'Active' ? 'active' : ''}`}>
                      {r['Merchant Readiness Level'] || '—'}
                    </span>
                  </td>
                  <td>{r['Field Agent Name'] || '—'}</td>
                  <td style={{ fontSize: '11px', color: 'var(--muted)', minWidth: 180, whiteSpace: 'normal' }}>
                    {r['Additional Notes'] || '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--muted)', padding: '20px' }}>
                    No acquisition records match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer">Acquisitions &bull; Merchant acquisition sheet &bull; Live source aligned</div>
    </div>
  );
}
