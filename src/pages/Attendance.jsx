import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '../lib/firebase';

const PEOPLE = Object.freeze([
  { name: 'Jessica', cluster: 'Computer Village', role: 'Growth Partner / Supervisor' },
  { name: 'Towobola', cluster: 'Computer Village', role: 'Growth Partner / Supervisor' },
  { name: 'Peace', cluster: 'Computer Village', role: 'Sales Agent' },
  { name: 'Queen', cluster: 'Computer Village', role: 'Sales Agent' },
  { name: 'Chile Nwaiwu', cluster: 'Lawanson', role: 'Growth Partner / Supervisor' },
  { name: 'Ifeoma', cluster: 'Lawanson', role: 'Sales Agent' },
  { name: 'Mohammed', cluster: 'UNILAG / Akoka', role: 'Growth Partner' },
  { name: 'Sarah', cluster: 'Abule Egba–Sango', role: 'Growth Partner' },
  { name: 'Esther', cluster: 'Ikorodu', role: 'Growth Partner' },
]);

const pad = (value) => String(value).padStart(2, '0');
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const currentMonth = () => dateKey(new Date()).slice(0,7);
const attended = (status) => Boolean(status) && status !== 'Absent';
const statusClass = (status) => String(status || 'Absent').toLowerCase().replaceAll(' ','-');
const timeLabel = (value) => value ? new Date(value).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Lagos'}) : '—';
const timestampLabel = (value) => value ? new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Africa/Lagos'}) : 'No clock-in';
const dateLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
function mondayOf(date) { const copy=new Date(date); const day=copy.getDay(); copy.setDate(copy.getDate()-(day===0?6:day-1)); copy.setHours(0,0,0,0); return copy; }
function scheduledDates(month) {
  const [year,monthNumber]=month.split('-').map(Number);
  const today=new Date();
  const last=new Date(year,monthNumber,0);
  const current=year===today.getFullYear()&&monthNumber-1===today.getMonth();
  const end=current?Math.min(today.getDate(),last.getDate()):last.getDate();
  const dates=[];
  for(let day=1;day<=end;day+=1){const date=new Date(year,monthNumber-1,day);if(date.getDay()!==0)dates.push(date);}
  return dates;
}
function percent(actual,expected){return expected?Math.min(100,Math.round(actual/expected*100)):0;}

