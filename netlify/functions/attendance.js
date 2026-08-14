const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = process.env.AIRTABLE_ATTENDANCE_TABLE_NAME || 'Attendance';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
const TIME_ZONE = 'Africa/Lagos';
const CLOCK_OUT_OPEN_HOUR = 14;
const CLOSING_HOUR = 17;
const CLOSING_MINUTE = 30;

const USERS = Object.freeze({
  vJMImsYZeWThRPQmERfnFct0FVL2: {
    name: 'Main Admin',
    email: 'liltomsky@gmail.com',
    canViewAllAttendance: true,
  },
  FjkbTH9hYQaaqrY1gmDI2Rdmx302: {
    name: 'Olajide',
    email: 'olajide@sapphirevirtual.com',
    canViewAllAttendance: true,
  },
  ZJviPrASfzPg95CauDo3ORGlVSt1: {
    name: 'Towobola',
    email: 'towobolaadefowokan@gmail.com',
    storeName: 'Royaline Technology Limited',
    latitude: 6.59584,
    longitude: 3.33870,
    radius: 100,
    supervisedAgents: ['Queen'],
  },
  as9i7qhHHPS80xLVWhdB9JJxXDA2: {
    name: 'Esther',
    email: 'esther.nathaniel@sapphirevirtual.com',
    storeName: 'Sky Communication',
    latitude: 6.63194,
    longitude: 3.53490,
    radius: 100,
  },
  Oh1LtdX5dqOlPtVeDROI526LKEh1: {
    name: 'Sarah',
    email: 'eniolasarah12@gmail.com',
    storeName: 'FM Reliable',
    latitude: 6.67311,
    longitude: 3.29077,
    radius: 100,
  },
  '9PRNYdlEaBRg0fjSM0UjDsWnq863': {
    name: 'Jessica',
    email: 'onyinyeukwu22@gmail.com',
    storeName: 'AL mahbub technology',
    latitude: 6.59639,
    longitude: 3.33986,
    radius: 100,
    supervisedAgents: ['Peace'],
  },
  YKWLXkyk5nfBUPJWvhxwi7vVE1x1: {
    name: 'Chile Nwaiwu',
    email: 'chileenwaiwu5@gmail.com',
    storeName: 'Go Sky Lawanson Ikenedu',
    latitude: 6.51033,
    longitude: 3.33829,
    radius: 100,
    supervisedAgents: ['Ifeoma'],
  },
  S5TDJR6FXvQKYoNJrY3lQChWLyC2: {
    name: 'Ifeoma',
    email: 'ogbonnaifeoma@sapphirevirtual.com',
    storeName: 'Adaugo Telecoms',
    latitude: 6.51260,
    longitude: 3.34982,
    radius: 100,
  },
  jQaCyoprVHhNyjxTkpy4Odave8D3: {
    name: 'Queen',
    email: 'qlily0201@gmail.com',
    storeName: 'Royaline Technology Limited',
    latitude: 6.59584,
    longitude: 3.33870,
    radius: 100,
  },
  cZXX5LSTcxdtfUIuM0QMfjoRHpH3: {
    name: 'Mohammed',
    email: 'bolasanusi@sapphirevirtual.com',
    storeName: 'Segzy Ventures',
    latitude: 6.51966,
    longitude: 3.38231,
    radius: 100,
  },
  D5SAcx8YS9PpfQQ3p0NsWwBK2Ar1: {
    name: 'Peace',
    email: 'ejiogu.peace@sapphirevirtual.com',
    storeName: 'AL mahbub technology',
    latitude: 6.59639,
    longitude: 3.33986,
    radius: 100,
  },
});

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
function airtableUrl(id = '') { return `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}${id ? `/${id}` : ''}`; }
function airtableHeaders() { return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }; }
function parts(date) { return Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])); }
function localDate(date) { const p=parts(date); return `${p.year}-${p.month}-${p.day}`; }
function localTimeOnDate(date, hour, minute = 0) {
  const p=parts(date);
  // Lagos is UTC+1 year-round, so 14:00 local is 13:00 UTC.
  return new Date(Date.UTC(Number(p.year), Number(p.month)-1, Number(p.day), hour-1, minute));
}
function attendanceStatus(date) {
  const p=parts(date);
  const minutes=Number(p.hour)*60+Number(p.minute);
  const thursday=p.weekday==='Thu';
  const late=thursday ? 11*60 : 9*60+30;
  const absent=thursday ? 12*60 : 10*60;
  if(minutes>=absent) return 'Absent';
  if(thursday ? minutes>late : minutes>=late) return 'Late';
  return 'Present';
}
function distance(aLat,aLon,bLat,bLon) { const r=6371000; const rad=(v)=>v*Math.PI/180; const dLat=rad(bLat-aLat); const dLon=rad(bLon-aLon); const a=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2; return Math.round(r*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))); }
function hasClockOutEvidence(fields = {}) {
  return fields['Clock Out Latitude'] != null
    && fields['Clock Out Longitude'] != null
    && fields['Clock Out Distance'] != null
    && fields['Working Minutes'] != null;
}

