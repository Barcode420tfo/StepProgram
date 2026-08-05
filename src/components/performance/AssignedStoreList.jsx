import { useMemo, useState } from 'react';
import { getAssignedStores } from '../../config/storeAllocations';
import { SALES_AGENT_PORTFOLIOS } from '../../config/accessControl';

export default function AssignedStoreList({ agentName, title = 'Assigned stores' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const stores = getAssignedStores(agentName);
  const portfolio = SALES_AGENT_PORTFOLIOS.find((item) => item.name.toLowerCase() === String(agentName || '').toLowerCase());
  const filtered = useMemo(() => stores.filter((store) => store.toLowerCase().includes(query.trim().toLowerCase())), [stores, query]);

  return <section className="role-panel store-list-panel">
    <button className="store-list-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span><span className="store-list-icon">▦</span><span><strong>{title}</strong><small>{stores.length} stores · {portfolio?.territory || 'Territory pending'}</small></span></span>
      <b>{open ? 'Hide list ↑' : 'View stores →'}</b>
    </button>
    {open && <div className="store-list-content">
      <div className="store-list-meta"><span>Sales Agent: <strong>{agentName}</strong></span><span>Supervisor: <strong>{portfolio?.supervisor || 'Not assigned'}</strong></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assigned stores…" /></div>
      <div className="assigned-store-grid">{filtered.map((store, index) => <button className="assigned-store-item" key={`${store}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{store}</strong><small>{portfolio?.territory}</small></button>)}</div>
      {!filtered.length && <div className="empty-detail">No assigned store matches this search.</div>}
    </div>}
  </section>;
}
