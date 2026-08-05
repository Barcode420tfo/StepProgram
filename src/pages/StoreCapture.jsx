import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import AgentPerformanceDetail from '../components/performance/AgentPerformanceDetail';
import { SALES_AGENT_PORTFOLIOS } from '../config/accessControl';

const DRAFT_KEY = 'step-store-capture-draft';

const INIT_FORM = {
  merchantBusinessName: '',
  merchantName: '',
  storeAttendantName: '',
  phoneNumber: '',
  whatsappNumber: '',
  storeAddress: '',
  assignedZone: '',
  storeType: '',
  trafficBand: '',
  financingPresent: '',
  photoUrl: '',
  qrInterest: '',
  readiness: '',
  notes: '',
  fieldAgentName: '',
};

export default function StoreCapture() {
  const { user } = useAuth();
  const { filterOptions, refresh } = useData();
  const [form, setForm] = useState(INIT_FORM);
  const [configured, setConfigured] = useState(true);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: '', message: '' });
  const [view, setView] = useState('performance');
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        setForm((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    let cancelled = false;
    async function checkSetup() {
      setCheckingSetup(true);
      try {
        const res = await fetch('/.netlify/functions/store-capture');
        const data = await res.json();
        if (!cancelled) setConfigured(data.configured !== false);
      } catch {
        if (!cancelled) setConfigured(false);
      }
      if (!cancelled) setCheckingSetup(false);
    }
    checkSetup();
    return () => { cancelled = true; };
  }, []);

  const zoneSuggestions = filterOptions.zones || [];
  const agentSuggestions = useMemo(() => {
    const known = filterOptions.agents || [];
    const accountName = user?.displayName?.trim();
    if (accountName && !known.includes(accountName)) return [...known, accountName];
    return known;
  }, [filterOptions.agents, user]);

  const canSubmit = requiredFieldsFilled(form) && !submitting;
  const canAttemptSubmit = canSubmit && !checkingSetup;

  const performanceAgents = useMemo(() => {
    const allocated = SALES_AGENT_PORTFOLIOS.map((item) => item.name);
    const live = filterOptions.agents || [];
    return [...new Set([...allocated, ...live].filter(Boolean))];
  }, [filterOptions.agents]);

  const onChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const fillWhatsapp = () => {
    setForm((prev) => ({ ...prev, whatsappNumber: prev.phoneNumber }));
  };

  const clearDraft = () => {
    setForm(INIT_FORM);
    localStorage.removeItem(DRAFT_KEY);
    setSubmitState({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitState({ type: '', message: '' });
    if (!requiredFieldsFilled(form)) {
      setSubmitState({ type: 'err', message: 'Please complete the required store information before submitting.' });
      return;
    }
    if (!configured) {
      setSubmitState({
        type: 'err',
        message: 'The form is ready, but the live submission endpoint is not connected yet. Your draft is still saved in this browser.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        'Who Are You Onboarding?': 'Merchant',
        'Merchant Business Name': form.merchantBusinessName,
        'Merchant Name': form.merchantName,
        'Store Attendant Name': form.storeAttendantName,
        'Phone Number': form.phoneNumber,
        'WhatsApp Number': form.whatsappNumber,
        'Store Address': form.storeAddress,
        'Assigned Zone': form.assignedZone,
        'Type of Store': form.storeType,
        'Estimated Daily Customer Traffic': form.trafficBand,
        'Existing Financing Providers In Store': form.financingPresent,
        'Upload Store Photo': form.photoUrl,
        'Is Merchant Interested In QR Activation?': form.qrInterest,
        'Merchant Readiness Level': form.readiness,
        'Additional Notes': form.notes,
        'Field Agent Name': form.fieldAgentName,
        'Captured By User': user?.displayName || user?.email || '',
      };

      const res = await fetch('/.netlify/functions/store-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Store submission failed.');
      }

      setSubmitState({ type: 'ok', message: 'Store information submitted successfully. The dashboard will refresh with the new entry.' });
      clearDraft();
      await refresh();
    } catch (err) {
      setSubmitState({ type: 'err', message: err.message || 'Could not submit the store information.' });
    }
    setSubmitting(false);
  };

  if (checkingSetup) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: '0 auto', marginTop: 8 }}>
        <div className="ct">Store Capture</div>
        <div className="cs">Loading the store capture form…</div>
      </div>
    );
  }

  if (view === 'performance') {
    return (
      <div>
        <StoreCaptureTabs view={view} onChange={setView} />
        <div className="role-hero compact">
          <div><div className="role-eyebrow">Admin drill-down</div><h1>Agent performance analysis</h1><p>Select an agent to review month-to-date engagements, DEVFIN, DEVPRO, store allocation, attendance activity and supervisor ownership.</p></div>
          <span className="role-badge">{performanceAgents.length} agents</span>
        </div>
        <div className="agent-picker-grid">
          {performanceAgents.map((agent) => {
            const allocation = SALES_AGENT_PORTFOLIOS.find((item) => item.name.toLowerCase() === agent.toLowerCase());
            return <button key={agent} className={`agent-picker${selectedAgent === agent ? ' active' : ''}`} onClick={() => setSelectedAgent(agent)}>
              <span className="agent-avatar">{agent.slice(0, 1).toUpperCase()}</span>
              <span><strong>{agent}</strong><small>{allocation ? `${allocation.territory} · ${allocation.stores} stores` : 'Live sheet contributor'}</small><em>{allocation ? `Supervisor: ${allocation.supervisor}` : 'Supervisor not assigned'}</em></span>
              <b>View →</b>
            </button>;
          })}
        </div>
        {selectedAgent ? <AgentPerformanceDetail agentName={selectedAgent} onClose={() => setSelectedAgent(null)} /> : <div className="agent-select-prompt"><span>↑</span><strong>Select an agent to open their performance record</strong><small>The profile combines all four live sheets without duplicating transactions.</small></div>}
      </div>
    );
  }

  return (
    <div>
      <StoreCaptureTabs view={view} onChange={setView} />
      <div className="src-banner">
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: configured ? '#1a73e8' : '#f59e0b' }} />
          <span>
            <span className="src-banner-label">Store Capture</span>
            {' '}
            {configured
              ? 'Guided merchant entry form with draft-saving and server-side submission'
              : 'Guided merchant entry form is ready. Connect the submission endpoint to push entries live.'}
          </span>
        </div>
      </div>

      <div className="sec">Store capture — add a new merchant smoothly from the dashboard</div>

      {!configured && (
        <div className="card" style={{ marginBottom: 12, borderColor: '#f59e0b', background: '#fffaf0' }}>
          <div className="ct">Submission setup still needed</div>
          <div className="cs">You can fill the form normally and the draft will keep saving here, but live submission will only work after the endpoint is connected.</div>
          <pre style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', fontSize: 11, lineHeight: 1.8, overflowX: 'auto', marginTop: 12 }}>
{`STORE_CAPTURE_WEBHOOK_URL=https://your-webhook-endpoint
STORE_CAPTURE_WEBHOOK_SECRET=optional_shared_secret`}
          </pre>
        </div>
      )}

      {submitState.message && (
        <div className={`status ${submitState.type}`} style={{ marginBottom: 12 }}>
          {submitState.type === 'ok' ? '✓ ' : '⚠ '}
          {submitState.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ct">Store identity</div>
          <div className="cs">Core merchant details first, so the form feels fast and manageable</div>
          <div className="r g2" style={{ marginTop: 12 }}>
            <Field label="Business Name *" value={form.merchantBusinessName} onChange={onChange('merchantBusinessName')} placeholder="Great Favour Multi Resources" />
            <Field label="Merchant Name *" value={form.merchantName} onChange={onChange('merchantName')} placeholder="Ohanyere Esther Ugochi" />
            <Field label="Store Attendant Name" value={form.storeAttendantName} onChange={onChange('storeAttendantName')} placeholder="Esther Ohanyere" />
            <Field label="Field Agent Name *" value={form.fieldAgentName} onChange={onChange('fieldAgentName')} placeholder="Chilee nwaiwu" listId="store-capture-agents" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ct">Contact and location</div>
          <div className="cs">Everything needed to find and follow up with the store later</div>
          <div className="r g2" style={{ marginTop: 12 }}>
            <Field label="Phone Number *" value={form.phoneNumber} onChange={onChange('phoneNumber')} placeholder="08061227616" />
            <div>
              <label className="auth-label">WhatsApp Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="auth-input" value={form.whatsappNumber} onChange={onChange('whatsappNumber')} placeholder="09059020812" />
                <button type="button" className="clear-btn" onClick={fillWhatsapp}>Use phone</button>
              </div>
            </div>
            <Field label="Assigned Zone *" value={form.assignedZone} onChange={onChange('assignedZone')} placeholder="Surulere/Lawanson" listId="store-capture-zones" />
            <Field label="Store Address *" value={form.storeAddress} onChange={onChange('storeAddress')} placeholder="No 2 Lawanson Bus D Yard Plaza" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ct">Store profile</div>
          <div className="cs">These fields shape how the acquisition appears in the dashboard</div>
          <div className="r g2" style={{ marginTop: 12 }}>
            <Field label="Store Type *" value={form.storeType} onChange={onChange('storeType')} placeholder="Phone Store" listId="store-capture-types" />
            <SelectField label="Traffic Band *" value={form.trafficBand} onChange={onChange('trafficBand')} options={['10–30', '30–50', '50+']} />
            <SelectField label="Financing Present *" value={form.financingPresent} onChange={onChange('financingPresent')} options={['Yes', 'No']} />
            <SelectField label="Wants QR Activation *" value={form.qrInterest} onChange={onChange('qrInterest')} options={['Yes', 'No']} />
            <SelectField label="Readiness *" value={form.readiness} onChange={onChange('readiness')} options={['Interested', 'Active', 'Pending', 'Not Ready']} />
            <Field label="Store Photo URL" value={form.photoUrl} onChange={onChange('photoUrl')} placeholder="https://..." />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ct">Notes</div>
          <div className="cs">Capture the field nuance while it is still fresh</div>
          <div style={{ marginTop: 12 }}>
            <label className="auth-label">Additional Notes</label>
            <textarea
              className="auth-input"
              rows={4}
              style={{ resize: 'vertical', minHeight: 96 }}
              value={form.notes}
              onChange={onChange('notes')}
              placeholder="Examples: network issue, account-details friction, merchant requested edit ability…"
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ct">Submit</div>
          <div className="cs">
            {configured
              ? 'Drafts save automatically in this browser until you clear or submit them'
              : 'Drafts save automatically in this browser. Connect the endpoint before expecting live submission.'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="submit" className="ref-btn" disabled={!canAttemptSubmit}>
              {submitting ? 'Submitting store…' : configured ? 'Submit Store Capture' : 'Submit Store Capture'}
            </button>
            <button type="button" className="clear-btn" onClick={clearDraft} disabled={submitting}>
              Clear Draft
            </button>
          </div>
          {!configured && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.7 }}>
              The button will activate for live submission as soon as `STORE_CAPTURE_WEBHOOK_URL` is configured.
            </div>
          )}
        </div>
      </form>

      <datalist id="store-capture-zones">
        {zoneSuggestions.map((zone) => <option key={zone} value={zone} />)}
      </datalist>
      <datalist id="store-capture-agents">
        {agentSuggestions.map((agent) => <option key={agent} value={agent} />)}
      </datalist>
      <datalist id="store-capture-types">
        {(filterOptions.storeTypes || []).map((type) => <option key={type} value={type} />)}
      </datalist>

      <div className="footer">
        {configured
          ? 'Store Capture • Draft-saving form • Server-side submission'
          : 'Store Capture • Draft-saving form • Endpoint setup still needed'}
      </div>
    </div>
  );
}

function StoreCaptureTabs({ view, onChange }) {
  return <div className="section-tabs"><button className={view === 'performance' ? 'active' : ''} onClick={() => onChange('performance')}>Agent performance</button><button className={view === 'capture' ? 'active' : ''} onClick={() => onChange('capture')}>Capture a store</button></div>;
}

function Field({ label, value, onChange, placeholder, listId }) {
  return (
    <div>
      <label className="auth-label">{label}</label>
      <input className="auth-input" value={value} onChange={onChange} placeholder={placeholder} list={listId} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="auth-label">{label}</label>
      <select className={`flt${value ? ' active' : ''}`} style={{ width: '100%' }} value={value} onChange={onChange}>
        <option value="">Select…</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function requiredFieldsFilled(form) {
  return Boolean(
    form.merchantBusinessName &&
    form.merchantName &&
    form.phoneNumber &&
    form.storeAddress &&
    form.assignedZone &&
    form.storeType &&
    form.trafficBand &&
    form.financingPresent &&
    form.qrInterest &&
    form.readiness &&
    form.fieldAgentName
  );
}
