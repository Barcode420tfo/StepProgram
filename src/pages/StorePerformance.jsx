import { Bar, Doughnut } from 'react-chartjs-2';
import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import Scorecard from '../components/ui/Scorecard';
import { uniq } from '../utils/dataUtils';
import { storeId, storeName } from '../config/storeIdentity';

const GRID = 'rgba(0,0,0,0.05)';
const PALETTE = ['#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#9334e6', '#00897b', '#e67c13', '#0097a7'];
const baseOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: GRID }, border: { color: 'transparent' } },
    y: { beginAtZero: true, grid: { color: GRID }, border: { color: 'transparent' } },
  },
};
const stackedMoneyOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { stacked: true, grid: { color: GRID }, border: { color: 'transparent' } },
    y: { stacked: true, beginAtZero: true, grid: { color: GRID }, border: { color: 'transparent' } },
  },
};
const donutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: { display: true, position: 'bottom', labels: { padding: 10, boxWidth: 10, boxHeight: 10 } },
  },
};

const INIT_FILTERS = {
  location: '',
  store: '',
  productType: '',
  tenure: '',
  periodPreset: 'all',
  fromDate: '',
  toDate: '',
  fromMonth: '',
  toMonth: '',
};

export default function StorePerformance(props) {
  return <SalesReportPage {...props} />;
}

