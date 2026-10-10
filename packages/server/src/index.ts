import { networkInterfaces } from 'node:os';
import { loadConfig } from './config.ts';
import { startServer } from './start.ts';

const config = loadConfig();
const running = await startServer(config);
const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i!.address);
console.log(`Music Curator server
  data dir : ${config.dataDir}
  listening: ${config.host}:${running.port}
  urls     : ${ips.map((ip) => `http://${ip}:${running.port}`).join(', ') || '(no LAN address found)'}
  token    : ${config.token}   (also stored in ${config.dataDir}/token)`);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => { void running.close().then(() => process.exit(0)); });
}
