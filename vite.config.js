import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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

export default defineConfig({
  plugins: [react(), localSheetsProxy()],
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
});
