import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import InsightCard from '../components/ui/InsightCard';
import { formatDate, sumField, uniq } from '../utils/dataUtils';

const THEME_DEFS = [
  {
    id: 'hierarchy',
    type: 'wn',
    icon: '🧭',
    tag: 'Hierarchical QR Ownership',
    title: 'Managers want a QR structure they can cascade to agents',
    keywords: ['hierarchical qr', 'manager', 'assign unique qr', 'generate or assign unique qr', 'under their supervision', 'earn while they sell'],
    recommendation: 'Design manager-controlled QR issuance so store agents can sell under a traceable parent structure.',
  },
  {
    id: 'visibility',
    type: 'po',
    icon: '🔳',
    tag: 'Store Name Visibility',
    title: 'Merchants want QR codes visible and clearly tied to the store',
    keywords: ['store name', 'banner', 'flier', 'visible on a flier', 'qr banner', 'visible', 'business name should be included'],
    recommendation: 'Prioritize QR banners or flyers with store identity attached so merchants do not need to present a phone every time.',
  },
  {
    id: 'network',
    type: 'cr',
    icon: '📡',
    tag: 'Network Stability',
    title: 'Connectivity and response delays are already affecting rollout quality',
    keywords: ['network', 'response time', "didn't respond", 'didnt respond', 'chat', 'glitch', 'poor'],
    recommendation: 'Treat connectivity reliability as a rollout blocker because it is affecting onboarding, QR deployment, and support confidence.',
  },
  {
    id: 'premium',
    type: 'wn',
    icon: '📱',
    tag: 'Premium Device Incentives',
    title: 'Agents want stronger rewards around iPhones and Samsung S-series deals',
    keywords: ['incentive', 'iphone', 'iphones', 'samsung s-series', 'premium device', 'devpro incentives', 'high-value devices'],
    recommendation: 'Review premium-device commission design so high-ticket sales feel worth pushing in the field.',
  },
  {
    id: 'flow',
    type: 'wn',
    icon: '🛠',
    tag: 'Onboarding Flow Friction',
    title: 'The onboarding flow still feels repetitive when account details or corrections are involved',
    keywords: ['account detail', 'account details', 'bank details', 'edit', 'prompt', 'pay trigger'],
    recommendation: 'Reduce repeated prompts and add a simple edit path before submission is finalized.',
  },
];

