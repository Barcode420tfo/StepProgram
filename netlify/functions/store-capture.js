const WEBHOOK_URL = process.env.STORE_CAPTURE_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.STORE_CAPTURE_WEBHOOK_SECRET || '';

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === 'GET') {
    return json(200, { configured: Boolean(WEBHOOK_URL) });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!WEBHOOK_URL) {
    return json(503, { error: 'STORE_CAPTURE_NOT_CONFIGURED' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WEBHOOK_SECRET ? { 'x-store-capture-secret': WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!res.ok) {
      return json(res.status, { error: data.error || 'Upstream webhook rejected the submission.' });
    }

    return json(200, { ok: true, data });
  } catch (error) {
    return json(502, { error: error.message || 'Submission failed.' });
  }
}
