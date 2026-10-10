import { serve } from '@hono/node-server';
import type { Config } from './config.ts';
import { Store } from './db.ts';
import { createApp } from './app.ts';

export interface Running { config: Config; store: Store; port: number; close(): Promise<void> }

/**
 * Open the library and start listening. Used by the command line (index.ts) and by the desktop app, which runs the same
 * server inside Electron. Resolves once the port is bound; rejects (EADDRINUSE etc.) if it cannot be.
 */
export function startServer(config: Config): Promise<Running> {
  const store = new Store(config.dataDir);
  const app = createApp(config, store);
  return new Promise((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
      resolve({
        config, store, port: info.port,
        close: () => new Promise<void>((done) => { server.close(() => { store.close(); done(); }); (server as unknown as { closeAllConnections?: () => void }).closeAllConnections?.(); }),
      });
    });
    server.on('error', (e) => { store.close(); reject(e); });
  });
}
