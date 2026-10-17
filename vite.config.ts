import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'tmdb-proxy',
        configureServer(server) {
          server.middlewares.use('/api/tmdb', async (req, res) => {
            const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
            const p = urlObj.searchParams.get('path');
            if (!p || !p.startsWith('/') || p.includes('..')) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'bad path' }));
              return;
            }
            const apiKey = process.env.TMDB_API_KEY || '';
            const upstream = new URL(`https://api.themoviedb.org/3${p}`);
            upstream.searchParams.set('api_key', apiKey);
            urlObj.searchParams.forEach((v, k) => {
              if (k !== 'path') upstream.searchParams.set(k, v);
            });
            try {
              const fetchRes = await fetch(upstream.toString());
              const json = await fetchRes.text();
              res.statusCode = fetchRes.status;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'public, max-age=1800');
              res.end(json);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Upstream error' }));
            }
          });
          server.middlewares.use('/timg', async (req, res) => {
            const imgPath = req.url || '';
            const upstream = `https://image.tmdb.org/t/p${imgPath}`;
            try {
              const fetchRes = await fetch(upstream);
              res.statusCode = fetchRes.status;
              const cType = fetchRes.headers.get('content-type');
              if (cType) res.setHeader('Content-Type', cType);
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
              const buf = Buffer.from(await fetchRes.arrayBuffer());
              res.end(buf);
            } catch {
              res.statusCode = 404;
              res.end();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