export function SalesReportPage({
  sourceKey = 'devfin',
  summaryKey = 'devfinSummary',
  reportName = 'Devfin',
  reportLabel = 'Devfin Report',
  liveLabel = 'Live Devfin Sheet',
  supportsFinancing = true,
}) {
  const { scopedRaw, meta, lastUpdated } = useData();
  const rows = scopedRaw[sourceKey] || [];
  const summary = meta?.[summaryKey];
  const [filters, setFilters] = useState(INIT_FILTERS);

  const locationOptions = useMemo(
    () => uniq(rows.map((row) => row['Store Location'] || 'Unspecified Location')).sort(sortAlpha),
    [rows]
  );
  const storeOptions = useMemo(() => {
    return uniq(
      rows
        .filter((row) => !filters.location || (row['Store Location'] || 'Unspecified Location') === filters.location)
        .map((row) => storeName(row))
    ).sort(sortAlpha);
  }, [rows, filters.location]);
  const tenureOptions = useMemo(
    () => uniq(rows.map((row) => normalizeTenure(row)).filter(Boolean)).sort(sortAlpha),
    [rows]
  );

  const baseRows = useMemo(() => {
    return rows.filter((row) => {
      const location = row['Store Location'] || 'Unspecified Location';
      const store = storeName(row);
      const tenure = normalizeTenure(row);

      return (
        (!filters.location || location === filters.location) &&
        (!filters.store || store === filters.store) &&
        (!filters.tenure || tenure === filters.tenure) &&
        matchesTimeWindow(row, filters)
      );
    });
  }, [rows, filters]);

  const productOptions = useMemo(
    () => uniq(baseRows.map((row) => row['Product Type'] || 'Unspecified Product')).sort(sortAlpha),
    [baseRows]
  );
  const filteredRows = useMemo(() => {
    return baseRows.filter((row) => {
      const productType = row['Product Type'] || 'Unspecified Product';
      return !filters.productType || productType === filters.productType;
    });
  }, [baseRows, filters.productType]);

  const allMetrics = useMemo(() => buildAnalytics(baseRows), [baseRows]);
  const metrics = useMemo(() => buildAnalytics(filteredRows), [filteredRows]);
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== 'periodPreset' ? Boolean(value) : value !== 'all');
  const isSheetView = isDefaultSheetView(filters);
  const exactBookedValue = isSheetView && summary ? summary.totalBookedValue : metrics.totalBookedValue;
  const exactLoanValue = isSheetView && summary ? summary.totalLoanAmount : metrics.totalLoanAmount;
  const exactDownPayment = isSheetView && summary ? summary.totalDownPayment : metrics.totalDownPayment;
  const exactTotalsMatch = !summary || (
    summary.totalBookedValue === allMetrics.totalBookedValue &&
    summary.totalLoanAmount === allMetrics.totalLoanAmount &&
    summary.totalDownPayment === allMetrics.totalDownPayment
  );

  const totalValueLabel = supportsFinancing ? `Exact ${reportName} Amount` : `Exact ${reportName} Value`;
  const summaryMatchText = supportsFinancing
    ? `Live row totals match the ${reportName} summary row`
    : `Live row value matches the ${reportName} summary row`;
  const summaryMismatchText = supportsFinancing
    ? 'Summary row and live rows are not aligned'
    : 'Summary row and live value are not aligned';

  return (
    <div>
      <div className="src-banner">
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: 'var(--purple)' }} />
          <span><span className="src-banner-label">{liveLabel}</span> Every synced {reportName} row is mirrored here, while the sheet total row is used as the exact headline summary</span>
        </div>
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: 'var(--green)' }} />
          <span><span className="src-banner-label">Last Sync</span> {lastUpdated ? formatTimestamp(lastUpdated) : 'Waiting for first live sync'}</span>
        </div>
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: exactTotalsMatch ? 'var(--green)' : 'var(--red)' }} />
          <span><span className="src-banner-label">Sheet Check</span> {exactTotalsMatch ? summaryMatchText : summaryMismatchText}</span>
        </div>
      </div>

      <div className="sec">{reportName} command center — exact sheet totals, live row sync, and period tracking</div>

      <div className="card sales-filterbar">
        <div className="sales-filterbar-head">
          <div>
            <div className="ct">Sales filters <span className="ds">Live Sheet</span></div>
            <div className="cs">Track the {reportName} feed by store, location, tenor, month-to-date, date range, or month range</div>
          </div>
          {hasActiveFilters && (
            <button className="clear-btn" onClick={() => setFilters(INIT_FILTERS)}>
              Clear sales filters
            </button>
          )}
        </div>

        <div className="sales-filterbar-actions">
          <select className={`flt${filters.location ? ' active' : ''}`} value={filters.location} onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value, store: '' }))}>
            <option value="">All locations</option>
            {locationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className={`flt${filters.store ? ' active' : ''}`} value={filters.store} onChange={(event) => setFilters((prev) => ({ ...prev, store: event.target.value }))}>
            <option value="">All stores</option>
            {storeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className={`flt${filters.productType ? ' active' : ''}`} value={filters.productType} onChange={(event) => setFilters((prev) => ({ ...prev, productType: event.target.value }))}>
            <option value="">All products</option>
            {productOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className={`flt${filters.tenure ? ' active' : ''}`} value={filters.tenure} onChange={(event) => setFilters((prev) => ({ ...prev, tenure: event.target.value }))}>
            <option value="">All tenures</option>
            {tenureOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>

        <div className="sales-mode-row">
          {[
            ['all', 'All Time'],
            ['monthToDate', 'Month To Date'],
            ['customDate', 'From Date To Date'],
            ['customMonth', 'Month To Month'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`sales-mode-btn${filters.periodPreset === value ? ' active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, periodPreset: value }))}
            >
              {label}
            </button>
          ))}
        </div>

        {filters.periodPreset === 'customDate' && (
          <div className="sales-date-row">
            <label className="sales-date-field">
              <span>From date</span>
              <input type="date" className="sales-date-input" value={filters.fromDate} onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))} />
            </label>
            <label className="sales-date-field">
              <span>To date</span>
              <input type="date" className="sales-date-input" value={filters.toDate} onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))} />
            </label>
          </div>
        )}

        {filters.periodPreset === 'customMonth' && (
          <div className="sales-date-row">
            <label className="sales-date-field">
              <span>From month</span>
              <input type="month" className="sales-date-input" value={filters.fromMonth} onChange={(event) => setFilters((prev) => ({ ...prev, fromMonth: event.target.value }))} />
            </label>
            <label className="sales-date-field">
              <span>To month</span>
              <input type="month" className="sales-date-input" value={filters.toMonth} onChange={(event) => setFilters((prev) => ({ ...prev, toMonth: event.target.value }))} />
            </label>
          </div>
        )}

        <div className="sales-chip-row">
          <span className="sales-chip"><strong>{allMetrics.totalRows}</strong> live {reportName} transactions in the selected period</span>
          <span className="sales-chip"><strong>{allMetrics.productRollups.length}</strong> product views available</span>
          <span className="sales-chip"><strong>{allMetrics.locationRollups.length}</strong> locations active</span>
          <span className="sales-chip"><strong>{describePeriod(filters)}</strong> active time window</span>
        </div>
      </div>

      <div className="r g3">
        <Scorecard source="Live Sheet" colorClass="bl" label={totalValueLabel} value={formatMoney(exactBookedValue)} sub={isSheetView ? `Matches the ${reportName} total row on the live sheet` : `Calculated from the currently filtered ${reportName} rows`} subType="up" />
        <Scorecard source="Live Sheet" colorClass="pu" label={`${reportName} Row Count`} value={metrics.totalRows} sub={isSheetView ? `Exact live ${reportName} row count from transaction lines` : `Filtered ${reportName} row count for the current view`} subType="up" />
        {supportsFinancing ? (
          <>
            <Scorecard source="Live Sheet" colorClass="gr" label="Loan Value" value={formatMoney(exactLoanValue)} sub={exactBookedValue > 0 ? `${Math.round((exactLoanValue / exactBookedValue) * 100)}% of ${reportName} value financed` : 'No financed rows yet'} subType="up" />
            <Scorecard source="Live Sheet" colorClass="te" label="Down Payment" value={formatMoney(exactDownPayment)} sub={exactBookedValue > 0 ? `${Math.round((exactDownPayment / exactBookedValue) * 100)}% cash collected upfront` : 'No upfront payment recorded yet'} subType="up" />
          </>
        ) : (
          <>
            <Scorecard source="Live Sheet" colorClass="gr" label="Active Stores" value={metrics.storeRollups.length} sub={metrics.topStore ? `${metrics.topStore.store} leads with ${formatMoney(metrics.topStore.bookedValue)}` : `No ${reportName} stores yet`} subType="up" />
            <Scorecard source="Live Sheet" colorClass="te" label="Top Agent" value={metrics.topAgent ? metrics.topAgent.agentName : '—'} sub={metrics.topAgent ? `${metrics.topAgent.sales} rows · ${formatMoney(metrics.topAgent.bookedValue)}` : `No ${reportName} agent activity yet`} subType="up" />
          </>
        )}
        <Scorecard source="Live Sheet" colorClass="am" label="Average Ticket" value={formatMoney(metrics.averageBookedValue)} sub="Average amount per sales row in the current product view" subType="up" />
        <Scorecard source="Live Sheet" colorClass="rd" label="Top Location" value={metrics.topLocation ? metrics.topLocation.location : '—'} sub={metrics.topLocation ? `${metrics.topLocation.sales} rows · ${formatMoney(metrics.topLocation.bookedValue)}` : `No ${reportName} location activity yet`} subType="up" />
      </div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">{reportName} summary check <span className="ds">Live Sheet</span></div>
        <div className="cs">The exact sheet total row is shown beside the live transaction aggregation so any mismatch is visible immediately.</div>
        <div className="sales-chip-row" style={{ marginBottom: '12px' }}>
          <button className={`sales-chip sales-chip-btn${!filters.productType ? ' active' : ''}`} onClick={() => setFilters((prev) => ({ ...prev, productType: '' }))}>
            <strong>Sheet total</strong>
            <span>{formatMoney(summary?.totalBookedValue || 0)}</span>
          </button>
          <button className="sales-chip sales-chip-btn active">
            <strong>Live rows total</strong>
            <span>{formatMoney(allMetrics.totalBookedValue)}</span>
          </button>
          <button className="sales-chip sales-chip-btn active">
            <strong>Live row count</strong>
            <span>{allMetrics.totalRows}</span>
          </button>
          {allMetrics.productRollups.map((item) => (
            <button
              key={item.productType}
              className={`sales-chip sales-chip-btn${filters.productType === item.productType ? ' active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, productType: prev.productType === item.productType ? '' : item.productType }))}
            >
              <strong>{item.productType}</strong>
              <span>{formatMoney(item.bookedValue)}</span>
            </button>
          ))}
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Measure</th>
                <th>Sheet Total Row</th>
                <th>Live {reportName} Rows</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>{supportsFinancing ? 'Booked Value' : 'Value'}</b></td>
                <td>{formatMoney(summary?.totalBookedValue || 0)}</td>
                <td>{formatMoney(allMetrics.totalBookedValue)}</td>
                <td>{summary && summary.totalBookedValue === allMetrics.totalBookedValue ? 'Match' : 'Check sheet'}</td>
              </tr>
              {supportsFinancing && (
                <>
                  <tr>
                    <td><b>Loan Value</b></td>
                    <td>{formatMoney(summary?.totalLoanAmount || 0)}</td>
                    <td>{formatMoney(allMetrics.totalLoanAmount)}</td>
                    <td>{summary && summary.totalLoanAmount === allMetrics.totalLoanAmount ? 'Match' : 'Check sheet'}</td>
                  </tr>
                  <tr>
                    <td><b>Down Payment</b></td>
                    <td>{formatMoney(summary?.totalDownPayment || 0)}</td>
                    <td>{formatMoney(allMetrics.totalDownPayment)}</td>
                    <td>{summary && summary.totalDownPayment === allMetrics.totalDownPayment ? 'Match' : 'Check sheet'}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="r g2">
        <div className="card">
          <div className="ct">Sales count by location <span className="ds">Live Sheet</span></div>
          <div className="cs">Where STEP is logging the highest number of store sales right now</div>
          <div className="cw" style={{ height: '250px' }}>
            <Bar data={buildBar(metrics.locationRollups, 'location', 'sales', '#1a73e8', 'Sales Rows')} options={baseOpts} />
          </div>
        </div>
        <div className="card">
          <div className="ct">Booked value by top store <span className="ds">Live Sheet</span></div>
          <div className="cs">Highest-value stores based on the exact {reportName} rows in the current product view</div>
          <div className="cw" style={{ height: '250px' }}>
            <Bar data={buildBar(metrics.topStoresByValue, 'store', 'bookedValue', '#34a853', supportsFinancing ? 'Booked Value' : 'Value')} options={baseOpts} />
          </div>
        </div>
      </div>

      <div className="r g32">
        <div className="card">
          <div className="ct">Sales trend by day <span className="ds">Live Sheet</span></div>
          <div className="cs">Track the selected product view over time after applying your date or month filters</div>
          <div className="cw" style={{ height: '250px' }}>
            <Bar data={buildBar(metrics.trendRows, 'date', 'sales', '#9334e6', 'Sales Rows')} options={baseOpts} />
          </div>
        </div>
        <div className="card">
          <div className="ct">Product mix <span className="ds">Live Sheet</span></div>
          <div className="cs">Current split of the {reportName} feed by product label on the sheet</div>
          <div className="cw" style={{ height: '250px' }}>
            <Doughnut data={buildDonut(allMetrics.productMix)} options={donutOpts} />
          </div>
        </div>
      </div>

      <div className="r g2">
        <div className="card">
          <div className="ct">Location leaderboard <span className="ds">Live Sheet</span></div>
          <div className="cs">Sales tracking by location with store coverage, booked value, and latest activity</div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Sales Rows</th>
                  <th>Stores</th>
                  <th>Booked Value</th>
                  <th>{supportsFinancing ? 'Loan Value' : 'Avg Ticket'}</th>
                  <th>Latest Activity</th>
                </tr>
              </thead>
              <tbody>
                {metrics.locationRollups.length ? metrics.locationRollups.map((item) => (
                  <tr key={item.location}>
                    <td><b>{item.location}</b></td>
                    <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{item.sales}</td>
                    <td>{item.stores}</td>
                    <td>{formatMoney(item.bookedValue)}</td>
                    <td>{supportsFinancing ? formatMoney(item.loanAmount) : formatMoney(item.averageTicket)}</td>
                    <td>{formatTimestamp(item.latestTimestamp)}</td>
                  </tr>
                )) : (
                  <EmptyTableRow colSpan="6" message={`No ${reportName} rows are available for the selected filters`} />
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="ct">Store leaderboard <span className="ds">Live Sheet</span></div>
          <div className="cs">Per-store sales tracking with location context and {supportsFinancing ? 'financing totals' : 'exact value totals'}</div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Location</th>
                  <th>Sales Rows</th>
                  <th>Booked Value</th>
                  <th>{supportsFinancing ? 'Down Payment' : 'Lead Agent'}</th>
                  <th>Latest Activity</th>
                </tr>
              </thead>
              <tbody>
                {metrics.storeRollups.length ? metrics.storeRollups.map((item) => (
                  <tr key={item.key}>
                    <td><b>{item.store}</b></td>
                    <td>{item.location}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 700 }}>{item.sales}</td>
                    <td>{formatMoney(item.bookedValue)}</td>
                    <td>{supportsFinancing ? formatMoney(item.downPayment) : item.agentName}</td>
                    <td>{formatTimestamp(item.latestTimestamp)}</td>
                  </tr>
                )) : (
                  <EmptyTableRow colSpan="6" message={`No ${reportName} stores have activity in the current view`} />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {supportsFinancing ? (
        <div className="card" style={{ marginBottom: '12px' }}>
          <div className="ct">Financing mix by location <span className="ds">Live Sheet</span></div>
          <div className="cs">Booked value, loan value, and down payment stacked together for the busiest locations in the current product view</div>
          <div className="cw" style={{ height: '270px' }}>
            <Bar data={buildMoneyStack(metrics.locationRollups)} options={stackedMoneyOpts} />
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '12px' }}>
          <div className="ct">Agent leaderboard <span className="ds">Live Sheet</span></div>
          <div className="cs">Exact Devpro value and row count grouped by agent from the live sheet</div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Sales Rows</th>
                  <th>Value</th>
                  <th>Latest Activity</th>
                </tr>
              </thead>
              <tbody>
                {metrics.agentRollups.length ? metrics.agentRollups.map((item) => (
                  <tr key={item.agentName}>
                    <td><b>{item.agentName}</b></td>
                    <td style={{ color: 'var(--purple)', fontWeight: 700 }}>{item.sales}</td>
                    <td>{formatMoney(item.bookedValue)}</td>
                    <td>{formatTimestamp(item.latestTimestamp)}</td>
                  </tr>
                )) : (
                  <EmptyTableRow colSpan="4" message={`No ${reportName} agent rows are available for the selected filters`} />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Live {reportName} transaction feed <span className="ds">Mirrors STEP Rows</span></div>
        <div className="cs">Every synced {reportName} transaction row is listed below. The summary total row is excluded so counts and values stay exact.</div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Location</th>
                <th>Store</th>
                <th>Agent</th>
                <th>Product</th>
                <th>Device</th>
                <th>Tenure / Cover</th>
                <th>{supportsFinancing ? 'Booked Value' : 'Value'}</th>
                <th>{supportsFinancing ? 'Loan' : 'Status'}</th>
                <th>{supportsFinancing ? 'Down Payment' : 'Reference'}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.transactions.length ? metrics.transactions.map((item) => (
                <tr key={item.key}>
                  <td>{formatTimestamp(item.timestamp)}</td>
                  <td>{item.location}</td>
                  <td><b>{item.store}</b></td>
                  <td>{item.agentName}</td>
                  <td>{item.productType}</td>
                  <td>{item.deviceLabel}</td>
                  <td>{item.tenureLabel}</td>
                  <td>{formatMoney(item.bookedValue)}</td>
                  <td>{supportsFinancing ? formatMoney(item.loanAmount) : 'Captured'}</td>
                  <td>{supportsFinancing ? formatMoney(item.downPayment) : formatDateKey(item.timestamp)}</td>
                </tr>
              )) : (
                <EmptyTableRow colSpan="10" message={`No live ${reportName} rows match the current filters`} />
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer">{reportLabel} &bull; Exact live sheet totals plus transaction tracking &bull; Auto-updates whenever the {reportName} sheet changes</div>
    </div>
  );
}

function EmptyTableRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--muted)', padding: '20px' }}>
        {message}
      </td>
    </tr>
  );
}

function buildAnalytics(rows) {
  const transactions = rows
    .map((row, index) => {
      const location = row['Store Location'] || 'Unspecified Location';
      const store = storeName(row);
      const storeIdentity = storeId(row) || `store-${store.toLowerCase()}`;
      const agentName = row['Agent Name'] || 'Unassigned';
      const productType = row['Product Type'] || 'Unspecified Product';
      const deviceType = row['Device Type'] || 'Unknown Device';
      const deviceModel = row['Device Model'] || 'Unknown Model';
      const bookedValue = parseMoney(row['Device Price'] || row.Value);
      const loanAmount = parseMoney(row['Loan Amount']);
      const downPayment = parseMoney(row['Down Payment']);
      const timestamp = row.Timestamp || '';
      const parsedTime = parseTimestamp(timestamp);

      return {
        key: `${timestamp}-${store}-${deviceModel}-${index}`,
        timestamp,
        timeValue: parsedTime ? parsedTime.getTime() : -Infinity,
        location,
        store,
        storeId: storeIdentity,
        agentName,
        productType,
        deviceLabel: compactDeviceLabel(deviceType, deviceModel),
        tenureLabel: normalizeTenure(row),
        bookedValue,
        loanAmount,
        downPayment,
      };
    })
    .sort((a, b) => b.timeValue - a.timeValue);

  const locationMap = new Map();
  const storeMap = new Map();
  const trendMap = new Map();
  const productMap = new Map();
  const agentMap = new Map();

  let totalBookedValue = 0;
  let totalLoanAmount = 0;
  let totalDownPayment = 0;
  let latestTimestamp = '';

  transactions.forEach((item) => {
    totalBookedValue += item.bookedValue;
    totalLoanAmount += item.loanAmount;
    totalDownPayment += item.downPayment;
    latestTimestamp = getLaterTimestamp(latestTimestamp, item.timestamp);

    const trendPoint = toTrendPoint(item.timestamp);
    const currentTrend = trendMap.get(trendPoint.key) || trendPoint;
    currentTrend.sales += 1;
    trendMap.set(trendPoint.key, currentTrend);

    const currentProduct = productMap.get(item.productType) || { productType: item.productType, sales: 0, bookedValue: 0, loanAmount: 0, downPayment: 0, latestTimestamp: '' };
    currentProduct.sales += 1;
    currentProduct.bookedValue += item.bookedValue;
    currentProduct.loanAmount += item.loanAmount;
    currentProduct.downPayment += item.downPayment;
    currentProduct.latestTimestamp = getLaterTimestamp(currentProduct.latestTimestamp, item.timestamp);
    productMap.set(item.productType, currentProduct);

    const currentLocation = locationMap.get(item.location) || { location: item.location, sales: 0, stores: new Set(), bookedValue: 0, loanAmount: 0, downPayment: 0, latestTimestamp: '' };
    currentLocation.sales += 1;
    currentLocation.stores.add(item.storeId);
    currentLocation.bookedValue += item.bookedValue;
    currentLocation.loanAmount += item.loanAmount;
    currentLocation.downPayment += item.downPayment;
    currentLocation.latestTimestamp = getLaterTimestamp(currentLocation.latestTimestamp, item.timestamp);
    locationMap.set(item.location, currentLocation);

    const storeKey = item.storeId;
    const currentStore = storeMap.get(storeKey) || { key: storeKey, store: item.store, agentName: item.agentName, location: item.location, sales: 0, bookedValue: 0, loanAmount: 0, downPayment: 0, latestTimestamp: '' };
    currentStore.sales += 1;
    currentStore.bookedValue += item.bookedValue;
    currentStore.loanAmount += item.loanAmount;
    currentStore.downPayment += item.downPayment;
    currentStore.latestTimestamp = getLaterTimestamp(currentStore.latestTimestamp, item.timestamp);
    storeMap.set(storeKey, currentStore);

    const currentAgent = agentMap.get(item.agentName) || { agentName: item.agentName, sales: 0, bookedValue: 0, latestTimestamp: '' };
    currentAgent.sales += 1;
    currentAgent.bookedValue += item.bookedValue;
    currentAgent.latestTimestamp = getLaterTimestamp(currentAgent.latestTimestamp, item.timestamp);
    agentMap.set(item.agentName, currentAgent);
  });

  const productRollups = Array.from(productMap.values()).sort((a, b) => b.bookedValue - a.bookedValue || b.sales - a.sales || a.productType.localeCompare(b.productType));
  const locationRollups = Array.from(locationMap.values())
    .map((item) => ({ ...item, stores: item.stores.size, averageTicket: item.sales ? item.bookedValue / item.sales : 0 }))
    .sort((a, b) => b.sales - a.sales || b.bookedValue - a.bookedValue || a.location.localeCompare(b.location));
  const storeRollups = Array.from(storeMap.values()).sort((a, b) => b.bookedValue - a.bookedValue || b.sales - a.sales || a.store.localeCompare(b.store));
  const agentRollups = Array.from(agentMap.values()).sort((a, b) => b.bookedValue - a.bookedValue || b.sales - a.sales || a.agentName.localeCompare(b.agentName));
  const trendRows = Array.from(trendMap.values()).sort((a, b) => a.sortValue - b.sortValue);
  const productMix = productRollups.map((item) => ({ label: item.productType, value: item.sales }));

  return {
    transactions,
    totalRows: transactions.length,
    totalBookedValue,
    totalLoanAmount,
    totalDownPayment,
    averageBookedValue: transactions.length ? totalBookedValue / transactions.length : 0,
    latestTimestamp,
    productRollups,
    locationRollups,
    storeRollups,
    agentRollups,
    topStoresByValue: storeRollups.slice(0, 8),
    trendRows,
    productMix,
    topLocation: locationRollups[0] || null,
    topStore: storeRollups[0] || null,
    topAgent: agentRollups[0] || null,
  };
}

function buildBar(rows, labelKey, valueKey, color, datasetLabel) {
  return {
    labels: rows.length ? rows.map((item) => item[labelKey]) : ['No data'],
    datasets: [{
      label: datasetLabel,
      data: rows.length ? rows.map((item) => item[valueKey]) : [0],
      backgroundColor: color,
      borderRadius: 4,
      barThickness: 24,
    }],
  };
}

function buildMoneyStack(rows) {
  const topRows = rows.slice(0, 8);
  return {
    labels: topRows.length ? topRows.map((item) => item.location) : ['No data'],
    datasets: [
      { label: 'Booked Value', data: topRows.length ? topRows.map((item) => item.bookedValue) : [0], backgroundColor: '#1a73e8', borderRadius: 4 },
      { label: 'Loan Value', data: topRows.length ? topRows.map((item) => item.loanAmount) : [0], backgroundColor: '#34a853', borderRadius: 4 },
      { label: 'Down Payment', data: topRows.length ? topRows.map((item) => item.downPayment) : [0], backgroundColor: '#f9ab00', borderRadius: 4 },
    ],
  };
}

function buildDonut(rows) {
  return {
    labels: rows.length ? rows.map((item) => item.label) : ['No data'],
    datasets: [{
      data: rows.length ? rows.map((item) => item.value) : [1],
      backgroundColor: PALETTE,
      borderColor: '#fff',
      borderWidth: 3,
      hoverOffset: 4,
    }],
  };
}

function normalizeTenure(row) {
  return String(row?.Tenure || row?.['Type Of DevPro'] || '').trim();
}

function compactDeviceLabel(deviceType, deviceModel) {
  if (deviceType && deviceModel) return `${deviceType} · ${deviceModel}`;
  return deviceModel || deviceType || '—';
}

function matchesTimeWindow(row, filters) {
  const parsed = parseTimestamp(row?.Timestamp);
  if (!parsed) return filters.periodPreset === 'all';

  if (filters.periodPreset === 'monthToDate') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return parsed >= start && parsed <= end;
  }

  if (filters.periodPreset === 'customDate') {
    if (filters.fromDate) {
      const from = new Date(`${filters.fromDate}T00:00:00`);
      if (parsed < from) return false;
    }
    if (filters.toDate) {
      const to = new Date(`${filters.toDate}T23:59:59.999`);
      if (parsed > to) return false;
    }
  }

  if (filters.periodPreset === 'customMonth') {
    const monthKey = toMonthKey(parsed);
    if (filters.fromMonth && monthKey < filters.fromMonth) return false;
    if (filters.toMonth && monthKey > filters.toMonth) return false;
  }

  return true;
}

function describePeriod(filters) {
  if (filters.periodPreset === 'monthToDate') {
    const now = new Date();
    return `${now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} MTD`;
  }
  if (filters.periodPreset === 'customDate') {
    const from = filters.fromDate ? formatDateLabel(filters.fromDate) : 'start';
    const to = filters.toDate ? formatDateLabel(filters.toDate) : 'today';
    return `${from} to ${to}`;
  }
  if (filters.periodPreset === 'customMonth') {
    const from = filters.fromMonth ? formatMonthLabel(filters.fromMonth) : 'earliest';
    const to = filters.toMonth ? formatMonthLabel(filters.toMonth) : 'latest';
    return `${from} to ${to}`;
  }
  return 'All time';
}

function isDefaultSheetView(filters) {
  return !filters.location && !filters.store && !filters.productType && !filters.tenure && filters.periodPreset === 'all' && !filters.fromDate && !filters.toDate && !filters.fromMonth && !filters.toMonth;
}

function parseMoney(value) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function parseTimestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = value instanceof Date ? value : parseTimestamp(value);
  if (!parsed) return String(value);
  return parsed.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateKey(value) {
  const parsed = parseTimestamp(value);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function toTrendPoint(value) {
  const parsed = parseTimestamp(value);
  if (!parsed) {
    const label = String(value || 'Unknown Date');
    return { key: label, date: label, sortValue: Number.MAX_SAFE_INTEGER, sales: 0 };
  }
  return {
    key: parsed.toISOString().slice(0, 10),
    date: parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    sortValue: parsed.getTime(),
    sales: 0,
  };
}

function toMonthKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(value) {
  const parsed = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function formatDateLabel(value) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getLaterTimestamp(currentValue, nextValue) {
  const currentDate = parseTimestamp(currentValue);
  const nextDate = parseTimestamp(nextValue);
  if (!nextDate) return currentValue;
  if (!currentDate || nextDate > currentDate) return nextValue;
  return currentValue;
}

function sortAlpha(a, b) {
  return a.localeCompare(b);
}
