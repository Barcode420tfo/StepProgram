import { Bar, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useData } from '../context/DataContext';
import Scorecard from '../components/ui/Scorecard';
import { groupCount, uniq } from '../utils/dataUtils';

const PALETTE = ['#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#9334e6', '#00897b', '#e67c13', '#0097a7'];
const GRID = 'rgba(0,0,0,0.05)';
const baseBarOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: GRID }, border: { color: 'transparent' } },
    y: { beginAtZero: true, grid: { color: GRID }, border: { color: 'transparent' } },
  },
};
const donutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '63%',
  plugins: {
    legend: { display: true, position: 'bottom', labels: { padding: 9, boxWidth: 8, boxHeight: 8 } },
    datalabels: {
      display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
      color: '#fff',
      font: { weight: 'bold', size: 11 },
      formatter: (value, ctx) => {
        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return pct >= 10 ? `${value}\n${pct}%` : value;
      },
      textAlign: 'center',
    },
  },
};

export default function Overview() {
  const { filtered, raw, meta } = useData();
  const O = filtered.onboarding;
  const devfinRows = raw.devfin || [];
  const devproRows = raw.devpro || [];
  const devfinSummary = meta?.devfinSummary;
  const devproSummary = meta?.devproSummary;

  const total = O.length;
  const zones = uniq(O.map((r) => r['Assigned Zone']));
  const agents = uniq(O.map((r) => r['Field Agent Name']));
  const qrYes = O.filter((r) => r['Is Merchant Interested In QR Activation?'] === 'Yes').length;
  const financingYes = O.filter((r) => r['Existing Financing Providers In Store'] === 'Yes').length;
  const highTraffic = O.filter((r) => r['Estimated Daily Customer Traffic'] === '50+').length;
  const noteCount = O.filter((r) => r['Additional Notes']).length;

  const zoneMap = groupCount(O, 'Assigned Zone');
  const typeMap = groupCount(O, 'Type of Store');
  const readinessMap = groupCount(O, 'Merchant Readiness Level');
  const trafficMap = groupCount(O, 'Estimated Daily Customer Traffic');
  const agentMap = groupCount(O, 'Field Agent Name');

  const topZone = getTopEntry(zoneMap);
  const topAgent = getTopEntry(agentMap);
  const devfinMetrics = buildSalesOverview(devfinRows);
  const devproMetrics = buildSalesOverview(devproRows);

  return (
    <div>
      <div className="src-banner">
        <div className="src-banner-item">
          <span className="src-dot" style={{ background: 'var(--blue)' }} />
          <span><span className="src-banner-label">Live Acquisition Sheet</span> Merchant acquisition records synced directly from your Google Sheet</span>
        </div>
      </div>

      <div className="sec">Merchant acquisition snapshot — what the live source says right now</div>

      <div className="r g5">
        <Scorecard
          source="Live Sheet"
          colorClass="bl"
          label="Total Acquisitions"
          value={total}
          sub={topZone.key ? `Top zone: ${topZone.key}` : 'No zone data yet'}
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="te"
          label="Zones Covered"
          value={zones.length}
          sub={zones.join(' · ') || 'No zones recorded'}
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="gr"
          label="Want QR Activation"
          value={qrYes}
          sub={total > 0 ? `${Math.round((qrYes / total) * 100)}% of acquired merchants` : 'No acquisition rows yet'}
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="am"
          label="Financing Already Present"
          value={financingYes}
          sub="Stores already exposed to financing competitors"
          subType={financingYes > 0 ? 'wn' : 'up'}
        />
        <Scorecard
          source="Live Sheet"
          colorClass="pu"
          label="Agents Acquiring"
          value={agents.length}
          sub={topAgent.key ? `Top agent: ${topAgent.key}` : 'No agent data yet'}
          subType="up"
        />
      </div>

      <div className="r g32">
        <div className="card">
          <div className="ct">
            Acquisitions by zone
            <span className="ds">Live Sheet</span>
          </div>
          <div className="cs">
            Where merchant acquisition is happening most right now
          </div>
          <div className="cw" style={{ height: '220px' }}>
            <Bar data={buildBar(zoneMap, '#1a73e8')} options={baseBarOpts} />
          </div>
        </div>
        <div className="card">
          <div className="ct">
            Store category mix
            <span className="ds">Live Sheet</span>
          </div>
          <div className="cs">
            Which business types are entering the pipeline
          </div>
          <div className="cw" style={{ height: '220px' }}>
            <Doughnut data={buildDonut(typeMap)} options={donutOpts} plugins={[ChartDataLabels]} />
          </div>
        </div>
      </div>

      <div className="r g32">
        <div className="card">
          <div className="ct">
            Readiness pipeline
            <span className="ds">Live Sheet</span>
          </div>
          <div className="cs">
            Merchant readiness levels exactly as captured in the sheet
          </div>
          <div className="cw" style={{ height: '210px' }}>
            <Doughnut data={buildDonut(readinessMap)} options={donutOpts} plugins={[ChartDataLabels]} />
          </div>
        </div>
        <div className="card">
          <div className="ct">
            Customer traffic potential
            <span className="ds">Live Sheet</span>
          </div>
          <div className="cs">
            Traffic bands help surface stronger merchant acquisition opportunities
          </div>
          <div className="cw" style={{ height: '210px' }}>
            <Bar data={buildBar(trafficMap, '#34a853')} options={baseBarOpts} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '12px' }}>
        <div className="ct">Acquisition focus summary <span className="ds">Live Sheet</span></div>
        <div className="cs">Fast read on the current sheet without the old daily-report assumptions</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.8', marginTop: '12px' }}>
          <div><b>{highTraffic}</b> high-traffic store{highTraffic !== 1 ? 's' : ''} are marked `50+` daily customer visits.</div>
          <div><b>{noteCount}</b> acquisition row{noteCount !== 1 ? 's' : ''} include field notes for follow-up.</div>
          <div><b>{topZone.key || 'No zone yet'}</b>{topZone.key ? ` leads coverage with ${topZone.value} acquisition record${topZone.value !== 1 ? 's' : ''}.` : ''}</div>
        </div>
      </div>

      <div className="sec">Live sales snapshots — exact amounts from the Devfin and Devpro sheets</div>

      <div className="r g4">
        <Scorecard
          source="Live Sheet"
          colorClass="pu"
          label="Exact Devfin Amount"
          value={formatMoney(devfinSummary?.totalBookedValue ?? devfinMetrics.totalBookedValue)}
          sub="Pulled from the Devfin total row on the live sheet"
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="gr"
          label="Devfin Stores"
          value={devfinMetrics.storeCount}
          sub={devfinMetrics.topProduct ? `Product label present: ${devfinMetrics.topProduct.label}` : 'No Devfin activity yet'}
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="te"
          label="Exact Devpro Value"
          value={formatMoney(devproSummary?.totalBookedValue ?? devproMetrics.totalBookedValue)}
          sub="Pulled from the Devpro total row on the live sheet"
          subType="up"
        />
        <Scorecard
          source="Live Sheet"
          colorClass="am"
          label="Devpro Rows"
          value={devproMetrics.rowCount}
          sub={devproMetrics.latestSale ? `Latest Devpro sale: ${devproMetrics.latestSale}` : 'No Devpro rows synced yet'}
          subType="up"
        />
      </div>

      <div className="footer">Overview &bull; Merchant acquisition plus Devfin and Devpro snapshots &bull; Live onboarding and sales sheets</div>
    </div>
  );
}

