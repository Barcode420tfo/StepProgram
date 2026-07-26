const ONBOARDING_COLUMNS = [
  ['Captured At', ['Timestamp']],
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
    const mapped = Object.fromEntries(columns.map(([header, aliases]) => [header, firstValue(row, aliases)]));
    const extras = Object.fromEntries(
      Object.entries(row)
        .filter(([key, value]) => !usedKeys.has(key) && String(value ?? '').trim() !== '')
        .map(([key, value]) => [`Source: ${key}`, value])
    );
    return { ...mapped, ...enrich(row), ...extras };
  });
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

function addWorksheet(workbook, name, rows, preferredHeaders) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 18 },
  });
  const headers = collectHeaders(rows, preferredHeaders);
  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(42, Math.max(14, header.length + 3)),
  }));
  rows.forEach((row) => sheet.addRow(row));
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: Math.max(1, headers.length) } };
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  sheet.getRow(1).height = 32;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.alignment = { vertical: 'top', wrapText: true };
  });
}

export async function exportAllReports(raw, { fromDate = '', toDate = '' } = {}) {
  const { default: ExcelJS } = await import('exceljs');
  const onboarding = filterByDate(raw?.onboarding || [], ['Timestamp'], fromDate, toDate);
  const daily = filterByDate(raw?.daily || [], ['Timestamp', 'Date'], fromDate, toDate);
  const devfinSource = filterByDate(raw?.devfin || [], ['Timestamp'], fromDate, toDate);
  const devproSource = filterByDate(raw?.devpro || [], ['Timestamp'], fromDate, toDate);
  const ownerLookup = buildOwnerLookup(raw?.onboarding || []);
  const devfin = transactionRows(devfinSource, 'Devfin', ownerLookup);
  const devpro = transactionRows(devproSource, 'Devpro', ownerLookup);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'STEP Network Live Ops';
  workbook.created = new Date();

  const summaryRows = [
    { Report: 'Export From Date', 'Rows Exported': fromDate || 'All available dates' },
    { Report: 'Export To Date', 'Rows Exported': toDate || 'All available dates' },
    { Report: 'Merchant Onboarding', 'Rows Exported': onboarding.length },
    { Report: 'Daily Agent Reports', 'Rows Exported': daily.length },
    { Report: 'Devfin Transactions', 'Rows Exported': devfin.length },
    { Report: 'Devpro Transactions', 'Rows Exported': devpro.length },
    { Report: 'All Transactions', 'Rows Exported': devfin.length + devpro.length },
  ];
  addWorksheet(workbook, 'Export Summary', summaryRows, ['Report', 'Rows Exported']);
  addWorksheet(
    workbook,
    'Store Onboarding',
    mapRows(onboarding, ONBOARDING_COLUMNS),
    ONBOARDING_COLUMNS.map(([header]) => header)
  );
  addWorksheet(
    workbook,
    'Daily Agent Reports',
    mapRows(daily, DAILY_COLUMNS),
    DAILY_COLUMNS.map(([header]) => header)
  );
  addWorksheet(workbook, 'Devfin Transactions', devfin, TRANSACTION_COLUMNS.map(([header]) => header));
  addWorksheet(workbook, 'Devpro Transactions', devpro, TRANSACTION_COLUMNS.map(([header]) => header));
  addWorksheet(workbook, 'All Transactions', [...devfin, ...devpro], TRANSACTION_COLUMNS.map(([header]) => header));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  const rangeLabel = fromDate || toDate ? `-${fromDate || 'start'}-to-${toDate || 'latest'}` : '';
  link.href = url;
  link.download = `STEP-all-reports${rangeLabel}-${date}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