async function authenticate(event) {
  const token = String(event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Authentication required.'), { status: 401 });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
  const data = await response.json();
  const firebaseUser = data.users?.[0];
  if (!response.ok || !firebaseUser) throw Object.assign(new Error('Invalid or expired login.'), { status: 401 });
  const user = USERS[firebaseUser.localId];
  if (!user) throw Object.assign(new Error('This account is not configured for attendance.'), { status: 403 });
  return { uid: firebaseUser.localId, ...user };
}
async function findToday(uid, date) {
  const formula = `AND({Agent UID}='${uid}',DATETIME_FORMAT(SET_TIMEZONE({Attendance Date},'Africa/Lagos'),'YYYY-MM-DD')='${date}')`;
  const response = await fetch(`${airtableUrl()}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`, { headers: airtableHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Could not read attendance table.');
  return data.records?.[0] || null;
}
async function findAgentHistory(agentName) {
  const formula = `{Agent Name}='${String(agentName).replaceAll("'", "\\'")}'`;
  const response = await fetch(`${airtableUrl()}?maxRecords=62&filterByFormula=${encodeURIComponent(formula)}`, { headers: airtableHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Could not read attendance history.');
  return (data.records || []).sort((a, b) => String(b.fields?.['Attendance Date'] || '').localeCompare(String(a.fields?.['Attendance Date'] || '')));
}
async function findAllHistory() {
  const records=[];
  let offset='';
  do {
    const query=new URLSearchParams({pageSize:'100'});
    query.append('sort[0][field]','Attendance Date');
    query.append('sort[0][direction]','desc');
    if(offset) query.set('offset',offset);
    const response=await fetch(`${airtableUrl()}?${query}`,{headers:airtableHeaders()});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error?.message||'Could not read attendance history.');
    records.push(...(data.records||[]));
    offset=data.offset||'';
  } while(offset&&records.length<1000);
  return records;
}
function output(record) {
  if (!record) return null;
  const f=record.fields || {};
  const clockInLatitude=f['Clock In Latitude'];
  const clockInLongitude=f['Clock in Longitude'];
  const clockOutLatitude=f['Clock Out Latitude'];
  const clockOutLongitude=f['Clock Out Longitude'];
  const clockIn=f['Clock In Time']||null;
  const status=f['Attendance Status']||'Pending';
  const attendanceDate=f['Attendance Date']?localDate(new Date(f['Attendance Date'])):null;
  const hasClockOut=hasClockOutEvidence(f);
  return { id:record.id,agentName:f['Agent Name'],date:attendanceDate,store:f['Attendance Store'],clockIn,clockOut:hasClockOut?(f['Clock Out Time']||null):null,clockOutAvailableAt:clockIn?localTimeOnDate(new Date(clockIn),CLOCK_OUT_OPEN_HOUR).toISOString():null,scheduledClosingAt:clockIn?localTimeOnDate(new Date(clockIn),CLOSING_HOUR,CLOSING_MINUTE).toISOString():null,status,clockedInAfterCutoff:Boolean(clockIn&&status==='Absent'),clockInLatitude,clockInLongitude,clockInCoordinates:Number.isFinite(Number(clockInLatitude))&&Number.isFinite(Number(clockInLongitude))?`${clockInLatitude}, ${clockInLongitude}`:null,clockInDistance:f['Clock In Distance'],clockInAccuracy:f['Clock In Accuracy'],insideClockIn:Number(f['Clock In Distance'])<=100,clockOutLatitude:hasClockOut?clockOutLatitude:null,clockOutLongitude:hasClockOut?clockOutLongitude:null,clockOutCoordinates:hasClockOut?`${clockOutLatitude}, ${clockOutLongitude}`:null,clockOutDistance:hasClockOut?f['Clock Out Distance']:null,clockOutAccuracy:hasClockOut?f['Clock Out Accuracy']:null,workingMinutes:hasClockOut?f['Working Minutes']:null,exceptionReason:f['Exception Reason']||'' };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
  if (!API_KEY || !BASE_ID || !FIREBASE_API_KEY) return json(503,{error:'Attendance backend environment variables are incomplete.'});
  try {
    const user=await authenticate(event); const body=JSON.parse(event.body||'{}'); const action=body.action||'status'; const now=new Date(); const date=localDate(now);
    if(action==='agent_history') {
      const agentName=String(body.agentName||'').trim();
      if(!agentName) return json(400,{error:'Agent name is required.'});
      if(!user.canViewAllAttendance&&user.name!==agentName&&!user.supervisedAgents?.includes(agentName)) return json(403,{error:'You are not authorized to view this agent attendance history.'});
      const records=await findAgentHistory(agentName);
      return json(200,{ok:true,attendance:records.map(output),serverTime:now.toISOString()});
    }
    if(action==='all_history') {
      if(!user.canViewAllAttendance) return json(403,{error:'Super Admin attendance access is required.'});
      const records=await findAllHistory();
      return json(200,{ok:true,attendance:records.map(output),serverTime:now.toISOString()});
    }
    if(!Number.isFinite(user.latitude)||!Number.isFinite(user.longitude)||!Number.isFinite(user.radius)) return json(403,{error:'This account does not have a personal attendance location.'});
    const existing=await findToday(user.uid,date);
    if(action==='status') return json(200,{ok:true,attendance:output(existing),serverTime:now.toISOString()});
    const latitude=Number(body.latitude); const longitude=Number(body.longitude); const accuracy=Number(body.accuracy);
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!Number.isFinite(accuracy)) return json(400,{error:'Valid GPS coordinates and accuracy are required.'});
    if(accuracy>100) return json(422,{error:`GPS accuracy is ±${Math.round(accuracy)}m. It must be 100m or better.`});
    const metres=distance(latitude,longitude,user.latitude,user.longitude); const inside=metres<=user.radius;
    if(action==='clock_in') {
      if(existing?.fields?.['Clock In Time']) return json(409,{error:'You have already clocked in today.',attendance:output(existing)});
      if(!inside) return json(422,{error:`Clock-in rejected. You are ${metres}m from ${user.storeName}; you must be within ${user.radius}m.`});
      const fields={'Agent UID':user.uid,'Agent Name':user.name,'Attendance Date':date,'Attendance Store':user.storeName,'Clock In Time':now.toISOString(),'Clock In Latitude':latitude,'Clock in Longitude':longitude,'Clock In Accuracy':Math.round(accuracy),'Clock In Distance':metres,'Attendance Status':attendanceStatus(now),'Created At':now.toISOString(),'Updated At':now.toISOString()};
      const response=await fetch(airtableUrl(),{method:'POST',headers:airtableHeaders(),body:JSON.stringify({fields,typecast:true})}); const data=await response.json(); if(!response.ok) throw new Error(data.error?.message||'Could not save clock-in.'); return json(200,{ok:true,attendance:output(data),serverTime:now.toISOString()});
    }
    if(action==='clock_out') {
      if(!existing?.fields?.['Clock In Time']) return json(409,{error:'No active clock-in was found for today.'});
      if(hasClockOutEvidence(existing.fields)) return json(409,{error:'You have already clocked out today.',attendance:output(existing)});
      const earliestClockOut=localTimeOnDate(new Date(existing.fields['Clock In Time']),CLOCK_OUT_OPEN_HOUR);
      if(now<earliestClockOut) return json(422,{error:'Clock-out becomes available at 2:00 PM.',clockOutAvailableAt:earliestClockOut.toISOString(),attendance:output(existing)});
      if(!inside&&!String(body.exceptionReason||'').trim()) return json(422,{error:'Clock-out outside the 100m geofence requires an exception reason.',requiresReason:true,distance:metres});
      const started=new Date(existing.fields['Clock In Time']); const workingMinutes=Math.max(0,Math.round((now-started)/60000)); const fields={'Clock Out Time':now.toISOString(),'Clock Out Latitude':latitude,'Clock Out Longitude':longitude,'Clock Out Accuracy':Math.round(accuracy),'Clock Out Distance':metres,'Working Minutes':workingMinutes,'Exception Reason':String(body.exceptionReason||''),'Updated At':now.toISOString()};
      const response=await fetch(airtableUrl(existing.id),{method:'PATCH',headers:airtableHeaders(),body:JSON.stringify({fields,typecast:true})}); const data=await response.json(); if(!response.ok) throw new Error(data.error?.message||'Could not save clock-out.'); return json(200,{ok:true,attendance:output(data),serverTime:now.toISOString()});
    }
    return json(400,{error:'Unknown attendance action.'});
  } catch(error) { return json(error.status||502,{error:error.message||'Attendance request failed.'}); }
}