function buildBar(map, color) {
  const keys = Object.keys(map);
  return {
    labels: keys.length ? keys : ['No data'],
    datasets: [{
      data: keys.length ? Object.values(map) : [0],
      backgroundColor: color,
      borderRadius: 4,
      barThickness: 26,
    }],
  };
}

function buildDonut(map) {
  const keys = Object.keys(map);
  return {
    labels: keys.length ? keys : ['No data'],
    datasets: [{
      data: keys.length ? Object.values(map) : [1],
      backgroundColor: PALETTE,
      borderColor: '#fff',
      borderWidth: 3,
      hoverOffset: 4,
    }],
  };
}

function getTopEntry(map) {
  return Object.entries(map).reduce((best, [key, value]) => (
    value > best.value ? { key, value } : best
  ), { key: '', value: 0 });
}

function buildSalesOverview(rows) {
  const productMap = new Map();
  const locationMap = new Map();
  const storeSet = new Set();
  let totalBookedValue = 0;
  let latestSale = '';

  rows.forEach((row) => {
    const product = row['Product Type'] || 'Unspecified Product';
    const location = row['Store Location'] || 'Unspecified Location';
    const store = row['Store Name'] || 'Unnamed Store';
    const bookedValue = parseMoney(row['Device Price'] || row.Value);

    totalBookedValue += bookedValue;
    productMap.set(product, (productMap.get(product) || 0) + bookedValue);
    locationMap.set(location, (locationMap.get(location) || 0) + 1);
    storeSet.add(store);
    latestSale = getLaterTimestamp(latestSale, row.Timestamp);
  });

  const topProduct = getTopLabel(Array.from(productMap.entries()));
  const topLocation = getTopLabel(Array.from(locationMap.entries()));

  return {
    totalBookedValue,
    storeCount: storeSet.size,
    locationCount: locationMap.size,
    rowCount: rows.length,
    topProduct,
    topLocation,
    latestSale: latestSale ? formatSalesTimestamp(latestSale) : '',
  };
}

function getTopLabel(entries) {
  if (!entries.length) return null;
  const [label, value] = entries.sort((a, b) => b[1] - a[1])[0];
  return { label, value };
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

function getLaterTimestamp(currentValue, nextValue) {
  const currentDate = new Date(currentValue);
  const nextDate = new Date(nextValue);

  if (Number.isNaN(nextDate.getTime())) return currentValue;
  if (Number.isNaN(currentDate.getTime()) || nextDate > currentDate) return nextValue;
  return currentValue;
}

function formatSalesTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
