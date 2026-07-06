import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { FALLBACK, SHEET_URLS } from '../utils/fallbackData';
import { uniq } from '../utils/dataUtils';

const DataContext = createContext(null);

const INIT_RAW = {
  onboarding: [...FALLBACK.onboarding],
  daily: [...FALLBACK.daily],
  devfin: [...(FALLBACK.devfin || [])],
  devpro: [...(FALLBACK.devpro || [])],
};

const INIT_META = {
  devfinSummary: null,
  devproSummary: null,
};

const INIT_FILTERS = {
  zone: '',
  agent: '',
  date: '',
  storeType: '',
  readiness: '',
  traffic: '',
  qrInterest: '',
};

function toDateKey(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
}

function getDailySubmissionDateKey(row) {
  return toDateKey(row?.Timestamp || row?.Date);
}

function applyFilters(raw, filters) {
  const { zone, agent, date, storeType, readiness, traffic, qrInterest } = filters;
  return {
    onboarding: raw.onboarding.filter(x =>
      (!zone       || x['Assigned Zone'] === zone) &&
      (!agent      || x['Field Agent Name'] === agent) &&
      (!storeType  || x['Type of Store'] === storeType) &&
      (!readiness  || x['Merchant Readiness Level'] === readiness) &&
      (!traffic    || x['Estimated Daily Customer Traffic'] === traffic) &&
      (!qrInterest || x['Is Merchant Interested In QR Activation?'] === qrInterest)
    ),
    daily: raw.daily.filter(x =>
      (!zone  || x['Assigned Zone'] === zone) &&
      (!agent || x['Agent Name'] === agent) &&
      (!date  || getDailySubmissionDateKey(x) === date)
    ),
    devfin: raw.devfin,
    devpro: raw.devpro,
  };
}

function buildFilterOptions(raw) {
  return {
    zones: uniq([
      ...raw.onboarding.map(r => r['Assigned Zone']),
      ...raw.daily.map(r => r['Assigned Zone']),
    ]),
    agents: uniq([
      ...raw.onboarding.map(r => r['Field Agent Name']),
      ...raw.daily.map(r => r['Agent Name']),
    ]),
    dates: uniq(raw.daily.map(r => getDailySubmissionDateKey(r)).filter(Boolean)).sort(),
    storeTypes: uniq(raw.onboarding.map(r => r['Type of Store'])),
    readiness: uniq(raw.onboarding.map(r => r['Merchant Readiness Level'])),
    trafficBands: uniq(raw.onboarding.map(r => r['Estimated Daily Customer Traffic'])),
    qrInterest: uniq(raw.onboarding.map(r => r['Is Merchant Interested In QR Activation?'])),
  };
}

function sanitizeRows(rows, normalizeRow = normalizeRowValues) {
  return rows
    .filter((row) => {
      if (!row || typeof row !== 'object') return false;
      return Object.values(row).some((value) => String(value || '').trim() !== '');
    })
    .map(normalizeRow);
}

function normalizeRowValues(row) {
  const normalized = { ...row };
  const aliasMaps = {
    'Field Agent Name': {
      'Chilee Nwaiwu': 'Chilee nwaiwu',
      'Chile Nwaiwu': 'Chilee nwaiwu',
      'Chile Nwaiwu91k': 'Chilee nwaiwu',
      'Chilee nwaiwu': 'Chilee nwaiwu',
    },
    'Agent Name': {
      'Chilee Nwaiwu': 'Chilee nwaiwu',
      'Chile Nwaiwu': 'Chilee nwaiwu',
      'Chile Nwaiwu91k': 'Chilee nwaiwu',
      'Chilee nwaiwu': 'Chilee nwaiwu',
    },
    'Assigned Zone': {
      'Unilag/akoka': 'UNILAG',
      'Unilag': 'UNILAG',
      'Computer Village': 'Computer Village',
      'Surulere/lawanson': 'Surulere/Lawanson',
    },
  };
  const titleCaseKeys = [
    'Who Are You Onboarding?',
    'Merchant Readiness Level',
    'Is Merchant Interested In QR Activation?',
    'Existing Financing Providers In Store',
  ];

  titleCaseKeys.forEach((key) => {
    if (normalized[key]) normalized[key] = toTitleCase(normalized[key]);
  });

  Object.entries(aliasMaps).forEach(([key, map]) => {
    if (!normalized[key]) return;
    const value = toTitleCase(normalized[key]);
    normalized[key] = map[value] || normalized[key].trim();
  });

  return normalized;
}

