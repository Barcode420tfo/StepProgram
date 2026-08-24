import { useEffect, useState } from 'react';
import { getAttendanceLocation } from '../../config/attendanceLocations';
import { auth } from '../../lib/firebase';
import { getAttendanceDevice, resetAttendanceDevice } from '../../utils/deviceIdentity';

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
  const device = getAttendanceDevice();
  const response = await fetch('/.netlify/functions/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      action,
      deviceId: device.deviceId,
      deviceSecret: device.deviceSecret,
      deviceInfo: device.deviceInfo,
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

function lagosMinutes(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
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
  const [deviceStatus, setDeviceStatus] = useState('Checking');

  useEffect(() => {
    let active = true;
    if (!configured) { setLoading(false); return () => { active = false; }; }
    setLoading(true);
    attendanceRequest('status')
      .then((data) => { if (active) { setRecord(data.attendance); setDeviceStatus(data.device?.status||'Unregistered'); if(data.serverTime)setServerOffset(new Date(data.serverTime).getTime()-Date.now()); } })
      .catch((requestError) => { if (active) { setDeviceStatus(requestError.details?.device?.status||'Unavailable'); setError(requestError.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [configured, name]);

  useEffect(() => {
    if (deviceStatus !== 'Approved' || record?.clockOut) return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [deviceStatus, record?.clockOut]);

  useEffect(() => {
    if (deviceStatus !== 'Pending') return undefined;
    const timer = window.setInterval(() => {
      attendanceRequest('device_status').then((data) => {
        if (data.device?.status) setDeviceStatus(data.device.status);
        if (data.attendance) setRecord(data.attendance);
        if (data.serverTime) setServerOffset(new Date(data.serverTime).getTime()-Date.now());
        if (data.device?.status === 'Approved') {
          setError('');
          setNotice('This phone is approved. Clock In is now active.');
        }
      }).catch((requestError) => {
        if (requestError.details?.device?.status) setDeviceStatus(requestError.details.device.status);
      });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [deviceStatus]);

  const clockOutAvailableAt = record?.clockOutAvailableAt ? new Date(record.clockOutAvailableAt) : null;
  const serverNow = clock + serverOffset;
  const clockInOpen = lagosMinutes(serverNow) < 11 * 60;
  const clockOutReady = Boolean(clockOutAvailableAt && serverNow >= clockOutAvailableAt.getTime());
  const clockOutLabel = clockOutAvailableAt ? clockOutAvailableAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }) : '';
  const deviceApproved = deviceStatus === 'Approved';
  const canResetDevice = ['Pending','Rejected','Revoked','Unavailable'].includes(deviceStatus);

  const registerPhone = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result=await attendanceRequest('register_device');
      setDeviceStatus(result.device?.status||'Pending');
      setNotice(result.device?.status==='Approved'?'This phone is approved for attendance.':'Phone registration submitted. Wait for Super Admin approval before clocking in.');
    } catch(requestError) {
      setDeviceStatus(requestError.details?.device?.status||'Unavailable');
      setError(requestError.message||'Could not register this phone.');
    } finally { setBusy(false); }
  };

  const resetPhone = () => {
    if (!window.confirm('Reset this browser’s attendance registration and submit it again for Admin approval?')) return;
    resetAttendanceDevice();
    setDeviceStatus('Unregistered');
    setError('');
    setNotice('Phone registration reset. Select “Register This Phone” to send a fresh approval request.');
  };

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
      if(result.device?.status)setDeviceStatus(result.device.status);
      if(result.serverTime)setServerOffset(new Date(result.serverTime).getTime()-Date.now());
      setClock(Date.now());
      setNotice(action === 'clock_in' ? `Clock-in saved and verified at ${timeLabel(result.serverTime)}.` : `Clock-out saved and verified at ${timeLabel(result.serverTime)}.`);
    } catch (requestError) {
      if(requestError.details?.attendance)setRecord(requestError.details.attendance);
      setError(requestError.message || 'Could not capture attendance.');
    } finally { setBusy(false); }
  };

  return <section className="mock-attendance-control">
    <div className="mock-attendance-head"><div><span className="mock-data-badge">{roleLabel} attendance</span><strong>{location?.storeName || 'Attendance store not registered'}</strong><small>{configured ? `${location.radius}m geofence · clock-in closes 11:00 AM · clock-out opens 2:00 PM · GPS accuracy limit 100m · phone ${deviceStatus.toLowerCase()} · server verified` : 'Store coordinates pending Admin registration'}</small></div><span className={`mock-shift-state ${record?.clockOut ? 'complete' : record?.clockIn ? 'clocked-in' : ''}`}>{!configured ? 'Setup pending' : loading ? 'Checking…' : !deviceApproved ? `Phone ${deviceStatus}` : record?.clockOut ? 'Shift completed' : record?.clockIn ? 'Clocked in' : !clockInOpen ? 'Clock-in closed' : 'Not clocked in'}</span></div>
    <div className="mock-attendance-body"><div><small>Clock in</small><strong>{timeLabel(record?.clockIn)}</strong><span>{record?.clockInDistance != null ? `${record.clockInDistance}m from store` : !record?.clockIn&&!clockInOpen ? 'Closed at 11:00 AM' : 'Location not captured'}</span></div><div><small>Attendance status</small><strong>{record?.status || 'Pending'}</strong><span>{record?.insideClockIn === false ? 'Outside geofence' : record?.insideClockIn ? 'Inside geofence' : 'Awaiting clock-in'}</span></div><div><small>Clock out</small><strong>{timeLabel(record?.clockOut)}</strong><span>{record?.clockOutDistance != null ? `${record.clockOutDistance}m from store` : record?.clockIn&&!clockOutReady ? `Available at ${clockOutLabel}` : 'Not captured'}</span></div><div className="mock-attendance-actions">{!loading&&!deviceApproved&&['Unregistered','Rejected','Revoked'].includes(deviceStatus)?<button className="mock-register-device" disabled={busy} onClick={registerPhone}>{busy?'Registering…':'Register This Phone'}</button>:deviceApproved&&!loading&&!record?.clockIn&&clockInOpen?<button className="mock-clock-in" disabled={!configured||busy} onClick={()=>act('clock_in')}>{busy?'Checking GPS…':'Clock In'}</button>:deviceApproved&&!record?.clockOut&&clockOutReady?<button className="mock-clock-out" disabled={!configured||busy||loading} onClick={()=>act('clock_out')}>{busy?'Checking GPS…':'Clock Out'}</button>:null}{!loading&&!deviceApproved&&canResetDevice&&<button className="mock-reset" disabled={busy} onClick={resetPhone}>Reset Phone Registration</button>}</div></div>
    {notice && <div className="mock-attendance-note">{notice}</div>}{error && <div className="mock-attendance-note">{error}</div>}
  </section>;
}
