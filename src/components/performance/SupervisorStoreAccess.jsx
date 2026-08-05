import { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { getAllAssignedStoreRecords, getAssignedStoreRecords } from '../../config/storeAllocations';
import { agentId, rowAgent } from '../../config/agentIdentity';
import { normalizeStoreKey, storeName } from '../../config/storeIdentity';

function clean(value) { return String(value || '').trim().toLowerCase(); }

export default function SupervisorStoreAccess({ supervisorName, agentName, territory }) {
  const { raw } = useData();
  const [view, setView] = useState(agentName ? 'supervised' : 'personal');
  const [query, setQuery] = useState('');
  const supervised = useMemo(() => getAssignedStoreRecords(agentName), [agentName]);
  const personal = useMemo(() => {
    const assignmentByName = new Map(getAllAssignedStoreRecords().map((store) => [normalizeStoreKey(store.name), store]));
    const byName = new Map();
    raw.onboarding
      .filter((row) => rowAgent(row)?.id === agentId(supervisorName))
      .forEach((row) => {
        const name = storeName(row);
        const key = normalizeStoreKey(name);
        const assignment = assignmentByName.get(key);
        byName.set(key, {
          ...assignment,
          name,
          address: row['Store Address'] || assignment?.address || '',
          originalOnboarder: supervisorName,
          assignedAgent: assignment?.assignedAgent || 'Pending assignment',
          currentSupervisor: assignment?.currentSupervisor || 'Pending assignment',
          territory: assignment?.territory || row['Assigned Zone'] || territory,
        });
      });
    return [...byName.values()];
  }, [raw.onboarding, supervisorName, territory]);
  const source = view === 'personal' ? personal : supervised;
  const filtered = source.filter((store) => [store.name, store.address, store.originalOnboarder, store.assignedAgent].some((value) => clean(value).includes(clean(query))));

  return <section className="role-panel supervisor-store-access">
    <div className="role-panel-head"><div><h2>Store access and ownership</h2><p>Current supervision remains separate from original onboarding credit.</p></div><span className="store-total-badge">{source.length} stores</span></div>
    <div className="store-access-controls">
      <div className="section-tabs">{agentName && <button className={view === 'supervised' ? 'active' : ''} onClick={() => setView('supervised')}>Supervised portfolio ({supervised.length})</button>}<button className={view === 'personal' ? 'active' : ''} onClick={() => setView('personal')}>Personally onboarded ({personal.length})</button></div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stores or owners…" />
    </div>
    <div className="role-table-wrap supervisor-store-table"><table><thead><tr><th>Store</th><th>Territory</th><th>Original onboarder</th><th>Assigned Sales Agent</th><th>Current supervisor</th></tr></thead><tbody>
      {filtered.length ? filtered.map((store, index) => <tr key={`${store.name}-${store.assignedAgent}-${index}`}><td><strong>{store.name}</strong>{store.address && <small className="store-address">{store.address}</small>}</td><td>{store.territory || territory}</td><td><span className={`owner-pill${clean(store.originalOnboarder) === clean(supervisorName) ? ' mine' : ''}`}>{store.originalOnboarder}</span></td><td>{store.assignedAgent}</td><td><strong>{store.currentSupervisor}</strong></td></tr>) : <tr><td colSpan="5" className="empty-detail">No stores match this view.</td></tr>}
    </tbody></table></div>
  </section>;
}