export default function Attendance() {
  const [records,setRecords]=useState([]);
  const [devices,setDevices]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [deviceError,setDeviceError]=useState('');
  const [reviewingDevice,setReviewingDevice]=useState('');
  const [month,setMonth]=useState(currentMonth);
  const [agent,setAgent]=useState('all');
  const [cluster,setCluster]=useState('all');
  const [selected,setSelected]=useState('');
  const drilldownRef=useRef(null);

  const load=async()=>{
    setLoading(true);setError('');setDeviceError('');
    try{
      const token=await auth.currentUser?.getIdToken();
      if(!token) throw new Error('Your Super Admin session is unavailable.');
      const request=async(action,payload={})=>{const response=await fetch('/.netlify/functions/attendance',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Attendance request failed.');return data;};
      const attendanceData=await request('all_history');
      setRecords(attendanceData.attendance||[]);
      try{const deviceData=await request('all_devices');setDevices(deviceData.devices||[]);}catch(deviceRequestError){setDeviceError(deviceRequestError.message);}
    }catch(requestError){setError(requestError.message);}finally{setLoading(false);}
  };

  const reviewDevice=async(deviceId,status)=>{
    setReviewingDevice(deviceId);setDeviceError('');
    try{
      const token=await auth.currentUser?.getIdToken();
      if(!token)throw new Error('Your Super Admin session is unavailable.');
      const response=await fetch('/.netlify/functions/attendance',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'review_device',deviceId,status})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Phone review failed.');
      await load();
    }catch(requestError){setDeviceError(requestError.message);}finally{setReviewingDevice('');}
  };
  useEffect(()=>{load();},[]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if(!selected||!drilldownRef.current)return;
    const frame=window.requestAnimationFrame(()=>drilldownRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
    return()=>window.cancelAnimationFrame(frame);
  },[selected]);

  const analysis=useMemo(()=>{
    const dates=scheduledDates(month);
    const dateSet=new Set(dates.map(dateKey));
    const visiblePeople=PEOPLE.filter((person)=>(agent==='all'||person.name===agent)&&(cluster==='all'||person.cluster===cluster));
    const rows=visiblePeople.map((person)=>{
      const personal=records.filter((row)=>row.agentName===person.name&&dateSet.has(row.date));
      const byDate=new Map(personal.map((row)=>[row.date,row]));
      const present=dates.filter((date)=>attended(byDate.get(dateKey(date))?.status)).length;
      const late=personal.filter((row)=>['Late','Very Late'].includes(row.status)).length;
      const absent=Math.max(0,dates.length-present);
      const weeks=[...new Set(dates.map((date)=>dateKey(mondayOf(date))))].map((weekStart)=>{
        const weekDates=dates.filter((date)=>dateKey(mondayOf(date))===weekStart);
        const daysPresent=weekDates.filter((date)=>attended(byDate.get(dateKey(date))?.status)).length;
        return {weekStart,expected:weekDates.length,present:daysPresent,pct:percent(daysPresent,weekDates.length)};
      });
      return {...person,personal,byDate,present,late,absent,expected:dates.length,pct:percent(present,dates.length),weeks};
    });
    const logs=records.filter((row)=>dateSet.has(row.date)).filter((row)=>{
      const person=PEOPLE.find((item)=>item.name===row.agentName);
      return person&&(agent==='all'||person.name===agent)&&(cluster==='all'||person.cluster===cluster);
    }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.clockIn||'').localeCompare(String(a.clockIn||'')));
    return {dates,rows,logs};
  },[records,month,agent,cluster]);
  const chosen=analysis.rows.find((row)=>row.name===selected);
  const openDrilldown=(name)=>{
    if(selected===name){drilldownRef.current?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    setSelected(name);
  };
  const totals=analysis.rows.reduce((sum,row)=>({present:sum.present+row.present,late:sum.late+row.late,absent:sum.absent+row.absent,expected:sum.expected+row.expected}),{present:0,late:0,absent:0,expected:0});
  const todayKey=dateKey(new Date());
  const todayRows=analysis.rows.map((person)=>{
    const matches=records.filter((row)=>row.agentName===person.name&&row.date===todayKey).sort((a,b)=>String(a.clockIn||'').localeCompare(String(b.clockIn||'')));
    return {...person,record:matches[0]||null};
  });

  return <div>
    <div className="executive-hero"><div><span>Super Admin · Airtable attendance</span><h1>Attendance command centre</h1><p>Daily clock evidence, weekly compliance and month-to-date attendance analysis.</p></div><div><small>Selected cycle</small><strong>{month}</strong><span>{analysis.dates.length} elapsed working days</span></div></div>
    <div className="analytics-controls attendance-controls"><label>Month<input type="month" value={month} onChange={(event)=>setMonth(event.target.value)}/></label><label>Agent<select value={agent} onChange={(event)=>{setAgent(event.target.value);setSelected('');}}><option value="all">All agents</option>{PEOPLE.map((person)=><option key={person.name}>{person.name}</option>)}</select></label><label>Cluster<select value={cluster} onChange={(event)=>{setCluster(event.target.value);setSelected('');}}><option value="all">All clusters</option>{[...new Set(PEOPLE.map((person)=>person.cluster))].map((value)=><option key={value}>{value}</option>)}</select></label><button className="ref-btn attendance-refresh" onClick={load} disabled={loading}>{loading?'Loading…':'Refresh logs'}</button></div>
    {error&&<div className="status err">{error}</div>}
    {deviceError&&<div className="status err">Phone validation: {deviceError}</div>}
    <div className="executive-metrics"><Metric label="Attendance" value={`${percent(totals.present,totals.expected)}%`} note={`${totals.present}/${totals.expected} expected agent-days`}/><Metric label="Present/attended" value={totals.present} note="Includes late arrivals"/><Metric label="Late arrivals" value={totals.late} note="Late and Very Late"/><Metric label="Absent" value={totals.absent} note="Absent status or missing clock-in"/></div>
    <DeviceApprovals devices={devices} reviewing={reviewingDevice} onReview={reviewDevice}/>
    <section className="role-panel people-analytics"><div className="role-panel-head"><div><h2>Today’s clock-in snapshot</h2><p>{dateLabel(todayKey)} · Airtable server timestamps in Africa/Lagos time.</p></div><strong className="panel-stat">{todayRows.filter((row)=>row.record?.clockIn).length}/{todayRows.length} clocked in</strong></div><div className="role-table-wrap"><table><thead><tr><th>Agent</th><th>Cluster</th><th>Attendance store</th><th>Clock-in time</th><th>Status</th><th>Audit note</th></tr></thead><tbody>{todayRows.map(({record,...person})=><tr key={person.name}><td><strong>{person.name}</strong></td><td>{person.cluster}</td><td>{record?.store||'No clock-in'}</td><td><strong>{record?.clockIn?timeLabel(record.clockIn):'—'}</strong></td><td><span className={`attendance-status ${statusClass(record?.status||'Absent')}`}>{record?.status||'Absent'}</span></td><td>{record?.clockedInAfterCutoff?'Clocked in after cutoff':record?.clockIn?'Recorded successfully':'Missing clock-in'}</td></tr>)}</tbody></table></div></section>
    <section className="role-panel people-analytics"><div className="role-panel-head"><div><h2>Weekly attendance by agent</h2><p>Monday–Saturday. The current week uses elapsed workdays; six attended days equals 100% for a completed week.</p></div></div><div className="role-table-wrap"><table><thead><tr><th>Agent</th><th>Cluster</th><th>Role</th><th>MTD attendance</th><th>Weekly percentages</th><th>Late</th><th>Absent</th><th>Analysis</th></tr></thead><tbody>{analysis.rows.map((row)=><tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.cluster}</td><td>{row.role}</td><td><AttendanceRate value={row.pct} note={`${row.present}/${row.expected} days`}/></td><td><div className="attendance-week-list">{row.weeks.map((week)=><span key={week.weekStart}><small>{dateLabel(week.weekStart)}</small><strong>{week.pct}%</strong><i>{week.present}/{week.expected}</i></span>)}</div></td><td>{row.late}</td><td>{row.absent}</td><td><button className="agent-name-link" onClick={()=>openDrilldown(row.name)}>Drill down →</button></td></tr>)}</tbody></table></div></section>
    {chosen&&<AgentDrilldown ref={drilldownRef} row={chosen} dates={analysis.dates} onClose={()=>setSelected('')}/>}
    <section className="role-panel people-analytics"><div className="role-panel-head"><div><h2>Daily clock-in log</h2><p>Exact Airtable dates and server timestamps displayed in Africa/Lagos time.</p></div><strong className="panel-stat">{analysis.logs.length} records</strong></div><div className="role-table-wrap"><table><thead><tr><th>Attendance date</th><th>Agent</th><th>Cluster</th><th>Store</th><th>Clock-in date and time</th><th>Status / audit result</th><th>Clock-out date and time</th><th>Distance</th><th>Accuracy</th></tr></thead><tbody>{analysis.logs.length?analysis.logs.map((row)=><tr key={row.id}><td><strong>{dateLabel(row.date)}</strong></td><td>{row.agentName}</td><td>{PEOPLE.find((person)=>person.name===row.agentName)?.cluster||'—'}</td><td>{row.store||'—'}</td><td><strong>{timestampLabel(row.clockIn)}</strong></td><td><span className={`attendance-status ${statusClass(row.status)}`}>{row.status}</span>{row.clockedInAfterCutoff&&<small className="log-note">Clocked in after cutoff</small>}</td><td>{row.clockOut?timestampLabel(row.clockOut):'—'}</td><td>{row.clockInDistance!=null?`${row.clockInDistance}m`:'—'}</td><td>{row.clockInAccuracy!=null?`±${row.clockInAccuracy}m`:'—'}</td></tr>):<tr><td colSpan="9" className="empty-detail">{loading?'Loading attendance…':'No attendance records match this period.'}</td></tr>}</tbody></table></div></section>
  </div>;
}