function normalizePerformanceRowValues(row) {
  const normalized = { ...row };
  const preferredStoreName = String(normalized['Store Name_1'] || normalized['Store Name'] || '').trim();
  const preferredLocation = String(normalized['Store Location'] || normalized['Location'] || '').trim();
  const preferredDeviceType = String(normalized['Device Type_1'] || normalized['Device Type'] || '').trim();
  const preferredDeviceModel = String(normalized['Device Model_1'] || normalized['Device Model'] || '').trim();
  const preferredAgentName = String(normalized['Agent Name_1'] || normalized['Agent Name'] || '').trim();

  normalized['Store Name'] = preferredStoreName;
  normalized['Store Location'] = toTitleCase(preferredLocation);
  normalized['Device Type'] = preferredDeviceType;
  normalized['Device Model'] = preferredDeviceModel;
  normalized['Agent Name'] = preferredAgentName;
  normalized['Product Type'] = String(normalized['Product Type'] || '').trim();
  normalized['Type Of DevPro'] = String(normalized['Type Of DevPro'] || '').trim();

  return normalized;
}

function normalizePerformanceCsvHeaders(csvText) {
  const lines = String(csvText || '').split(/\r?\n/);
  if (!lines.length) return csvText;

  const seen = new Map();
  lines[0] = lines[0]
    .split(',')
    .map((header) => {
      const clean = header.trim();
      const count = seen.get(clean) || 0;
      seen.set(clean, count + 1);
      return count === 0 ? clean : `${clean}_${count}`;
    })
    .join(',');

  return lines.join('\n');
}

function parseCurrencyValue(value) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function isPerformanceSummaryRow(row) {
  const deviceModel = String(row?.['Device Model'] || '').trim().toLowerCase();
  const timestamp = String(row?.Timestamp || '').trim().toLowerCase();
  return deviceModel === 'total' || timestamp === 'total';
}

function extractPerformanceSummary(rows) {
  const summaryRow = rows.find(isPerformanceSummaryRow);
  if (!summaryRow) return null;

  return {
    totalBookedValue: parseCurrencyValue(summaryRow['Device Price'] || summaryRow.Value),
    totalLoanAmount: parseCurrencyValue(summaryRow['Loan Amount']),
    totalDownPayment: parseCurrencyValue(summaryRow['Down Payment']),
  };
}

function buildPerformanceRowFingerprint(row) {
  return [
    row?.Timestamp,
    row?.['Product Type'],
    row?.['Store Name'],
    row?.['Store Location'],
    row?.['Device Type'],
    row?.['Device Model'],
    row?.['Device Price'],
    row?.['Loan Amount'],
    row?.['Down Payment'],
    row?.Value,
    row?.Tenure,
    row?.['Type Of DevPro'],
  ]
    .map((value) => String(value || '').trim())
    .join('|');
}

