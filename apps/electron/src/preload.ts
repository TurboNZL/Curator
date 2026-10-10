import { contextBridge, ipcRenderer } from 'electron';

/**
 * What the web client may know about the desktop app. `token` lets a fresh install connect to its own server without typing
 * anything; the other calls open the folder dialogs, which only the main process can do.
 */
const info = ipcRenderer.sendSync('curator:info') as { token: string; version: string; dataDir: string; platform: string; port: number };

contextBridge.exposeInMainWorld('curatorDesktop', {
  ...info,
  chooseLibraryFolder: () => ipcRenderer.invoke('curator:choose-folder') as Promise<string | null>,
  showLibraryFolder: () => ipcRenderer.invoke('curator:show-folder') as Promise<void>,
});
