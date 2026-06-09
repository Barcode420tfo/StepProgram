import { useData } from '../context/DataContext';
import InsightCard from '../components/ui/InsightCard';
import { formatDate, uniq } from '../utils/dataUtils';

export default function Insights() {
  const { filtered } = useData();
  const O = filtered.onboarding;

  const total = O.length;
  const qrYes = O.filter((r) => r['Is Merchant Interested In QR Activation?'] === 'Yes').length;
  const financingYes = O.filter((r) => r['Existing Financing Providers In Store'] === 'Yes').length;
  const activeCount = O.filter((r) => r['Merchant Readiness Level'] === 'Active').length;
  const noteRows = O
    .filter((r) => r['Additional Notes'])
    .map((r) => ({
      agent: r['Field Agent Name'] || 'Unknown Agent',
      zone: r['Assigned Zone'] || '—',
      business: r['Merchant Business Name'] || 'Unnamed Business',
      date: formatDate(r['Timestamp']),
      note: r['Additional Notes'] || '',
      readiness: r['Merchant Readiness Level'] || '—',
      qr: r['Is Merchant Interested In QR Activation?'] || '—',
    }));

  const noteText = noteRows.map((row) => row.note.toLowerCase()).join(' ');
  const networkMentions = countMentions(noteText, ['network', 'connect']);
  const accountMentions = countMentions(noteText, ['account', 'bank details', 'details', 'prompt']);
  const qrMentions = countMentions(noteText, ['qr', 'response']);
  const allAgents = uniq(O.map((r) => r['Field Agent Name']));

  const alerts = [];
  if (total > 0) {
    alerts.push({
      type: 'po',
      icon: '🏪',
      tag: 'Live Acquisition Volume',
      text: `${total} merchant acquisition record${total !== 1 ? 's' : ''} are currently in the source sheet.`,
    });
  }
  if (qrYes > 0) {
    alerts.push({
      type: 'po',
      icon: '⚡',
      tag: 'QR Activation Pipeline',
      text: `${qrYes} acquired merchant${qrYes !== 1 ? 's' : ''} already indicated interest in QR activation.`,
    });
  }
  if (financingYes > 0) {
    alerts.push({
      type: 'wn',
      icon: '💳',
      tag: 'Financing Competition',
      text: `${financingYes} store${financingYes !== 1 ? 's' : ''} already have financing providers in-store, so activation messaging may need to be sharper.`,
    });
  }
  if (activeCount === 0 && total > 0) {
    alerts.push({
      type: 'wn',
      icon: '🕒',
      tag: 'Readiness Follow-Up Needed',
      text: 'No acquisition rows are currently marked Active, which suggests the pipeline is still in capture or follow-up mode.',
    });
  }
  if (networkMentions > 0) {
    alerts.push({
      type: 'cr',
      icon: '📡',
      tag: 'Network Friction Mentioned',
      text: `Field notes mention network or connectivity issues ${networkMentions} time${networkMentions !== 1 ? 's' : ''}.`,
    });
  }
  if (accountMentions > 0) {
    alerts.push({
      type: 'wn',
      icon: '🏦',
      tag: 'Account Detail Friction',
      text: `Field notes mention account or bank-detail friction ${accountMentions} time${accountMentions !== 1 ? 's' : ''}.`,
    });
  }
  if (qrMentions > 0) {
    alerts.push({
      type: 'wn',
      icon: '🔳',
      tag: 'QR Explanation Gaps',
      text: `Field notes mention QR or response-speed concerns ${qrMentions} time${qrMentions !== 1 ? 's' : ''}.`,
    });
  }

  const hasAlerts = alerts.length > 0;
  const hasFeedback = noteRows.length > 0;

  return (
    <div>
      <div className="sec">Merchant acquisition insights &amp; field notes</div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Acquisition Alerts</div>
        <div className="cs">Generated from the live merchant acquisition sheet and its notes</div>
        {hasAlerts ? (
          <div className="ins-wrap" style={{ marginBottom: 0 }}>
            {alerts.map((alert, index) => (
              <InsightCard key={index} type={alert.type} icon={alert.icon} tag={alert.tag} text={alert.text} />
            ))}
          </div>
        ) : (
          <div style={emptyStyle}>No acquisition alerts yet — add live rows or notes to generate insights</div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Field Notes From Acquisitions</div>
        <div className="cs">
          Notes submitted inside the acquisition sheet — <b>{allAgents.length}</b> agent(s) represented
        </div>
        {hasFeedback ? (
          <div className="feedback-grid">
            {noteRows.map((row, index) => (
              <AcquisitionNoteCard key={index} row={row} />
            ))}
          </div>
        ) : (
          <div style={emptyStyle}>No acquisition notes captured yet</div>
        )}
      </div>

      <div className="footer">Insights &bull; Merchant acquisition sheet &bull; Notes and live signals</div>
    </div>
  );
}

const emptyStyle = {
  fontSize: '12px',
  color: 'var(--muted)',
  fontStyle: 'italic',
  padding: '14px 0 4px',
};

function AcquisitionNoteCard({ row }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '14px 16px',
      borderLeft: '4px solid var(--blue)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{row.business}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{row.agent} • {row.zone}</div>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--muted)', background: '#f1f3f4', padding: '3px 9px', borderRadius: '10px' }}>
          {row.date}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={metaPillStyle}>Readiness: {row.readiness}</span>
        <span style={metaPillStyle}>QR: {row.qr}</span>
      </div>
      <div style={{ fontSize: '12px', lineHeight: '1.65', color: 'var(--text)' }}>{row.note}</div>
    </div>
  );
}

function countMentions(text, keywords) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

const metaPillStyle = {
  fontSize: '10px',
  color: 'var(--muted)',
  background: '#f8f9fa',
  border: '1px solid var(--border)',
  padding: '3px 8px',
  borderRadius: '999px',
};
