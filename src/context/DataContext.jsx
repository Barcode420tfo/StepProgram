import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { FALLBACK, SHEET_URLS } from '../utils/fallbackData';
import { uniq } from '../utils/dataUtils';

const DataContext = createContext(null);

const INIT_RAW = {
  onboarding: [...FALLBACK.onboarding],
  daily: [...FALLBACK.daily],
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
      (!date  || toDateKey(x['Date'] || x['Timestamp']) === date)
    ),
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
    dates: uniq(raw.daily.map(r => toDateKey(r['Date'] || r['Timestamp'])).filter(Boolean)).sort(),
    storeTypes: uniq(raw.onboarding.map(r => r['Type of Store'])),
    readiness: uniq(raw.onboarding.map(r => r['Merchant Readiness Level'])),
    trafficBands: uniq(raw.onboarding.map(r => r['Estimated Daily Customer Traffic'])),
    qrInterest: uniq(raw.onboarding.map(r => r['Is Merchant Interested In QR Activation?'])),
  };
}

function sanitizeRows(rows) {
  return rows
    .filter((row) => {
      if (!row || typeof row !== 'object') return false;
      return Object.values(row).some((value) => String(value || '').trim() !== '');
    })
    .map(normalizeRowValues);
}

function normalizeRowValues(row) {
  const normalized = { ...row };
  const aliasMaps = {
    'Field Agent Name': {
      'Chilee Nwaiwu': 'Chilee nwaiwu',
      'Chile Nwaiwu': 'Chilee nwaiwu',
      'Chilee nwaiwu': 'Chilee nwaiwu',
    },
    'Agent Name': {
      'Chilee Nwaiwu': 'Chilee nwaiwu',
      'Chile Nwaiwu': 'Chilee nwaiwu',
      'Chilee nwaiwu': 'Chilee nwaiwu',
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
  const [newRowDelta, setNewRowDelta] = useState({ daily: 0, onboarding: 0, agents: [] });

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
    setNewRowDelta({ daily: 0, onboarding: 0, agents: [] });
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
          }
        : SHEET_URLS;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const [onboardingResponse, dailyResponse] = await Promise.all([
        fetch(urls.onboarding, { signal: ctrl.signal }),
        fetch(urls.daily, { signal: ctrl.signal }),
      ]);
      clearTimeout(timer);
      if (!onboardingResponse.ok || !dailyResponse.ok) {
        throw new Error(`Sheet returned ${!onboardingResponse.ok ? onboardingResponse.status : dailyResponse.status}`);
      }
      const [onboardingText, dailyText] = await Promise.all([
        onboardingResponse.text(),
        dailyResponse.text(),
      ]);
      const parseOpts = {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim().replace(/\s+/g, ' '),
        transform: v => typeof v === 'string' ? v.trim() : v,
      };
      const p1 = sanitizeRows(Papa.parse(onboardingText, parseOpts).data);
      const p2 = sanitizeRows(Papa.parse(dailyText, parseOpts).data);
      const newRaw = {
        onboarding: p1,
        daily: p2,
      };
      // Detect new acquisition rows and which agents added them
      const prevOnbCount   = raw.onboarding.length;
      const prevAgents = new Set(raw.onboarding.map(r => r['Field Agent Name']));
      const newAgents  = newRaw.onboarding
        .filter(r => !prevAgents.has(r['Field Agent Name']) || newRaw.onboarding.length > prevOnbCount)
        .map(r => r['Field Agent Name'])
        .filter((v, i, a) => a.indexOf(v) === i);

      const onbDelta   = Math.max(0, newRaw.onboarding.length - prevOnbCount);
      if (onbDelta > 0) {
        setNewRowDelta({ daily: 0, onboarding: onbDelta, agents: newAgents });
      }

      setRaw(newRaw);
      const now = new Date();
      setLastUpdated(now);
      if (!silent) {
        setStatus({
          type: 'ok',
          message: `✓ Live acquisition sheet — ${newRaw.onboarding.length} records synced at ${now.toLocaleTimeString()}`,
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
      raw, filtered, filters, filterOptions,
      setFilter, clearAllFilters,
      refresh, status, isRefreshing, lastUpdated,
      newRowDelta, clearNewRowDelta,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
