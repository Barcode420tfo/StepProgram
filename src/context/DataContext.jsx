import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { attachAgentIdentity, canonicalAgentName } from '../config/agentIdentity';
import { agentId, rowAgent } from '../config/agentIdentity';
import { attachStoreIdentity, buildStoreRegistry, storeName } from '../config/storeIdentity';
import { useAuth } from './AuthContext';
import { ROLES } from '../config/accessControl';
import { FALLBACK } from '../utils/fallbackData';
import { uniq } from '../utils/dataUtils';

const DataContext = createContext(null);

const INIT_RAW = {
  onboarding: [...FALLBACK.onboarding],
  daily: [],
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

function buildDailyActivities(onboarding, devfin, devpro) {
  const activities = [];
  const add = (rows, activityType, source) => {
    rows.forEach((row, index) => {
      const timestamp = String(row.Timestamp || row.Date || row['Transaction Date'] || '').trim();
      if (!timestamp) return;
      activities.push({
        ...row,
        Timestamp: timestamp,
        'Activity Type': activityType,
        'Activity Source': source,
        'Activity ID': `${source}-${index}-${buildPerformanceRowFingerprint(row)}`,
        'Agent Name': row['Agent Name'] || row['Field Agent Name'] || row['Sale Owner'] || 'Unassigned',
        'Assigned Zone': row['Assigned Zone'] || row['Store Location'] || row.Territory || 'Unassigned',
        'Store Name': storeName(row) || '—',
      });
    });
  };
  add(onboarding, 'Merchant Acquisition', 'Merchant Acquisition Sheet');
  add(devfin, 'DEVFIN', 'DEVFIN Sheet');
  add(devpro, 'DEVPRO', 'DEVPRO Sheet');
  return activities;
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

  ['Field Agent Name', 'Agent Name', 'Sale Owner', 'Sales Agent'].forEach((key) => {
    if (normalized[key]) normalized[key] = canonicalAgentName(normalized[key]);
  });
  return attachAgentIdentity(normalized);
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
  normalized['Agent Name'] = canonicalAgentName(preferredAgentName);
  normalized['Product Type'] = String(normalized['Product Type'] || '').trim();
  normalized['Type Of DevPro'] = String(normalized['Type Of DevPro'] || '').trim();

  return attachAgentIdentity(normalized);
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
  const markers = [
    row?.Timestamp,
    row?.['Device Model'],
    row?.['Device Model_1'],
    row?.['Store Location'],
    row?.['Store Name'],
    row?.['Store Name_1'],
    row?.['Store Name_2'],
  ]
    .map((value) => String(value || '').trim().toLowerCase());

  const hasTotals = [
    row?.['Device Price'],
    row?.['Loan Amount'],
    row?.['Down Payment'],
    row?.Value,
  ].some((value) => parseCurrencyValue(value) > 0);

  return hasTotals && markers.includes('total');
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
  const { role, profile } = useAuth();
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
  const rawRef = useRef(INIT_RAW);
  const refreshInFlightRef = useRef(false);
  const refreshAbortRef = useRef(null);
  // Tracks new rows found since last fetch — consumed by Dashboard for notifications
  const [newRowDelta, setNewRowDelta] = useState({
    daily: 0,
    onboarding: 0,
    agents: [],
    salesUpdates: [],
  });

  useEffect(() => {
    rawRef.current = raw;
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
    // Mobile browsers can become unstable when the initial fetch, the manual
    // refresh button and the poller overlap. One refresh at a time is enough.
    if (refreshInFlightRef.current) return false;
    refreshInFlightRef.current = true;
    if (!silent) setIsRefreshing(true);
    if (!silent) setStatus({ type: 'loading', message: 'Fetching live data from Google Sheets...' });
    let timer;
    try {
      // Both environments use a server-side proxy so browser CORS rules never
      // block the Google Sheets CSV exports.
      const urls = import.meta.env.PROD
        ? {
            onboarding: '/.netlify/functions/sheets?source=onboarding',
            devfin: '/.netlify/functions/sheets?source=devfin',
            devpro: '/.netlify/functions/sheets?source=devpro',
          }
        : {
            onboarding: '/api/sheets?source=onboarding',
            devfin: '/api/sheets?source=devfin',
            devpro: '/api/sheets?source=devpro',
          };

      const ctrl = new AbortController();
      refreshAbortRef.current = ctrl;
      timer = setTimeout(() => ctrl.abort(), 15000);
      const [onboardingResponse, devfinResponse, devproResponse] = await Promise.all([
        fetch(`${urls.onboarding}&refresh=${Date.now()}`, { signal: ctrl.signal, cache: 'no-store' }),
        fetch(`${urls.devfin}&refresh=${Date.now()}`, { signal: ctrl.signal, cache: 'no-store' }),
        fetch(`${urls.devpro}&refresh=${Date.now()}`, { signal: ctrl.signal, cache: 'no-store' }),
      ]);
      if (!onboardingResponse.ok || !devfinResponse.ok || !devproResponse.ok) {
        throw new Error(
          `Sheet returned ${
            !onboardingResponse.ok ? onboardingResponse.status
              : !devfinResponse.ok ? devfinResponse.status
              : devproResponse.status
          }`
        );
      }
      const [onboardingText, devfinText, devproText] = await Promise.all([
        onboardingResponse.text(),
        devfinResponse.text(),
        devproResponse.text(),
      ]);
      const parseOpts = {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim().replace(/\s+/g, ' '),
        transform: v => typeof v === 'string' ? v.trim() : v,
      };
      const parsedOnboarding = sanitizeRows(Papa.parse(onboardingText, parseOpts).data);
      const storeRegistry = buildStoreRegistry(parsedOnboarding);
      const p1 = parsedOnboarding.map((row) => attachStoreIdentity(row, storeRegistry));
      const devfinParsed = Papa.parse(normalizePerformanceCsvHeaders(devfinText), parseOpts).data;
      const devproParsed = Papa.parse(normalizePerformanceCsvHeaders(devproText), parseOpts).data;
      const devfinSummary = extractPerformanceSummary(devfinParsed);
      const devproSummary = extractPerformanceSummary(devproParsed);
      const p3 = sanitizeRows(devfinParsed.filter((row) => !isPerformanceSummaryRow(row)), normalizePerformanceRowValues).map((row) => attachStoreIdentity(row, storeRegistry));
      const p4 = sanitizeRows(devproParsed.filter((row) => !isPerformanceSummaryRow(row)), normalizePerformanceRowValues).map((row) => attachStoreIdentity(row, storeRegistry));
      const dailyActivities = buildDailyActivities(p1, p3, p4);
      const newRaw = {
        onboarding: p1,
        daily: dailyActivities,
        devfin: p3,
        devpro: p4,
      };
      const newMeta = {
        devfinSummary,
        devproSummary,
      };
      // Detect new acquisition rows and which agents added them
      const previousRaw = rawRef.current;
      const prevOnbCount   = previousRaw.onboarding.length;
      const prevAgents = new Set(previousRaw.onboarding.map(r => r['Field Agent Name']));
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
          const prevKeys = new Set((previousRaw[source.key] || []).map(buildPerformanceRowFingerprint));
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
      rawRef.current = newRaw;
      setMeta(newMeta);
      const now = new Date();
      setLastUpdated(now);
      if (!silent) {
        setStatus({
          type: 'ok',
          message: `✓ 3 live sheets synced — ${newRaw.onboarding.length} acquisitions, ${newRaw.devfin.length} DEVFIN rows, ${newRaw.devpro.length} DEVPRO rows · ${newRaw.daily.length} timestamped daily activities at ${now.toLocaleTimeString()}`,
        });
      }
    } catch (e) {
      if (!silent) {
        setStatus({
          type: 'err',
          message: `Could not reach Google Sheets (${e.message || 'blocked'}) — showing last known data.`,
        });
      }
    } finally {
      if (timer) clearTimeout(timer);
      refreshAbortRef.current = null;
      refreshInFlightRef.current = false;
      if (!silent) setIsRefreshing(false);
    }
    return true;
  }, []);

  // Initial load
  useEffect(() => {
    const t = setTimeout(() => refresh(), 300);
    return () => {
      clearTimeout(t);
      refreshAbortRef.current?.abort();
    };
  }, [refresh]);

  // Silent auto-poll every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => refresh(true), 120000);
    return () => clearInterval(interval);
  }, [refresh]);

  const allowedAgentIds = role === ROLES.GROWTH_PARTNER
    ? [profile?.portfolio?.name, profile?.portfolio?.agent].filter(Boolean).map(agentId).filter(Boolean)
    : role === ROLES.SALES_AGENT
      ? [profile?.portfolio?.name].filter(Boolean).map(agentId).filter(Boolean)
      : [];
  const supervisorTerritory = String(profile?.portfolio?.territory || '').toLowerCase();
  const isSupervisorRow = (row) => Boolean(supervisorTerritory) && String(row?.['Assigned Zone'] || row?.['Store Location'] || row?.Territory || '').toLowerCase().includes(supervisorTerritory);
  const scopedRaw = role === ROLES.ADMIN ? raw : Object.fromEntries(Object.entries(raw).map(([key, rows]) => [key, (rows || []).filter((row) => role === ROLES.SUPERVISOR ? isSupervisorRow(row) : allowedAgentIds.includes(rowAgent(row)?.id))]));
  const scopedFiltered = applyFilters(scopedRaw, filters);
  const scopedFilterOptions = buildFilterOptions(scopedRaw);

  return (
    <DataContext.Provider value={{
      raw, scopedRaw, meta: role === ROLES.ADMIN ? meta : INIT_META, filtered: role === ROLES.ADMIN ? filtered : scopedFiltered, filters, filterOptions: role === ROLES.ADMIN ? filterOptions : scopedFilterOptions,
      setFilter, clearAllFilters,
      refresh, status, isRefreshing, lastUpdated,
      newRowDelta, clearNewRowDelta,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
