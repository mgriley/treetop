import express from 'express';
import { createServer as createHttpServer } from 'http';
import path from 'path';

const app = express();
const PORT = process.env.PORT ?? 3000;
const isDev = process.env.NODE_ENV !== 'production';

async function start() {
  const httpServer = createHttpServer(app);

  if (isDev) {
    // Vite intercepts requests for client files and serves them on the fly —
    // transforming TS/Vue on demand and injecting HMR so the browser updates
    // instantly on save. This replaces the need to run a separate Vite dev server.
    // We pass the httpServer so Vite's HMR WebSocket shares the same port as
    // Express rather than opening a separate one (which Traefik wouldn't route).
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, '../vite.config.ts'),
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const publicDir = path.resolve(__dirname, '../public');
    app.use(express.static(publicDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`Treetop server running on port ${PORT}`);
  });
}

start();
