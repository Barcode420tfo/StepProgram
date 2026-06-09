import { Bar } from 'react-chartjs-2';
import { useData } from '../context/DataContext';
import Scorecard from '../components/ui/Scorecard';
import ProgressBar from '../components/ui/ProgressBar';
import { formatDate, sumField, uniq } from '../utils/dataUtils';

const GRID = 'rgba(0,0,0,0.05)';
const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

export default function FieldOps() {
  const { filtered } = useData();
  const D = filtered.daily;

  const visits = sumField(D, 'Total Merchants Visited Today');
  const blocked = sumField(D, "Interested Merchants But Couldn't Enroll");
  const enrolled = D.reduce((sum, row) => sum + getEnrolledCount(row), 0);
  const fallbackEnrolled = Math.max(0, visits - blocked);
  const effectiveEnrolled = enrolled > 0 ? enrolled : fallbackEnrolled;
  const blockRate = visits > 0 ? Math.round((blocked / visits) * 100) : 0;
  const agents = uniq(D.map((row) => row['Agent Name']));
  const zones = uniq(D.map((row) => row['Assigned Zone']));
  const feedbackCount = D.filter((row) => row['Overall Field Experience Feedbacks/Recommendations']).length;

  const agentVisitData = {
    labels: agents.length ? agents : ['No data'],
    datasets: [
      { label: 'Visited', data: agents.length ? agents.map((agent) => sumField(D.filter((row) => row['Agent Name'] === agent), 'Total Merchants Visited Today')) : [0], backgroundColor: '#1a73e8', borderRadius: 4, barThickness: 18 },
      { label: 'Blocked', data: agents.length ? agents.map((agent) => sumField(D.filter((row) => row['Agent Name'] === agent), "Interested Merchants But Couldn't Enroll")) : [0], backgroundColor: '#ea4335', borderRadius: 4, barThickness: 18 },
      { label: 'Enrolled', data: agents.length ? agents.map((agent) => D.filter((row) => row['Agent Name'] === agent).reduce((sum, row) => sum + getEnrolledCount(row), 0)) : [0], backgroundColor: '#34a853', borderRadius: 4, barThickness: 18 },
    ],
  };

  const zoneVisitMap = zones.reduce((acc, zone) => {
    acc[zone] = sumField(D.filter((row) => row['Assigned Zone'] === zone), 'Total Merchants Visited Today');
    return acc;
  }, {});

  const zoneVisitData = {
    labels: Object.keys(zoneVisitMap).length ? Object.keys(zoneVisitMap) : ['No data'],
    datasets: [
      { data: Object.keys(zoneVisitMap).length ? Object.values(zoneVisitMap) : [0], backgroundColor: '#9334e6', borderRadius: 4, barThickness: 24 },
    ],
  };

  const sharedScales = {
    x: { grid: { color: GRID }, border: { color: 'transparent' } },
    y: { beginAtZero: true, grid: { color: GRID }, border: { color: 'transparent' } },
  };
  const legendOpts = {
    ...baseOpts,
    scales: sharedScales,
    plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 9, boxHeight: 9, padding: 10 } } },
  };
  const zoneOpts = {
    ...baseOpts,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, grid: { color: GRID }, border: { color: 'transparent' } },
      y: { grid: { display: false } },
    },
  };

  const comments = D.map((row) => (row['Comments On Merchant Visits'] || '').toLowerCase());
  const feedback = D.map((row) => (row['Overall Field Experience Feedbacks/Recommendations'] || '').toLowerCase());
  const networkCount = countRowsWithKeywords(comments, ['network', 'connect']);
  const qrCount = countRowsWithKeywords(comments.concat(feedback), ['qr', 'response']);
  const accountCount = countRowsWithKeywords(comments.concat(feedback), ['account', 'bank details', 'prompt', 'detail']);
  const maxIssueCount = Math.max(networkCount, qrCount, accountCount, 1);

  return (
    <div>
      <div className="src-banner">
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: 'var(--green)' }} />
          <span><span className="src-banner-label">Daily Agent Report Sheet</span> Live merchant visit reports submitted by agents</span>
        </div>
      </div>

      <div className="sec">Daily agent reports — what agents recorded in the field</div>

      <div className="r g5">
        <Scorecard
          source="Daily Sheet"
          colorClass="bl"
          label="Merchant Visits"
          value={visits}
          sub={zones.length ? `Across ${zones.length} zone${zones.length !== 1 ? 's' : ''}` : 'No zones reported yet'}
          subType="up"
        />
        <Scorecard
          source="Daily Sheet"
          colorClass="rd"
          label="Blocked Attempts"
          value={blocked}
          sub={visits > 0 ? `${blockRate}% block rate` : 'No visit rows yet'}
          subType={blocked > 0 ? 'dn' : 'up'}
        />
        <Scorecard
          source="Daily Sheet"
          colorClass="gr"
          label="Enrolled Merchants"
          value={effectiveEnrolled}
          sub={visits > 0 ? `${Math.max(0, 100 - blockRate)}% field conversion` : 'No conversions reported yet'}
          subType="up"
        />
        <Scorecard
          source="Daily Sheet"
          colorClass="te"
          label="Agents Reporting"
          value={agents.length}
          sub={agents.join(' · ') || 'No agent submissions yet'}
          subType="up"
        />
        <Scorecard
          source="Daily Sheet"
          colorClass="pu"
          label="Feedback Logged"
          value={feedbackCount}
          sub="Rows with field recommendations or experience notes"
          subType={feedbackCount > 0 ? 'up' : ''}
        />
      </div>

      <div className="r g2">
        <div className="card">
          <div className="ct">Agent visit performance <span className="ds">Daily Sheet</span></div>
          <div className="cs">Visited, blocked, and enrolled counts by reporting agent</div>
          <div className="cw" style={{ height: '220px' }}><Bar data={agentVisitData} options={legendOpts} /></div>
        </div>
        <div className="card">
          <div className="ct">Visits by zone <span className="ds">Daily Sheet</span></div>
          <div className="cs">Where merchant field activity is concentrated for the selected filters</div>
          <div className="cw" style={{ height: '220px' }}><Bar data={zoneVisitData} options={zoneOpts} /></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Field issue patterns <span className="ds">Daily Sheet</span></div>
        <div className="cs">Keyword signals from merchant visit comments and overall feedback</div>
        <div style={{ marginTop: '12px' }}>
          <ProgressBar label="Network / connectivity mentions" value={networkCount} max={maxIssueCount} color="#ea4335" />
          <ProgressBar label="QR / response speed mentions" value={qrCount} max={maxIssueCount} color="#f9ab00" />
          <ProgressBar label="Account / prompt friction mentions" value={accountCount} max={maxIssueCount} color="#9334e6" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Daily agent report log <span className="ds">Daily Sheet</span></div>
        <div className="cs">One row per live agent report from the source sheet</div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Agent</th>
                <th>Zone</th>
                <th>Visited</th>
                <th>Blocked</th>
                <th>Enrolled</th>
                <th>Block %</th>
                <th>Merchant Visit Comments</th>
                <th>Overall Feedback</th>
              </tr>
            </thead>
            <tbody>
              {D.length ? D.map((row, index) => {
                const visitCount = parseFloat(row['Total Merchants Visited Today']) || 0;
                const blockedCount = parseFloat(row["Interested Merchants But Couldn't Enroll"]) || 0;
                const enrolledCount = getEnrolledCount(row) || Math.max(0, visitCount - blockedCount);
                const rowBlockRate = visitCount > 0 ? Math.round((blockedCount / visitCount) * 100) : 0;
                return (
                  <tr key={index}>
                    <td>{formatDate(row['Date'] || row['Timestamp'])}</td>
                    <td><b>{row['Agent Name'] || '—'}</b></td>
                    <td>{row['Assigned Zone'] || '—'}</td>
                    <td>{visitCount}</td>
                    <td><span className="pill blocked">{blockedCount}</span></td>
                    <td><span className="pill active">{enrolledCount}</span></td>
                    <td style={{ fontWeight: 600, color: rowBlockRate >= 100 ? 'var(--red)' : rowBlockRate > 50 ? 'var(--amber)' : 'var(--green)' }}>
                      {visitCount > 0 ? `${rowBlockRate}%` : '—'}
                    </td>
                    <td style={{ minWidth: 220, whiteSpace: 'normal', fontSize: '11px', color: 'var(--muted)' }}>
                      {row['Comments On Merchant Visits'] || '—'}
                    </td>
                    <td style={{ minWidth: 220, whiteSpace: 'normal', fontSize: '11px', color: 'var(--muted)' }}>
                      {row['Overall Field Experience Feedbacks/Recommendations'] || '—'}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="9" style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--muted)', padding: '20px' }}>No daily agent reports match the current filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer">Daily Reports &bull; Agent field report sheet &bull; Live source aligned</div>
    </div>
  );
}

function getEnrolledCount(row) {
  const explicit = parseFloat(row['Enrolled Merchant']);
  if (!Number.isNaN(explicit)) return explicit;
  return 0;
}

function countRowsWithKeywords(items, keywords) {
  return items.filter((text) => keywords.some((keyword) => text.includes(keyword))).length;
}
