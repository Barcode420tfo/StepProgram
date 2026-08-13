export const GROWTH_PARTNER_ATTENDANCE = Object.freeze({
  Jessica: { storeName: 'AL mahbub technology', latitude: 6.59639, longitude: 3.33986, radius: 100 },
  Towobola: { storeName: 'Royaline Technology Limited', latitude: 6.59584, longitude: 3.33870, radius: 100 },
  'Chile Nwaiwu': { storeName: 'Go Sky Lawanson Ikenedu', latitude: 6.51033, longitude: 3.33829, radius: 100 },
  Mohammed: { storeName: 'Segzy Ventures', latitude: 6.51966, longitude: 3.38231, radius: 100 },
  Esther: { storeName: 'Sky Communication', latitude: 6.63194, longitude: 3.53490, radius: 100 },
  Sarah: { storeName: 'FM Reliable', latitude: 6.67311, longitude: 3.29077, radius: 100 },
});

export const SALES_AGENT_ATTENDANCE = Object.freeze({
  Peace: { storeName: 'AL mahbub technology', latitude: 6.59639, longitude: 3.33986, radius: 100 },
  Ifeoma: { storeName: 'Adaugo Telecoms', latitude: 6.51260, longitude: 3.34982, radius: 100 },
  Queen: { storeName: 'Royaline Technology Limited', latitude: 6.59584, longitude: 3.33870, radius: 100 },
});

export function getGrowthPartnerAttendanceLocation(name) {
  return GROWTH_PARTNER_ATTENDANCE[String(name || '').trim()] || null;
}

export function getAttendanceLocation(name) {
  const key = String(name || '').trim();
  return SALES_AGENT_ATTENDANCE[key] || GROWTH_PARTNER_ATTENDANCE[key] || null;
}
