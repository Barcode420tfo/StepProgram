import { useData } from '../../context/DataContext';

const SOURCE_HINT = {
  zone:       'Filters acquisition, DEVFIN and DEVPRO activity by recorded location',
  agent:      'Filters timestamped activity by recorded agent name',
  date:       'Filters derived daily activity by its source timestamp',
  storeType:  'Filters the live acquisition sheet by store category',
  readiness:  'Filters the live acquisition sheet by merchant readiness level',
  traffic:    'Filters the live acquisition sheet by estimated customer traffic',
  qrInterest: 'Filters the live acquisition sheet by QR activation interest',
};

export default function ControlBar() {
  const {
    filters, filterOptions, setFilter, clearAllFilters,
    lastUpdated, filtered, raw,
  } = useData();

  const activeCount = Object.values(filters).filter(Boolean).length;

  const dateLbl = lastUpdated
    ? lastUpdated.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const onbFiltered  = filtered.onboarding.length;
  const onbTotal     = raw.onboarding.length;
  const isFiltered    = activeCount > 0;

  return (
    <div className="ctrl">
      <div className="flt-group">
        <span className="flt-group-lbl">Shared Filters</span>
        <FilterSelect
          label="Zone"  options={filterOptions.zones}
          value={filters.zone}  onChange={v => setFilter('zone', v)}
          hint={SOURCE_HINT.zone}
        />
        <FilterSelect
          label="Agent" options={filterOptions.agents}
          value={filters.agent} onChange={v => setFilter('agent', v)}
          hint={SOURCE_HINT.agent}
        />
        <FilterSelect
          label="Submission Date" options={filterOptions.dates || []}
          value={filters.date} onChange={v => setFilter('date', v)}
          hint={SOURCE_HINT.date}
        />
      </div>

      <div className="flt-sep" />

      <div className="flt-group">
        <span className="flt-group-lbl">Merchant Acquisition Sheet</span>
        <FilterSelect
          label="Store Type" options={filterOptions.storeTypes}
          value={filters.storeType} onChange={v => setFilter('storeType', v)}
          hint={SOURCE_HINT.storeType}
        />
        <FilterSelect
          label="Readiness"  options={filterOptions.readiness}
          value={filters.readiness} onChange={v => setFilter('readiness', v)}
          hint={SOURCE_HINT.readiness}
        />
        <FilterSelect
          label="Traffic" options={filterOptions.trafficBands}
          value={filters.traffic} onChange={v => setFilter('traffic', v)}
          hint={SOURCE_HINT.traffic}
        />
        <FilterSelect
          label="QR Interest" options={filterOptions.qrInterest}
          value={filters.qrInterest} onChange={v => setFilter('qrInterest', v)}
          hint={SOURCE_HINT.qrInterest}
        />
      </div>

      {activeCount > 0 && (
        <button className="clear-btn" onClick={clearAllFilters}>
          ✕ Clear {activeCount} filter{activeCount !== 1 ? 's' : ''}
        </button>
      )}

      <div className="ctrl-r">
        {isFiltered && (
          <span className="rec-count">
            <span className="rec-dot onb" />
            {onbFiltered}/{onbTotal} acquisition record{onbTotal !== 1 ? 's' : ''}
          </span>
        )}
        <span className="date-lbl">{dateLbl}</span>
      </div>
    </div>
  );
}

function FilterSelect({ label, options, value, onChange, hint }) {
  const active = Boolean(value);
  return (
    <select
      className={`flt${active ? ' active' : ''}`}
      value={value}
      title={hint}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{label}: All</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