export default function Insights() {
  const { filtered } = useData();
  const onboarding = filtered.onboarding;
  const daily = filtered.daily;

  const feedbackEntries = useMemo(
    () => buildFeedbackEntries(onboarding, daily),
    [onboarding, daily]
  );

  const totalAcquisitions = onboarding.length;
  const totalVisits = sumField(daily, 'Total Merchants Visited Today');
  const totalBlocked = sumField(daily, "Interested Merchants But Couldn't Enroll");
  const totalEnrolled = sumField(daily, 'Enrolled Merchant');
  const qrYes = onboarding.filter((row) => row['Is Merchant Interested In QR Activation?'] === 'Yes').length;
  const financingYes = onboarding.filter((row) => row['Existing Financing Providers In Store'] === 'Yes').length;
  const interestedReadiness = onboarding.filter((row) => row['Merchant Readiness Level'] === 'Interested').length;
  const activeAgents = uniq([
    ...onboarding.map((row) => row['Field Agent Name']),
    ...daily.map((row) => row['Agent Name']),
  ]);
  const activeZones = uniq([
    ...onboarding.map((row) => row['Assigned Zone']),
    ...daily.map((row) => row['Assigned Zone']),
  ]);

  const zonePulse = activeZones
    .map((zone) => {
      const zoneOnboarding = onboarding.filter((row) => row['Assigned Zone'] === zone);
      const zoneDaily = daily.filter((row) => row['Assigned Zone'] === zone);
      return {
        zone,
        acquisitions: zoneOnboarding.length,
        visits: sumField(zoneDaily, 'Total Merchants Visited Today'),
        enrolled: sumField(zoneDaily, 'Enrolled Merchant'),
        blocked: sumField(zoneDaily, "Interested Merchants But Couldn't Enroll"),
        agents: uniq([
          ...zoneOnboarding.map((row) => row['Field Agent Name']),
          ...zoneDaily.map((row) => row['Agent Name']),
        ]).length,
      };
    })
    .sort((a, b) => b.acquisitions - a.acquisitions || b.visits - a.visits);

  const agentRollups = daily
    .map((row) => {
      const agent = row['Agent Name'] || 'Unknown Agent';
      const acquisitionsByAgent = onboarding.filter((item) => item['Field Agent Name'] === agent).length;
      return {
        agent,
        zone: row['Assigned Zone'] || '-',
        reportDate: formatDate(row['Date'] || row.Timestamp),
        visited: toNumber(row['Total Merchants Visited Today']),
        blocked: toNumber(row["Interested Merchants But Couldn't Enroll"]),
        enrolled: toNumber(row['Enrolled Merchant']),
        acquisitionsByAgent,
        comments: row['Comments On Merchant Visits'] || '',
        recommendation: row['Overall Field Experience Feedbacks/Recommendations'] || '',
      };
    })
    .sort((a, b) => b.enrolled - a.enrolled || b.visited - a.visited);

  const themeHits = THEME_DEFS
    .map((theme) => summarizeTheme(theme, feedbackEntries))
    .filter((theme) => theme.count > 0);

  const topZone = zonePulse[0];
  const rolloutDateLabel = getRolloutDateLabel(onboarding, daily);
  const noteRows = onboarding
    .filter((row) => row['Additional Notes'])
    .map((row) => ({
      agent: row['Field Agent Name'] || 'Unknown Agent',
      zone: row['Assigned Zone'] || '-',
      business: row['Merchant Business Name'] || 'Unnamed Business',
      date: formatDate(row.Timestamp),
      note: row['Additional Notes'] || '',
      readiness: row['Merchant Readiness Level'] || '-',
      qr: row['Is Merchant Interested In QR Activation?'] || '-',
    }));

  const alerts = [];
  if (totalAcquisitions > 0) {
    alerts.push({
      type: 'po',
      icon: '🚀',
      tag: 'Day-One Acquisition Lift',
      text: `${totalAcquisitions} merchants were captured on ${rolloutDateLabel} by ${activeAgents.length} field agent${activeAgents.length !== 1 ? 's' : ''} across ${activeZones.length} active zone${activeZones.length !== 1 ? 's' : ''}.`,
    });
  }
  if (totalVisits > 0) {
    alerts.push({
      type: 'po',
      icon: '🧮',
      tag: 'Visit-To-Enrolment Flow',
      text: `${totalVisits} visits led to ${totalEnrolled} enrolled merchants, with ${totalBlocked} interested merchants not yet converted.`,
    });
  }
  if (qrYes === totalAcquisitions && totalAcquisitions > 0) {
    alerts.push({
      type: 'po',
      icon: '⚡',
      tag: 'Universal QR Interest',
      text: `All ${totalAcquisitions} captured merchants currently show interest in QR activation, which is a strong signal for fast follow-through.`,
    });
  }
  if (financingYes > 0) {
    alerts.push({
      type: 'wn',
      icon: '💳',
      tag: 'Competing Financing Already Present',
      text: `${financingYes} of ${totalAcquisitions} captured stores already have financing options in-store, so Devfin positioning needs to be sharper on the ground.`,
    });
  }
  if (interestedReadiness === totalAcquisitions && totalAcquisitions > 0) {
    alerts.push({
      type: 'wn',
      icon: '⏳',
      tag: 'Pipeline Still In Interested Stage',
      text: `Every captured merchant is still marked Interested, so the next operational push is activation and conversion rather than awareness.`,
    });
  }
  if (topZone) {
    alerts.push({
      type: 'po',
      icon: '📍',
      tag: 'Zone Leading The Rollout',
      text: `${topZone.zone} currently leads with ${topZone.acquisitions} acquisitions and ${topZone.visits} logged visits, making it the clearest early rollout hotspot.`,
    });
  }

  return (
    <div>
      <div className="src-banner">
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: '#1a73e8' }} />
          <span><span className="src-banner-label">Day-One Rollout</span> Insights now combine live merchant acquisitions and daily agent feedback</span>
        </div>
      </div>

      <div className="sec">First-day rollout insights and field intelligence</div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ct">Day-One Snapshot</div>
        <div className="cs">Live summary for {rolloutDateLabel} pulled from both source sheets</div>
        <div style={metricGridStyle}>
          <MetricCard label="Merchants Captured" value={totalAcquisitions} tone="#1a73e8" />
          <MetricCard label="Active Agents" value={activeAgents.length} tone="#188038" />
          <MetricCard label="Zones Activated" value={activeZones.length} tone="#f29900" />
          <MetricCard label="Total Visits" value={totalVisits} tone="#9334e6" />
          <MetricCard label="Enrolled Merchants" value={totalEnrolled} tone="#188038" />
          <MetricCard label="Blocked But Interested" value={totalBlocked} tone="#d93025" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ct">Rollout Readout</div>
        <div className="cs">What the first day is already saying operationally</div>
        <div className="ins-wrap" style={{ marginBottom: 0 }}>
          {alerts.map((alert, index) => (
            <InsightCard key={index} type={alert.type} icon={alert.icon} tag={alert.tag} text={alert.text} />
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ct">Priority Product And Ops Signals</div>
        <div className="cs">Grouped from acquisition notes, daily merchant comments, and day-end agent recommendations</div>
        {themeHits.length > 0 ? (
          <div className="feedback-grid">
            {themeHits.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} />
            ))}
          </div>
        ) : (
          <div style={emptyStyle}>No repeated feedback themes have been detected yet</div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ct">Zone Pulse</div>
        <div className="cs">Where the rollout is concentrating and how each zone is performing so far</div>
        {zonePulse.length > 0 ? (
          <div className="feedback-grid">
            {zonePulse.map((zone) => (
              <ZonePulseCard key={zone.zone} zone={zone} />
            ))}
          </div>
        ) : (
          <div style={emptyStyle}>No zone activity yet</div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ct">Agent Feedback Summary</div>
        <div className="cs">Each daily report is paired with the acquisition output already visible in the merchant sheet</div>
        {agentRollups.length > 0 ? (
          <div className="feedback-grid">
            {agentRollups.map((row, index) => (
              <AgentFeedbackCard key={`${row.agent}-${index}`} row={row} />
            ))}
          </div>
        ) : (
          <div style={emptyStyle}>No daily agent reports yet</div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ct">Acquisition Notes From The Field</div>
        <div className="cs">Store-level nuance captured during onboarding</div>
        {noteRows.length > 0 ? (
          <div className="feedback-grid">
            {noteRows.map((row, index) => (
              <AcquisitionNoteCard key={`${row.business}-${index}`} row={row} />
            ))}
          </div>
        ) : (
          <div style={emptyStyle}>No acquisition notes captured yet</div>
        )}
      </div>

      <div className="footer">Insights - First-day rollout digest - Live acquisitions plus daily agent reports</div>
    </div>
  );
}

function buildFeedbackEntries(onboarding, daily) {
  return [
    ...onboarding
      .filter((row) => row['Additional Notes'])
      .map((row) => ({
        source: 'Acquisition Note',
        agent: row['Field Agent Name'] || 'Unknown Agent',
        zone: row['Assigned Zone'] || '-',
        business: row['Merchant Business Name'] || 'Unnamed Business',
        date: formatDate(row.Timestamp),
        text: row['Additional Notes'] || '',
      })),
    ...daily.flatMap((row) => {
      const base = {
        agent: row['Agent Name'] || 'Unknown Agent',
        zone: row['Assigned Zone'] || '-',
        business: '-',
        date: formatDate(row['Date'] || row.Timestamp),
      };
      return [
        row['Comments On Merchant Visits']
          ? { ...base, source: 'Visit Comment', text: row['Comments On Merchant Visits'] }
          : null,
        row['Overall Field Experience Feedbacks/Recommendations']
          ? { ...base, source: 'Field Recommendation', text: row['Overall Field Experience Feedbacks/Recommendations'] }
          : null,
      ].filter(Boolean);
    }),
  ];
}

function summarizeTheme(theme, entries) {
  const matches = entries.filter((entry) => includesAny(entry.text, theme.keywords));
  return {
    ...theme,
    count: matches.length,
    agents: uniq(matches.map((entry) => entry.agent)),
    zones: uniq(matches.map((entry) => entry.zone)),
    examples: matches.slice(0, 3),
  };
}

function includesAny(text, keywords) {
  const normalized = String(text || '').toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function getRolloutDateLabel(onboarding, daily) {
  const allDates = uniq([
    ...onboarding.map((row) => formatDate(row.Timestamp)),
    ...daily.map((row) => formatDate(row['Date'] || row.Timestamp)),
  ]).filter((value) => value && value !== '-');
  return allDates.length === 1 ? allDates[0] : 'the current filtered rollout window';
}

function toNumber(value) {
  return Number.parseFloat(value) || 0;
}

function MetricCard({ label, value, tone }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: tone }}>
        {value}
      </div>
    </div>
  );
}

function ThemeCard({ theme }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{theme.title}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{theme.tag}</div>
        </div>
        <span style={countPillStyle}>{theme.count} mention{theme.count !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={metaPillStyle}>{theme.agents.length} agent{theme.agents.length !== 1 ? 's' : ''}</span>
        <span style={metaPillStyle}>{theme.zones.length} zone{theme.zones.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text)', marginBottom: 10 }}>
        {theme.recommendation}
      </div>
      {theme.examples.map((example, index) => (
        <div key={`${theme.id}-${index}`} style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.65, marginTop: 6 }}>
          {example.agent} - {example.zone} - {example.source}: {truncate(example.text, 120)}
        </div>
      ))}
    </div>
  );
}

