import 'dotenv/config';
import { config } from './config';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import app from './app';
import { registerXpDecayJob, registerWeeklyLeaderboardReset } from './jobs/xpDecay';
import { prisma } from './lib/prisma';

const PORT = config.PORT;

// ─── Start server (HTTPS if certs exist, HTTP otherwise) ─────────────────────

function startServer(): http.Server | https.Server {
  const certPath = process.env.SSL_CERT_PATH;
  const keyPath = process.env.SSL_KEY_PATH;

  if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const credentials = {
      cert: fs.readFileSync(path.resolve(certPath)),
      key: fs.readFileSync(path.resolve(keyPath)),
    };
    const server = https.createServer(credentials, app);
    server.listen(PORT, () => {
      console.log(`[server] HTTPS listening on https://localhost:${PORT}`);
    });
    return server;
  } else {
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`[server] HTTP listening on http://localhost:${PORT}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[server] ⚠️  Running HTTP — run mkcert to enable HTTPS for Office Add-in dev');
      }
    });
    return server;
  }
}

const server = startServer();

// ─── Graceful shutdown ────────────────────────────────────────────────────────

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Database disconnected. Exiting.');
    } catch (e) {
      console.error('Error during shutdown:', e);
    }
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

// ─── Background jobs (local dev only — Vercel uses HTTP cron endpoints) ──────

registerXpDecayJob();
registerWeeklyLeaderboardReset();
