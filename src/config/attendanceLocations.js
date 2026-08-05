export const GROWTH_PARTNER_ATTENDANCE = Object.freeze({
  Jessica: { storeName: 'Pending designated store', latitude: null, longitude: null, radius: 100 },
  Towobola: { storeName: 'Pending designated store', latitude: null, longitude: null, radius: 100 },
  'Chile Nwaiwu': { storeName: 'Pending designated store', latitude: null, longitude: null, radius: 100 },
  Mohammed: { storeName: 'Pending designated store', latitude: null, longitude: null, radius: 100 },
  Esther: { storeName: 'Pending designated store', latitude: null, longitude: null, radius: 100 },
  Sarah: { storeName: 'Pending designated store', latitude: null, longitude: null, radius: 100 },
});

export const SALES_AGENT_ATTENDANCE = Object.freeze({
  Peace: { storeName: 'AL mahbub technology', latitude: 6.59610, longitude: 3.34004, radius: 100 },
});

export function getGrowthPartnerAttendanceLocation(name) {
  return GROWTH_PARTNER_ATTENDANCE[String(name || '').trim()] || null;
}

export function getAttendanceLocation(name) {
  const key = String(name || '').trim();
  return SALES_AGENT_ATTENDANCE[key] || GROWTH_PARTNER_ATTENDANCE[key] || null;
}
