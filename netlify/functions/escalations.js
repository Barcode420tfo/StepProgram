// Airtable proxy — keeps API key server-side, never exposed to the browser.
// Supports GET (list), POST (create), PATCH (update status).

const API_KEY   = process.env.AIRTABLE_API_KEY;
const BASE_ID   = process.env.AIRTABLE_BASE_ID;
const TABLE     = process.env.AIRTABLE_TABLE_NAME || 'Escalations';

function airtableURL(recordId) {
  const base = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`;
  return recordId ? `${base}/${recordId}` : base;
}

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function handler(event) {
  if (!API_KEY || !BASE_ID) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'AIRTABLE_NOT_CONFIGURED' }),
    };
  }

  // ── GET — list all escalations, newest first ──────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const url = airtableURL() + '?sort[0][field]=Date&sort[0][direction]=desc';
      const res  = await fetch(url, { headers: headers() });
      const data = await res.json();
      return { statusCode: res.status, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── POST — create a new escalation record ─────────────────────────────────
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const res  = await fetch(airtableURL(), {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ fields: body }),
      });
      const data = await res.json();
      return { statusCode: res.status, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── PATCH — update a record (e.g. change Status to Resolved) ─────────────
  if (event.httpMethod === 'PATCH') {
    try {
      const { id, fields } = JSON.parse(event.body || '{}');
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Record id required' }) };
      const res  = await fetch(airtableURL(id), {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ fields }),
      });
      const data = await res.json();
      return { statusCode: res.status, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
}
