import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { pathToFileURL } from 'node:url';
import { SHEET_URLS } from './src/utils/fallbackData.js';

function localSheetsProxy() {
  return {
    name: 'step-local-sheets-proxy',
    configureServer(server) {
      server.middlewares.use('/api/sheets', async (request, response) => {
        const source = new URL(request.url || '/', 'http://localhost').searchParams.get('source');
        if (!source || !SHEET_URLS[source]) {
          response.statusCode = 400;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.end(JSON.stringify({ error: 'Invalid sheet source.' }));
          return;
        }
        try {
          const upstream = await fetch(SHEET_URLS[source], { redirect: 'follow' });
          if (!upstream.ok) throw new Error(`Google Sheets returned HTTP ${upstream.status}`);
          const csv = await upstream.text();
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/csv; charset=utf-8');
          response.setHeader('Cache-Control', 'no-cache, no-store');
          response.end(csv);
        } catch (error) {
          response.statusCode = 502;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.end(JSON.stringify({ error: error.message || 'Could not reach Google Sheets.' }));
        }
      });
    },
  };
}

function localAttendanceFunction() {
  return {
    name: 'step-local-attendance-function',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/attendance', async (request, response) => {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const functionUrl = pathToFileURL(`${process.cwd()}/netlify/functions/attendance.js`).href;
        const { handler } = await import(`${functionUrl}?local=${Date.now()}`);
        const result = await handler({
          httpMethod: request.method,
          headers: request.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
        response.statusCode = result.statusCode;
        Object.entries(result.headers || {}).forEach(([key, value]) => response.setHeader(key, value));
        response.end(result.body || '');
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
  plugins: [react(), localSheetsProxy(), localAttendanceFunction()],
  build: {
    sourcemap: false,          // never ship source maps — hides original code in prod
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2') || id.includes('node_modules/chartjs-plugin-datalabels')) {
            return 'chart-vendor';
          }
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-vendor';
          }
        },
      },
    },
  },
  };
});
