import { useEffect, useState } from 'react';
import { getAttendanceLocation } from '../../config/attendanceLocations';
import { auth } from '../../lib/firebase';

function captureLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is unavailable on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(coords),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) reject(new Error('Location permission was denied. Allow location access and try again.'));
        else if (error.code === error.TIMEOUT) reject(new Error('Location capture timed out. Move outside and try again.'));
        else reject(new Error('Your location could not be captured. Please try again.'));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

async function attendanceRequest(action, coordinates, exceptionReason = '') {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Your login session is unavailable. Sign in again and retry.');
  const token = await currentUser.getIdToken();
  const response = await fetch('/.netlify/functions/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      action,
      ...(coordinates ? {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy,
      } : {}),
      ...(exceptionReason ? { exceptionReason } : {}),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Attendance request failed.');
    error.details = data;
    throw error;
  }
  return data;
}

function timeLabel(value) {
  return value ? new Date(value).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }) : '—';
}

export default function GrowthPartnerAttendance({ name, roleLabel = 'Growth Partner' }) {
  const location = getAttendanceLocation(name);
  const configured = Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [serverOffset, setServerOffset] = useState(0);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    let active = true;
    if (!configured) { setLoading(false); return () => { active = false; }; }
    setLoading(true);
    attendanceRequest('status')
      .then((data) => { if (active) { setRecord(data.attendance); if(data.serverTime)setServerOffset(new Date(data.serverTime).getTime()-Date.now()); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [configured, name]);

  useEffect(() => {
    if (!record?.clockIn || record?.clockOut) return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [record?.clockIn, record?.clockOut]);

  const clockOutAvailableAt = record?.clockOutAvailableAt ? new Date(record.clockOutAvailableAt) : null;
  const serverNow = clock + serverOffset;
  const clockOutReady = Boolean(clockOutAvailableAt && serverNow >= clockOutAvailableAt.getTime());
  const clockOutLabel = clockOutAvailableAt ? clockOutAvailableAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }) : '';

  const act = async (action) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const gps = await captureLocation();
      let result;
      try {
        result = await attendanceRequest(action, gps);
      } catch (requestError) {
        if (action !== 'clock_out' || !requestError.details?.requiresReason) throw requestError;
        const reason = window.prompt(`You are ${requestError.details.distance}m from your attendance store. Enter the reason for clocking out outside the geofence:`);
        if (!reason?.trim()) throw new Error('Clock-out cancelled. An exception reason is required outside the geofence.');
        result = await attendanceRequest(action, gps, reason.trim());
      }
      setRecord(result.attendance);
      if(result.serverTime)setServerOffset(new Date(result.serverTime).getTime()-Date.now());
      setClock(Date.now());
      setNotice(action === 'clock_in' ? `Clock-in saved and verified at ${timeLabel(result.serverTime)}.` : `Clock-out saved and verified at ${timeLabel(result.serverTime)}.`);
    } catch (requestError) {
      if(requestError.details?.attendance)setRecord(requestError.details.attendance);
      setError(requestError.message || 'Could not capture attendance.');
    } finally { setBusy(false); }
  };

  return <section className="mock-attendance-control">
    <div className="mock-attendance-head"><div><span className="mock-data-badge">{roleLabel} attendance</span><strong>{location?.storeName || 'Attendance store not registered'}</strong><small>{configured ? `${location.radius}m geofence · GPS accuracy limit 100m · closes 5:30 PM · Thursday starts 10:00 AM · server verified` : 'Store coordinates pending Admin registration'}</small></div><span className={`mock-shift-state ${record?.clockOut ? 'complete' : record?.clockIn ? 'clocked-in' : ''}`}>{!configured ? 'Setup pending' : loading ? 'Checking…' : record?.clockOut ? 'Shift completed' : record?.clockIn ? 'Clocked in' : 'Not clocked in'}</span></div>
    <div className="mock-attendance-body"><div><small>Clock in</small><strong>{timeLabel(record?.clockIn)}</strong><span>{record?.clockInDistance != null ? `${record.clockInDistance}m from store` : 'Location not captured'}</span></div><div><small>Attendance status</small><strong>{record?.status || 'Pending'}</strong><span>{record?.insideClockIn === false ? 'Outside geofence' : record?.insideClockIn ? 'Inside geofence' : 'Awaiting clock-in'}</span></div><div><small>Clock out</small><strong>{timeLabel(record?.clockOut)}</strong><span>{record?.clockOutDistance != null ? `${record.clockOutDistance}m from store` : record?.clockIn&&!clockOutReady ? `Available at ${clockOutLabel}` : 'Not captured'}</span></div><div className="mock-attendance-actions">{!loading && !record?.clockIn ? <button className="mock-clock-in" disabled={!configured || busy} onClick={() => act('clock_in')}>{busy ? 'Checking GPS…' : 'Clock In'}</button> : !record?.clockOut && clockOutReady ? <button className="mock-clock-out" disabled={!configured || busy || loading} onClick={() => act('clock_out')}>{busy ? 'Checking GPS…' : 'Clock Out'}</button> : null}</div></div>
    {notice && <div className="mock-attendance-note">{notice}</div>}{error && <div className="mock-attendance-note">{error}</div>}
  </section>;
}
