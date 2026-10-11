import { contextBridge, ipcRenderer } from 'electron';

/**
 * What the web client may know about the desktop app. `token` lets a fresh install connect to its own server without typing
 * anything; the other calls open the folder dialogs, which only the main process can do.
 */
const info = ipcRenderer.sendSync('curator:info') as { token: string; version: string; dataDir: string; platform: string; port: number; customFrame: boolean };

contextBridge.exposeInMainWorld('curatorDesktop', {
  ...info,
  chooseLibraryFolder: () => ipcRenderer.invoke('curator:choose-folder') as Promise<string | null>,
  setPresence: (p: unknown) => ipcRenderer.send('curator:presence', p),
  getDiscord: () => ipcRenderer.invoke('curator:discord-get') as Promise<unknown>,
  setDiscord: (patch: unknown) => ipcRenderer.invoke('curator:discord-set', patch) as Promise<unknown>,
  updates: {
    state: () => ipcRenderer.invoke('curator:update-state') as Promise<unknown>,
    hasToken: () => ipcRenderer.invoke('curator:update-has-token') as Promise<boolean>,
    setToken: (t: string) => ipcRenderer.invoke('curator:update-set-token', t) as Promise<void>,
    check: () => ipcRenderer.invoke('curator:update-check') as Promise<unknown>,
    install: () => ipcRenderer.send('curator:update-install'),
    onState: (cb: (s: unknown) => void) => { const h = (_e: unknown, s: unknown) => cb(s); ipcRenderer.on('curator:update', h); return () => { ipcRenderer.removeListener('curator:update', h); }; },
  },
  getGraphics: () => ipcRenderer.invoke('curator:graphics') as Promise<unknown>,
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('curator:window', action),
  setCustomFrame: (on: boolean) => ipcRenderer.invoke('curator:set-frame', on) as Promise<void>,
  onWindowState: (cb: (maximized: boolean) => void) => { const h = (_e: unknown, m: boolean) => cb(m); ipcRenderer.on('curator:window-state', h); return () => { ipcRenderer.removeListener('curator:window-state', h); }; },
  showLibraryFolder: () => ipcRenderer.invoke('curator:show-folder') as Promise<void>,
});
