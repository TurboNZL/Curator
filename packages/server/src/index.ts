import { serve } from '@hono/node-server';
import { loadConfig } from './config.ts';
import { Store } from './db.ts';
import { createApp } from './app.ts';
import { networkInterfaces } from 'node:os';

const config = loadConfig();
const store = new Store(config.dataDir);
const app = createApp(config, store);

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i!.address);
  console.log(`Music Curator server
  data dir : ${config.dataDir}
  listening: ${config.host}:${config.port}
  urls     : ${ips.map((ip) => `http://${ip}:${config.port}`).join(', ') || '(no LAN address found)'}
  token    : ${config.token}   (also stored in ${config.dataDir}/token)`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => { server.close(); store.close(); process.exit(0); });
}