function ZonePulseCard({ zone }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{zone.zone}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={metaPillStyle}>{zone.agents} agent{zone.agents !== 1 ? 's' : ''}</span>
        <span style={metaPillStyle}>{zone.acquisitions} captures</span>
      </div>
      <div style={zoneStatGridStyle}>
        <StatLine label="Visits" value={zone.visits} />
        <StatLine label="Enrolled" value={zone.enrolled} />
        <StatLine label="Blocked" value={zone.blocked} />
      </div>
    </div>
  );
}

function AgentFeedbackCard({ row }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{row.agent}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{row.zone} - {row.reportDate}</div>
        </div>
        <span style={countPillStyle}>{row.acquisitionsByAgent} acquisitions</span>
      </div>
      <div style={zoneStatGridStyle}>
        <StatLine label="Visited" value={row.visited} />
        <StatLine label="Enrolled" value={row.enrolled} />
        <StatLine label="Blocked" value={row.blocked} />
      </div>
      {row.comments && (
        <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.7, color: 'var(--text)' }}>
          <strong>Visit feedback:</strong> {row.comments}
        </div>
      )}
      {row.recommendation && (
        <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.7, color: 'var(--text)' }}>
          <strong>Recommendation:</strong> {row.recommendation}
        </div>
      )}
    </div>
  );
}

