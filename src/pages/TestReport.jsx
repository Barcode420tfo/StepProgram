// DevFin Testing Session — May 17, 2026

const RESPONSES = [
  { name: 'David Jibrin',             role: 'Verification',                    dropoff: 'Verification',             comment: '' },
  { name: 'Muhammed Olabola Sanusi',  role: 'Collection',                      dropoff: 'Credit Check',             comment: '' },
  { name: 'Towobola Nkiru Adefowokan',role: 'Collection Officer',              dropoff: 'OTP Retrieval',            comment: 'Process was smooth until OTP retrieval, which was very slow. Needs improvement to prevent customer drop-out.' },
  { name: 'Dotun Ojediran',           role: 'Collection Agent',                dropoff: 'Mono Telco Verification',  comment: '' },
  { name: 'Ojeile Benedict',          role: 'Verification / Collection',        dropoff: 'After Mono Verification',  comment: '' },
  { name: 'Akinwale Akinyele',        role: 'Collection',                      dropoff: 'Verification Stage',       comment: 'Comparable to similar platforms.' },
  { name: 'Chinyere Peter',           role: 'Collection',                      dropoff: 'After BVN / NIN Entry',    comment: 'Process was fast.' },
  { name: 'Okonkwo Edith',            role: 'Collection',                      dropoff: 'OTP Code',                 comment: 'Failed to receive OTP after three attempts.' },
  { name: 'Kayode Senami Abimbola',   role: 'Mobile Network',                  dropoff: 'Bank Verification',        comment: '' },
  { name: 'Alfred Samson',            role: 'Field Recovery Officer',          dropoff: 'Identity Verification',    comment: '' },
  { name: 'TemiTope',                 role: 'Collections',                     dropoff: 'Transfer',                 comment: '' },
  { name: 'Dennis Esther Chinyere',   role: 'Collection Officer',              dropoff: 'Verification',             comment: 'Interface response time insufficient.' },
  { name: 'Ayodele Olawale',          role: 'Recovery Team Lead Supervisor',   dropoff: 'DOB Confirmation',         comment: 'Potential user-side error from prior NIN data issues.' },
  { name: 'Kunle Feyisitan',          role: 'Product Manager',                 dropoff: 'Credit Assessment Result', comment: '' },
  { name: 'Babatunde',                role: 'Supervisor',                      dropoff: 'Credit Assessment',        comment: 'Primary drop-offs occur during credit assessment following BVN/NIN completion and OTP stages.' },
  { name: 'Olayinka Idowu',           role: 'Retail',                          dropoff: 'Verification Point',       comment: '' },
  { name: 'Lawrence Esther',          role: 'Collection Agent',                dropoff: 'Mobile Network',           comment: 'Status acceptable.' },
];

const FUNNEL_STAGES = [
  {
    stage: 'Verification / Mono',
    count: 7,
    pct: 41,
    color: '#ef4444',
    severity: 'critical',
    responders: ['David Jibrin', 'Dotun Ojediran', 'Ojeile Benedict', 'Akinwale Akinyele', 'Alfred Samson', 'Dennis Esther Chinyere', 'Olayinka Idowu'],
    note: 'Mono telco verification and identity checks are the single largest friction point in the flow.',
  },
  {
    stage: 'Credit Assessment',
    count: 3,
    pct: 18,
    color: '#f97316',
    severity: 'high',
    responders: ['Muhammed Olabola Sanusi', 'Kunle Feyisitan', 'Babatunde'],
    note: 'Users stall after clearing BVN/NIN. Assessment result feedback is unclear, leaving users uncertain.',
  },
  {
    stage: 'OTP Delivery',
    count: 2,
    pct: 12,
    color: '#f59e0b',
    severity: 'high',
    responders: ['Towobola Nkiru Adefowokan', 'Okonkwo Edith'],
    note: 'OTP delivery is slow or fails entirely — confirmed hard stop where users cannot retry and are lost.',
  },
  {
    stage: 'Mobile Network',
    count: 2,
    pct: 12,
    color: '#8b5cf6',
    severity: 'medium',
    responders: ['Kayode Senami Abimbola', 'Lawrence Esther'],
    note: 'Network-related verification failures, likely tied to Mono telco integration on weak connections.',
  },
  {
    stage: 'BVN / NIN Entry',
    count: 1,
    pct: 6,
    color: '#3b82f6',
    severity: 'medium',
    responders: ['Chinyere Peter'],
    note: 'One early-stage drop-off; the same respondent noted the process was fast, suggesting a brief hiccup.',
  },
  {
    stage: 'DOB Confirmation',
    count: 1,
    pct: 6,
    color: '#6b7280',
    severity: 'low',
    responders: ['Ayodele Olawale'],
    note: 'Likely pre-existing NIN data mismatch — not a platform bug, but worth a validation prompt.',
  },
  {
    stage: 'Transfer',
    count: 1,
    pct: 6,
    color: '#6b7280',
    severity: 'low',
    responders: ['TemiTope'],
    note: 'Single drop-off at transfer stage. Needs further investigation to determine root cause.',
  },
];

