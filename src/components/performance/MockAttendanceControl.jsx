import { useEffect, useState } from 'react';
import { getMockAttendance, mockClockIn, mockClockOut, MOCK_ATTENDANCE_EVENT, resetMockAttendance } from '../../utils/mockAttendance';

export default function MockAttendanceControl({ agentName = 'Peace' }) {
  const [record, setRecord] = useState(() => getMockAttendance(agentName));
  useEffect(() => {
    const update = (event) => { if (event.detail?.agentName === agentName) setRecord(event.detail.record); };
    window.addEventListener(MOCK_ATTENDANCE_EVENT, update);
    return () => window.removeEventListener(MOCK_ATTENDANCE_EVENT, update);
  }, [agentName]);

  const stage = !record?.clockIn ? 'ready' : !record?.clockOut ? 'clocked-in' : 'complete';
  return <section className={`mock-attendance-control ${stage}`}>
    <div className="mock-attendance-head"><div><span className="mock-data-badge">Mock attendance</span><strong>POINTEK · Computer Village</strong><small>100m geofence · simulated GPS accuracy ±18m</small></div><span className={`mock-shift-state ${stage}`}>{stage === 'ready' ? 'Not clocked in' : stage === 'clocked-in' ? 'Clocked in' : 'Shift completed'}</span></div>
    <div className="mock-attendance-body">
      <div><small>Clock in</small><strong>{record?.clockIn || '—'}</strong><span>{record ? `${record.distance}m from store` : 'Waiting for action'}</span></div>
      <div><small>Attendance status</small><strong>{record?.status || 'Pending'}</strong><span>{record?.geofence || 'Location not captured'}</span></div>
      <div><small>Clock out</small><strong>{record?.clockOut || '—'}</strong><span>{record?.clockOut ? `${record.clockOutDistance}m from store` : 'Shift still open'}</span></div>
      <div className="mock-attendance-actions">
        {stage === 'ready' && <button className="mock-clock-in" onClick={() => setRecord(mockClockIn(agentName))}>Mock Clock In</button>}
        {stage === 'clocked-in' && <button className="mock-clock-out" onClick={() => setRecord(mockClockOut(agentName))}>Mock Clock Out</button>}
        {stage === 'complete' && <button className="mock-reset" onClick={() => { resetMockAttendance(agentName); setRecord(null); }}>Reset Demo</button>}
      </div>
    </div>
    <div className="mock-attendance-note">Simulation only. The demo uses an 8:54 AM clock-in and 6:03 PM clock-out so the full approved flow can be reviewed at any time of day.</div>
  </section>;
}