function AcquisitionNoteCard({ row }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: '#fff', borderLeft: '4px solid var(--blue)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{row.business}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{row.agent} - {row.zone}</div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', background: '#f1f3f4', padding: '3px 9px', borderRadius: 10 }}>
          {row.date}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={metaPillStyle}>Readiness: {row.readiness}</span>
        <span style={metaPillStyle}>QR: {row.qr}</span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text)' }}>{row.note}</div>
    </div>
  );
}

function StatLine({ label, value }) {
  return (
    <div style={{ background: '#f8f9fa', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  );
}

function truncate(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

const emptyStyle = {
  fontSize: 12,
  color: 'var(--muted)',
  fontStyle: 'italic',
  padding: '14px 0 4px',
};

const metricGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  marginTop: 12,
};

const zoneStatGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
  marginTop: 10,
};

const metaPillStyle = {
  fontSize: 10,
  color: 'var(--muted)',
  background: '#f8f9fa',
  border: '1px solid var(--border)',
  padding: '3px 8px',
  borderRadius: 999,
};

const countPillStyle = {
  fontSize: 11,
  color: '#1557b0',
  background: '#e8f0fe',
  border: '1px solid #d2e3fc',
  padding: '4px 10px',
  borderRadius: 999,
  fontWeight: 600,
};