const INSIGHTS = [
  {
    priority: 1,
    type: 'critical',
    icon: '🚨',
    title: 'OTP delivery is a hard blocker',
    detail: '2 respondents explicitly reported OTP failures — one exhausted all 3 attempts with no delivery. A user stuck here cannot self-recover. This needs urgent remediation: faster SMS routing, a retry counter UI, or a fallback delivery channel.',
  },
  {
    priority: 2,
    type: 'critical',
    icon: '🔗',
    title: 'Mono integration is unreliable under test conditions',
    detail: '41% of respondents dropped off at Mono-related verification steps (telco verification, identity check). The Supervisor explicitly called out credit assessment as the primary drop-off zone post-Mono. Validate Mono API uptime, timeout thresholds, and error-handling UX.',
  },
  {
    priority: 3,
    type: 'high',
    icon: '📊',
    title: 'Credit assessment gives no feedback on failure',
    detail: '3 respondents (including the Product Manager and Supervisor) dropped off at credit assessment. Users are completing BVN/NIN and OTP but stalling on the result screen. Likely a UX gap — no loading state, no partial success message, or silent failure.',
  },
  {
    priority: 4,
    type: 'medium',
    icon: '📶',
    title: 'Mobile network conditions amplify Mono failures',
    detail: 'Two respondents flagged mobile network as their context. Mono telco calls may be timing out on weaker connections. Consider adding progressive retries, a connection quality check before verification, or offline-tolerant caching.',
  },
  {
    priority: 5,
    type: 'gap',
    icon: '🧩',
    title: 'No mid-flow save state — users who drop off lose progress',
    detail: 'Every drop-off is a complete restart. Adding a session checkpoint (e.g. saving verified BVN/NIN so users don\'t re-enter) would materially reduce re-entry friction and protect against OTP / network failures.',
  },
  {
    priority: 6,
    type: 'positive',
    icon: '✅',
    title: 'Early onboarding flow (BVN/NIN entry) is working',
    detail: 'Chinyere Peter noted "process was fast" — the initial data entry stage is not the problem. Most drop-offs happen in the verification and decision layers that follow, which narrows the scope for remediation.',
  },
];

const SEVERITY_COLOR = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  gap:      '#8b5cf6',
  positive: '#22c55e',
  low:      '#6b7280',
};

const SEVERITY_LABEL = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  gap:      'Gap',
  positive: 'Positive',
  low:      'Low',
};