function toTitleCase(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function DataProvider({ children }) {
  const [raw, setRaw] = useState(INIT_RAW);
  const [meta, setMeta] = useState(INIT_META);
  const [filters, setFilters] = useState(INIT_FILTERS);
  const [filtered, setFiltered] = useState(applyFilters(INIT_RAW, INIT_FILTERS));
  const [filterOptions, setFilterOptions] = useState(buildFilterOptions(INIT_RAW));
  const [status, setStatus] = useState({
    type: 'loading',
    message: 'Connecting to live Google Sheets data...',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Tracks new rows found since last fetch — consumed by Dashboard for notifications
  const [newRowDelta, setNewRowDelta] = useState({
    daily: 0,
    onboarding: 0,
    agents: [],
    salesUpdates: [],
  });

  useEffect(() => {
    setFiltered(applyFilters(raw, filters));
    setFilterOptions(buildFilterOptions(raw));
  }, [raw, filters]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(INIT_FILTERS);
  }, []);

  const clearNewRowDelta = useCallback(() => {
    setNewRowDelta({
      daily: 0,
      onboarding: 0,
      agents: [],
      salesUpdates: [],
    });
  }, []);

  const refresh = useCallback(async (silent = false) => {
    silent = silent === true;
    if (!silent) setIsRefreshing(true);
    if (!silent) setStatus({ type: 'loading', message: 'Fetching live data from Google Sheets...' });
    try {
      // In production (Netlify) fetch via server-side proxy to avoid CORS.
      // In local dev, hit the sheets directly.
      const urls = import.meta.env.PROD
        ? {
            onboarding: '/.netlify/functions/sheets?source=onboarding',
            daily: '/.netlify/functions/sheets?source=daily',
            devfin: '/.netlify/functions/sheets?source=devfin',
            devpro: '/.netlify/functions/sheets?source=devpro',
          }
        : SHEET_URLS;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const [onboardingResponse, dailyResponse, devfinResponse, devproResponse] = await Promise.all([
        fetch(urls.onboarding, { signal: ctrl.signal }),
        fetch(urls.daily, { signal: ctrl.signal }),
        fetch(urls.devfin, { signal: ctrl.signal }),
        fetch(urls.devpro, { signal: ctrl.signal }),
      ]);
      clearTimeout(timer);
      if (!onboardingResponse.ok || !dailyResponse.ok || !devfinResponse.ok || !devproResponse.ok) {
        throw new Error(
          `Sheet returned ${
            !onboardingResponse.ok ? onboardingResponse.status
              : !dailyResponse.ok ? dailyResponse.status
              : !devfinResponse.ok ? devfinResponse.status
              : devproResponse.status
          }`
        );
      }
      const [onboardingText, dailyText, devfinText, devproText] = await Promise.all([
        onboardingResponse.text(),
        dailyResponse.text(),
        devfinResponse.text(),
        devproResponse.text(),
      ]);
      const parseOpts = {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim().replace(/\s+/g, ' '),
        transform: v => typeof v === 'string' ? v.trim() : v,
      };
      const p1 = sanitizeRows(Papa.parse(onboardingText, parseOpts).data);
      const p2 = sanitizeRows(Papa.parse(dailyText, parseOpts).data);
      const devfinParsed = Papa.parse(normalizePerformanceCsvHeaders(devfinText), parseOpts).data;
      const devproParsed = Papa.parse(normalizePerformanceCsvHeaders(devproText), parseOpts).data;
      const devfinSummary = extractPerformanceSummary(devfinParsed);
      const devproSummary = extractPerformanceSummary(devproParsed);
      const p3 = sanitizeRows(devfinParsed.filter((row) => !isPerformanceSummaryRow(row)), normalizePerformanceRowValues);
      const p4 = sanitizeRows(devproParsed.filter((row) => !isPerformanceSummaryRow(row)), normalizePerformanceRowValues);
      const newRaw = {
        onboarding: p1,
        daily: p2,
        devfin: p3,
        devpro: p4,
      };
      const newMeta = {
        devfinSummary,
        devproSummary,
      };
      // Detect new acquisition rows and which agents added them
      const prevOnbCount   = raw.onboarding.length;
      const prevAgents = new Set(raw.onboarding.map(r => r['Field Agent Name']));
      const newAgents  = newRaw.onboarding
        .filter(r => !prevAgents.has(r['Field Agent Name']) || newRaw.onboarding.length > prevOnbCount)
        .map(r => r['Field Agent Name'])
        .filter((v, i, a) => a.indexOf(v) === i);
      const salesSources = [
        { key: 'devfin', label: 'Devfin' },
        { key: 'devpro', label: 'Devpro' },
      ];
      const salesUpdates = salesSources
        .map((source) => {
          const prevKeys = new Set((raw[source.key] || []).map(buildPerformanceRowFingerprint));
          const freshRows = (newRaw[source.key] || []).filter(
            (row) => !prevKeys.has(buildPerformanceRowFingerprint(row))
          );
          return {
            source: source.label,
            count: freshRows.length,
            stores: uniq(freshRows.map((row) => row['Store Name'])),
            locations: uniq(freshRows.map((row) => row['Store Location'])),
          };
        })
        .filter((item) => item.count > 0);

      const onbDelta   = Math.max(0, newRaw.onboarding.length - prevOnbCount);
      if (onbDelta > 0 || salesUpdates.length > 0) {
        setNewRowDelta({
          daily: 0,
          onboarding: onbDelta,
          agents: newAgents,
          salesUpdates,
        });
      }

      setRaw(newRaw);
      setMeta(newMeta);
      const now = new Date();
      setLastUpdated(now);
      if (!silent) {
        setStatus({
          type: 'ok',
          message: `✓ 4 live sheets synced — ${newRaw.onboarding.length} acquisitions, ${newRaw.daily.length} daily reports, ${newRaw.devfin.length} Devfin rows, ${newRaw.devpro.length} Devpro rows at ${now.toLocaleTimeString()}`,
        });
      }
    } catch (e) {
      if (!silent) {
        setStatus({
          type: 'err',
          message: `Could not reach Google Sheets (${e.message || 'blocked'}) — showing last known data.`,
        });
      }
    }
    if (!silent) setIsRefreshing(false);
  }, [raw]);

  // Initial load
  useEffect(() => {
    const t = setTimeout(() => refresh(), 300);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Silent auto-poll every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => refresh(true), 120000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <DataContext.Provider value={{
      raw, meta, filtered, filters, filterOptions,
      setFilter, clearAllFilters,
      refresh, status, isRefreshing, lastUpdated,
      newRowDelta, clearNewRowDelta,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
