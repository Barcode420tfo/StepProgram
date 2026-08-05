const KEY = 'step-mock-attendance-v1';
export const MOCK_ATTENDANCE_EVENT = 'step-mock-attendance-updated';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function getMockAttendance(agentName) {
  return readAll()[agentName] || null;
}

function save(agentName, record) {
  const all = readAll();
  all[agentName] = record;
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent(MOCK_ATTENDANCE_EVENT, { detail: { agentName, record } }));
  return record;
}

export function mockClockIn(agentName = 'Peace') {
  const now = new Date();
  return save(agentName, {
    id: `mock-${agentName.toLowerCase()}-${Date.now()}`,
    mock: true,
    agentName,
    date: now.toISOString().slice(0, 10),
    status: 'Present',
    clockIn: '8:54 AM',
    clockOut: null,
    store: 'POINTEK, Computer Village',
    distance: 24,
    accuracy: 18,
    geofence: 'Inside geofence',
    latitude: '6.6018',
    longitude: '3.3515',
    note: 'Interactive mock clock-in',
    engagements: 0,
    createdAt: now.toISOString(),
  });
}

export function mockClockOut(agentName = 'Peace') {
  const current = getMockAttendance(agentName);
  if (!current?.clockIn) return current;
  return save(agentName, {
    ...current,
    clockOut: '6:03 PM',
    clockOutDistance: 31,
    clockOutAccuracy: 21,
    note: 'Interactive mock shift completed',
    updatedAt: new Date().toISOString(),
  });
}

export function resetMockAttendance(agentName = 'Peace') {
  const all = readAll();
  delete all[agentName];
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent(MOCK_ATTENDANCE_EVENT, { detail: { agentName, record: null } }));
}
