const ONBOARDING_COLUMNS = [
  ['Date', ['Timestamp']],
  ['Captured Timestamp', ['Timestamp']],
  ['Store Name', ['Merchant Business Name', 'Store Name', 'Business Name']],
  ['Store Onboarded By', ['Field Agent Name', 'Agent Name']],
  ['Merchant Name', ['Merchant Name']],
  ['Store Attendant Name', ['Store Attendant Name']],
  ['Phone Number', ['Phone Number']],
  ['WhatsApp Number', ['WhatsApp Number']],
  ['Assigned Zone', ['Assigned Zone']],
  ['Store Type', ['Type of Store']],
  ['Daily Customer Traffic', ['Estimated Daily Customer Traffic']],
  ['Existing Financing Provider', ['Existing Financing Providers In Store']],
  ['Interested In QR Activation', ['Is Merchant Interested In QR Activation?']],
  ['Merchant Readiness', ['Merchant Readiness Level']],
  ['Additional Notes', ['Additional Notes']],
];

const DAILY_COLUMNS = [
  ['Date', ['Date', 'Timestamp']],
  ['Submission Timestamp', ['Timestamp']],
  ['Field Activity Date', ['Date']],
  ['Reporting Agent', ['Agent Name']],
  ['Assigned Zone', ['Assigned Zone']],
  ['Merchants Visited', ['Total Merchants Visited Today']],
  ['Interested But Not Enrolled', ["Interested Merchants But Couldn't Enroll"]],
  ['Enrolled Merchants', ['Enrolled Merchant']],
  ['Merchant Visit Comments', ['Comments On Merchant Visits']],
  ['Field Feedback / Recommendations', ['Overall Field Experience Feedbacks/Recommendations']],
];

const TRANSACTION_COLUMNS = [
  ['Transaction Type', []],
  ['Date', ['Timestamp']],
  ['Transaction Timestamp', ['Timestamp']],
  ['Store Name', ['Store Name', 'Store Name_1', 'Merchant Business Name']],
  ['Store Location', ['Store Location', 'Location']],
  ['Store Onboarded By', []],
  ['Device Sold By / Sales Agent', ['Agent Name', 'Agent Name_1', 'Field Agent Name']],
  ['Product Type', ['Product Type']],
  ['Device Type', ['Device Type', 'Device Type_1']],
  ['Device Model', ['Device Model', 'Device Model_1']],
  ['Device Amount', ['Device Price', 'Value', 'Device Amount']],
  ['Loan Value', ['Loan Amount', 'Loan Value']],
  ['Down Payment Made', ['Down Payment', 'Downpayment']],
  ['Tenure / Devpro Cover', ['Tenure', 'Type Of DevPro']],
];

function firstValue(row, aliases) {
  for (const key of aliases) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

function numberValue(value) {
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  if (!cleaned) return '';
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : value;
}

function parseRowDate(row, aliases) {
  const raw = firstValue(row, aliases);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const dayFirst = String(raw).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!dayFirst) return null;
  const [, day, month, year] = dayFirst;
  const fullYear = year.length === 2 ? `20${year}` : year;
  const fallback = new Date(Number(fullYear), Number(month) - 1, Number(day));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function filterByDate(rows, aliases, fromDate, toDate) {
  if (!fromDate && !toDate) return rows;
  const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
  return rows.filter((row) => {
    const date = parseRowDate(row, aliases);
    if (!date) return false;
    return (!from || date >= from) && (!to || date <= to);
  });
}

function buildOwnerLookup(onboarding) {
  const lookup = new Map();
  onboarding.forEach((row) => {
    const store = firstValue(row, ['Merchant Business Name', 'Store Name', 'Business Name']);
    const owner = firstValue(row, ['Field Agent Name', 'Agent Name']);
    if (store && owner) lookup.set(normalizeKey(store), owner);
  });
  return lookup;
}

function mapRows(rows, columns, enrich = () => ({})) {
  const usedKeys = new Set(columns.flatMap(([, aliases]) => aliases));
  return rows.map((row) => {
    const mapped = Object.fromEntries(columns.map(([header, aliases]) => {
      const value = firstValue(row, aliases);
      return [header, header === 'Date' ? formatExportDate(value) : value];
    }));
    const extras = Object.fromEntries(
      Object.entries(row)
        .filter(([key, value]) => !usedKeys.has(key) && String(value ?? '').trim() !== '')
        .map(([key, value]) => [`Source: ${key}`, value])
    );
    return { ...mapped, ...enrich(row), ...extras };
  });
}

function formatExportDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).split(' ')[0];
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function transactionRows(rows, type, ownerLookup) {
  return mapRows(rows, TRANSACTION_COLUMNS, (row) => {
    const store = firstValue(row, ['Store Name', 'Store Name_1', 'Merchant Business Name']);
    return {
      'Transaction Type': type,
      'Store Onboarded By': ownerLookup.get(normalizeKey(store)) || '',
      'Device Amount': numberValue(firstValue(row, ['Device Price', 'Value', 'Device Amount'])),
      'Loan Value': numberValue(firstValue(row, ['Loan Amount', 'Loan Value'])),
      'Down Payment Made': numberValue(firstValue(row, ['Down Payment', 'Downpayment'])),
    };
  });
}