export default function TestReport() {
  const total     = RESPONSES.length;
  const withNotes = RESPONSES.filter(r => r.comment).length;
  const stages    = FUNNEL_STAGES.length;

  return (
    <div>
      <div className="sec">DevFin Testing — UAT Feedback Report</div>

      {/* ── Meta banner ── */}
      <div className="card" style={{ marginBottom: '12px', background: 'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%)', border: '1px solid #bbf7d0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          <span style={badgeStyle('#16a34a', '#f0fdf4')}>UAT Session</span>
          <span style={badgeStyle('#2563eb', '#eff6ff')}>May 17, 2026</span>
          <span style={badgeStyle('#7c3aed', '#f5f3ff')}>Pre-launch Testing</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.7' }}>
          Feedback collected from <strong>{total} DevFin staff members</strong> across collection, verification, recovery, and product roles during a structured UAT session held before lunch. Respondents tested the end-to-end customer onboarding flow and recorded the point at which they experienced a drop-off or friction.
        </div>
      </div>

      {/* ── Scorecards ── */}
      <div className="metrics-grid" style={{ marginBottom: '12px' }}>
        <Stat value={total}       label="Total Respondents"     color="#2563eb" />
        <Stat value="7"           label="Drop-off Stages"       color="#ef4444" />
        <Stat value={withNotes}   label="Qualitative Comments"  color="#7c3aed" />
        <Stat value="41%"         label="Verification Drop-off" color="#f97316" />
      </div>

      {/* ── Funnel breakdown ── */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Drop-off Funnel — Where Users Got Stuck</div>
        <div className="cs">Ranked by frequency · {total} respondents total</div>
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FUNNEL_STAGES.map((s) => (
            <FunnelRow key={s.stage} stage={s} />
          ))}
        </div>
      </div>

      {/* ── Insights ── */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Pain-point Analysis &amp; Recommendations</div>
        <div className="cs">Derived from pattern analysis of all {total} responses</div>
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {INSIGHTS.map((ins) => (
            <InsightRow key={ins.priority} ins={ins} />
          ))}
        </div>
      </div>

      {/* ── Individual responses ── */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Individual Responses</div>
        <div className="cs">{total} submissions · {withNotes} with written comments</div>
        <div className="feedback-grid" style={{ marginTop: '14px' }}>
          {RESPONSES.map((r, i) => (
            <ResponseCard key={i} r={r} />
          ))}
        </div>
      </div>

      <div className="footer">DevFin UAT Report · STEP Network Live Ops · Session: May 17, 2026</div>
    </div>
  );
}

function Stat({ value, label, color }) {
  return (
    <div className="metric-card">
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function FunnelRow({ stage: s }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{s.stage}</span>
          <span style={badgeStyle(s.color, s.color + '18')}>{SEVERITY_LABEL[s.severity]}</span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>
          {s.count} / {17} &nbsp;({s.pct}%)
        </span>
      </div>
      <div style={{ height: '6px', background: 'var(--border2)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: '4px', transition: 'width .3s' }} />
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>{s.note}</div>
    </div>
  );
}

function InsightRow({ ins }) {
  const color = SEVERITY_COLOR[ins.type];
  return (
    <div style={{ borderRadius: '8px', border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`, padding: '12px 14px', background: `${color}08` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{ins.icon}</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{ins.title}</span>
            <span style={badgeStyle(color, color + '18')}>{SEVERITY_LABEL[ins.type]}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.65' }}>{ins.detail}</div>
        </div>
      </div>
    </div>
  );
}

function ResponseCard({ r }) {
  const initials = r.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hasComment = !!r.comment;

  const sentiment = r.comment
    ? r.comment.toLowerCase().includes('fail') || r.comment.toLowerCase().includes('slow') || r.comment.toLowerCase().includes('insufficient')
      ? 'negative'
      : r.comment.toLowerCase().includes('fast') || r.comment.toLowerCase().includes('acceptable') || r.comment.toLowerCase().includes('comparable')
        ? 'positive'
        : 'neutral'
    : 'none';

  const sentimentColor = { negative: '#ef4444', positive: '#22c55e', neutral: '#6b7280', none: 'var(--blue)' };
  const borderColor = sentimentColor[sentiment];

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', borderLeft: `4px solid ${borderColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: hasComment ? '10px' : 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--blue-lt)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{r.role || 'Staff'}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '2px' }}>Dropped off at</div>
          <span style={{ fontSize: '11px', background: '#f1f3f4', padding: '3px 9px', borderRadius: '10px', color: 'var(--text)', fontWeight: 600 }}>
            {r.dropoff}
          </span>
        </div>
      </div>
      {hasComment && (
        <div style={{ borderTop: '1px solid var(--border2)', paddingTop: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: borderColor, marginBottom: '4px' }}>
            💬 Comment
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.65', color: 'var(--text)', fontStyle: 'italic' }}>"{r.comment}"</div>
        </div>
      )}
    </div>
  );
}

function badgeStyle(color, bg) {
  return {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    color,
    background: bg,
    padding: '2px 8px',
    borderRadius: '10px',
    border: `1px solid ${color}40`,
    whiteSpace: 'nowrap',
  };
}
