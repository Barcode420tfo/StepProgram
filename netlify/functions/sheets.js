// Server-side proxy — fetches Google Sheets CSV so the browser never hits them directly.
// This bypasses CORS entirely because the request comes from Netlify's servers, not the browser.

const SHEET_URLS = {
  onboarding:
    'https://docs.google.com/spreadsheets/d/1D4Ms9jutyhM2kuVmSN5S1_820sAu2PQU9YT1lJwZPD8/export?format=csv&gid=2096627106',
  devfin:
    'https://docs.google.com/spreadsheets/d/1UYp-WZlXaaaXePqG-Wz1T_JbpfvWXgGwqPqry0InQ_g/export?format=csv&gid=821412187',
  devpro:
    'https://docs.google.com/spreadsheets/d/1Y3H2ndjEzLo-y-2CC7KIYTWu-qcadtWaEaDXfrOttuM/export?format=csv&gid=0',
};

export async function handler(event) {
  const source = event.queryStringParameters && event.queryStringParameters.source;

  if (!source || !SHEET_URLS[source]) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid source. Use ?source=onboarding, ?source=devfin, or ?source=devpro' }),
    };
  }

  try {
    const response = await fetch(SHEET_URLS[source], { redirect: 'follow' });
    if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);
    const csv = await response.text();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
      },
      body: csv,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