function collectHeaders(rows, preferredHeaders) {
  const headers = [...preferredHeaders];
  const seen = new Set(headers);
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    });
  });
  return headers;
}

function buildSheet(name, rows, preferredHeaders) {
  return { name, rows, headers: collectHeaders(rows, preferredHeaders) };
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildExcelXml(sheets) {
  const worksheets = sheets.map((sheet) => {
    const headerCells = sheet.headers
      .map((header) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
      .join('');
    const dataRows = sheet.rows.map((row) => {
      const cells = sheet.headers.map((header) => {
        const value = row?.[header] ?? '';
        const isNumber = typeof value === 'number' && Number.isFinite(value);
        return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`;
      }).join('');
      return `<Row>${cells}</Row>`;
    }).join('');
    const columns = sheet.headers.map((header) => (
      `<Column ss:AutoFitWidth="0" ss:Width="${Math.min(240, Math.max(85, header.length * 7))}"/>`
    )).join('');

    return `<Worksheet ss:Name="${escapeXml(sheet.name.slice(0, 31))}">
      <Table>${columns}<Row ss:StyleID="Header">${headerCells}</Row>${dataRows}</Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane>
      </WorksheetOptions>
    </Worksheet>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1A73E8" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
  </Style>
 </Styles>
 ${worksheets}
</Workbook>`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAllReports(raw, { fromDate = '', toDate = '' } = {}) {
  const onboarding = filterByDate(raw?.onboarding || [], ['Timestamp'], fromDate, toDate);
  const daily = filterByDate(raw?.daily || [], ['Timestamp', 'Date'], fromDate, toDate);
  const devfinSource = filterByDate(raw?.devfin || [], ['Timestamp'], fromDate, toDate);
  const devproSource = filterByDate(raw?.devpro || [], ['Timestamp'], fromDate, toDate);
  const ownerLookup = buildOwnerLookup(raw?.onboarding || []);
  const devfin = transactionRows(devfinSource, 'Devfin', ownerLookup);
  const devpro = transactionRows(devproSource, 'Devpro', ownerLookup);

  const summaryRows = [
    { Report: 'Export From Date', 'Rows Exported': fromDate || 'All available dates' },
    { Report: 'Export To Date', 'Rows Exported': toDate || 'All available dates' },
    { Report: 'Merchant Onboarding', 'Rows Exported': onboarding.length },
    { Report: 'Daily Agent Reports', 'Rows Exported': daily.length },
    { Report: 'Devfin Transactions', 'Rows Exported': devfin.length },
    { Report: 'Devpro Transactions', 'Rows Exported': devpro.length },
    { Report: 'All Transactions', 'Rows Exported': devfin.length + devpro.length },
  ];
  const sheets = [
    buildSheet('Export Summary', summaryRows, ['Report', 'Rows Exported']),
    buildSheet('Store Onboarding', mapRows(onboarding, ONBOARDING_COLUMNS), ONBOARDING_COLUMNS.map(([header]) => header)),
    buildSheet('Daily Agent Reports', mapRows(daily, DAILY_COLUMNS), DAILY_COLUMNS.map(([header]) => header)),
    buildSheet('Devfin Transactions', devfin, TRANSACTION_COLUMNS.map(([header]) => header)),
    buildSheet('Devpro Transactions', devpro, TRANSACTION_COLUMNS.map(([header]) => header)),
    buildSheet('All Transactions', [...devfin, ...devpro], TRANSACTION_COLUMNS.map(([header]) => header)),
  ];

  const date = new Date().toISOString().slice(0, 10);
  const rangeLabel = fromDate || toDate ? `-${fromDate || 'start'}-to-${toDate || 'latest'}` : '';
  const baseFilename = `STEP-all-reports${rangeLabel}-${date}`;

  try {
    const response = await fetch('/.netlify/functions/export-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheets }),
    });
    if (!response.ok) throw new Error(`Export service returned ${response.status}`);
    downloadBlob(await response.blob(), `${baseFilename}.xlsx`);
  } catch (serverError) {
    console.warn('Using browser spreadsheet fallback:', serverError);
    const xml = buildExcelXml(sheets);
    downloadBlob(
      new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }),
      `${baseFilename}.xls`
    );
  }
}