function DeviceApprovals({devices,reviewing,onReview}) {
  const pendingDevices=devices.filter((device)=>device.status==='Pending'&&device.deviceId);
  return <section className="role-panel people-analytics device-approval-panel"><div className="role-panel-head"><div><h2>Attendance phone approvals</h2><p>Only pending requests appear here. Approved accounts cannot register another phone unless an Admin revokes the current phone.</p></div><strong className="panel-stat">{pendingDevices.length} pending</strong></div><div className="role-table-wrap"><table><thead><tr><th>Agent</th><th>Phone/browser</th><th>Platform</th><th>Requested</th><th>Last seen</th><th>Status</th><th>Review</th></tr></thead><tbody>{pendingDevices.length?pendingDevices.map((device)=><tr key={device.deviceId}><td><strong>{device.agentName||'Unknown'}</strong><small className="log-note">{device.agentUid}</small></td><td>{device.label}<small className="log-note">{device.screen} · {device.timeZone}</small></td><td>{device.platform||'—'}</td><td>{device.requestedAt?timestampLabel(device.requestedAt):'—'}</td><td>{device.lastSeenAt?timestampLabel(device.lastSeenAt):'—'}</td><td><span className="device-status pending">Pending</span></td><td><div className="device-review-actions"><button disabled={reviewing===device.deviceId} onClick={()=>onReview(device.deviceId,'Approved')}>Approve</button><button className="reject" disabled={reviewing===device.deviceId} onClick={()=>onReview(device.deviceId,'Rejected')}>Reject</button></div></td></tr>):<tr><td colSpan="7" className="empty-detail">No phone approvals are pending.</td></tr>}</tbody></table></div></section>;
}

function Metric({label,value,note}){return <div className="executive-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;}
function AttendanceRate({value,note}){return <div className="attendance-percentage"><strong>{value}%</strong><span>{note}</span><div><i style={{width:`${value}%`}}/></div></div>;}
const AgentDrilldown=forwardRef(function AgentDrilldown({row,dates,onClose},ref){return <section ref={ref} className="agent-drilldown"><div className="agent-drilldown-head"><div><div className="role-eyebrow">Attendance drill-down</div><h2>{row.name}</h2><p>{row.cluster} · {row.role}</p></div><button className="detail-close" onClick={onClose}>Close ×</button></div><div className="agent-profile-strip"><div><small>MTD attendance</small><strong>{row.pct}%</strong></div><div><small>Attended</small><strong>{row.present}</strong></div><div><small>Late</small><strong>{row.late}</strong></div><div><small>Absent</small><strong>{row.absent}</strong></div></div><div className="role-table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Clock-in date and time</th><th>Clock-out date and time</th><th>Attendance store</th><th>Location evidence</th></tr></thead><tbody>{[...dates].reverse().map((date)=>{const key=dateKey(date);const record=row.byDate.get(key);const status=record?.status||'Absent';return <tr key={key}><td><strong>{dateLabel(key)}</strong></td><td><span className={`attendance-status ${statusClass(status)}`}>{status}</span>{record?.clockedInAfterCutoff&&<small className="log-note">Clocked in after cutoff</small>}</td><td><strong>{timestampLabel(record?.clockIn)}</strong></td><td>{record?.clockOut?timestampLabel(record.clockOut):'—'}</td><td>{record?.store||'No clock-in'}</td><td>{record?`${record.clockInDistance??'—'}m · ±${record.clockInAccuracy??'—'}m`:'Missing attendance record'}</td></tr>;})}</tbody></table></div></section>;});
