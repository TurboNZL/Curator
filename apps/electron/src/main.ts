import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type MenuItemConstructorOptions } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../../../packages/server/src/config.ts';
import { startServer, type Running } from '../../../packages/server/src/start.ts';
import { findWebDir, loadDesktopConfig, loadDiscordConfig, saveDesktopConfig, saveDiscordConfig } from './desktopConfig.ts';
import { DiscordPresence, type Presence } from './discord.ts';
import { Updates } from './updater.ts';

/**
 * The desktop app runs the same server as the Raspberry Pi, inside the app, on 127.0.0.1, with the library in a folder of the
 * user's choice, and shows the web client from it. Everything the web client does works unchanged: it keeps its working copy in
 * the window's storage and syncs with this server, or (Settings > Server) with another one, such as the Pi.
 */
const here = dirname(fileURLToPath(import.meta.url));
let server: Running | null = null;
let win: BrowserWindow | null = null;
const discord = new DiscordPresence();
const updates = new Updates(app.isPackaged, (state) => win?.webContents.send('curator:update', state));

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

// let the sound keep going when the window is hidden, and let the keyboard's media keys reach the page (MPRIS on Linux)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-features', 'MediaSessionService,HardwareMediaKeyHandling');

const userData = () => app.getPath('userData');

async function boot(): Promise<void> {
  const desk = loadDesktopConfig(userData());
  const webDir = findWebDir(process.resourcesPath, join(here, '../../web/dist'));
  if (!webDir) throw new Error('The web client has not been built. Run `pnpm --filter @curator/web build` first.');
  const config = loadConfig({ ...process.env, CURATOR_DATA_DIR: desk.dataDir, CURATOR_HOST: '127.0.0.1', CURATOR_PORT: String(desk.port), CURATOR_WEB_DIR: webDir });
  try { server = await startServer(config); }
  catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    throw new Error(code === 'EADDRINUSE'
      ? `Port ${desk.port} is already in use. Close whatever uses it, or set CURATOR_DESKTOP_PORT to another port (the app remembers its data per port).`
      : `The library could not be opened in ${desk.dataDir}: ${(e as Error).message}`);
  }
}

function openWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 420, minHeight: 560, backgroundColor: '#0b0b10', show: false, title: 'Music Curator',
    icon: join(here, '../build/icon.png'),
    webPreferences: { preload: join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, spellcheck: false },
  });
  win.once('ready-to-show', () => win?.show());
  const origin = `http://127.0.0.1:${server!.port}`;
  // anything that is not this app opens in the user's browser instead of inside the app
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) void shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin)) { e.preventDefault(); if (/^https?:/.test(url)) void shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
  void win.loadURL(origin);
}

function chooseFolder(): Promise<string | null> {
  return dialog.showOpenDialog(win ?? undefined!, { title: 'Choose the library folder', properties: ['openDirectory', 'createDirectory'], defaultPath: server?.config.dataDir })
    .then(async (r) => {
      const dir = r.filePaths[0];
      if (r.canceled || !dir || dir === server?.config.dataDir) return null;
      saveDesktopConfig(userData(), { dataDir: dir });
      const ok = await dialog.showMessageBox({ type: 'info', buttons: ['Restart now', 'Later'], defaultId: 0, message: 'Library folder changed',
        detail: `The app will use ${dir} after it restarts. The library that is in the old folder is not moved: copy its contents over to keep it, or sync it from your server.` });
      if (ok.response === 0) { app.relaunch(); app.quit(); }
      return dir;
    });
}

ipcMain.on('curator:info', (e) => {
  e.returnValue = { token: server?.config.token ?? '', version: app.getVersion(), dataDir: server?.config.dataDir ?? '', platform: process.platform, port: server?.port ?? 0 };
});
ipcMain.handle('curator:choose-folder', () => chooseFolder());
const discordInfo = () => ({ ...loadDiscordConfig(userData()), status: discord.status });
ipcMain.on('curator:presence', (_e, p: Presence | null) => {
  if (p && (typeof p.title !== 'string' || typeof p.artist !== 'string')) return;
  discord.update(p ? { title: p.title, artist: p.artist, album: String(p.album ?? ''), duration: Number(p.duration) || 0, position: Number(p.position) || 0, playing: !!p.playing } : null);
});
ipcMain.handle('curator:discord-get', () => discordInfo());
ipcMain.handle('curator:discord-set', (_e, patch: { discordEnabled?: boolean; discordClientId?: string }) => {
  saveDiscordConfig(userData(), { ...(typeof patch.discordEnabled === 'boolean' ? { discordEnabled: patch.discordEnabled } : {}), ...(typeof patch.discordClientId === 'string' ? { discordClientId: patch.discordClientId.trim() } : {}) });
  const c = loadDiscordConfig(userData());
  discord.configure(c.discordClientId, c.discordEnabled);
  return discordInfo();
});
ipcMain.handle('curator:update-state', () => updates.state);
ipcMain.handle('curator:update-check', () => updates.check());
ipcMain.on('curator:update-install', () => updates.install());
ipcMain.handle('curator:show-folder', () => { if (server) void shell.openPath(server.config.dataDir); });

function menu() {
  const mac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [
    ...(mac ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
    { label: 'File', submenu: [
      { label: 'Library folder…', click: () => void chooseFolder() },
      { label: 'Show library folder', click: () => server && void shell.openPath(server.config.dataDir) },
      { type: 'separator' }, mac ? { role: 'close' } : { role: 'quit' },
    ] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }, { role: 'toggleDevTools' }] },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let closing = false;
app.on('before-quit', (e) => {
  if (closing || !server) return;
  e.preventDefault(); closing = true;
  void Promise.allSettled([discord.stop(), server.close()]).finally(() => app.exit(0));
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!win && server) openWindow(); });

void app.whenReady().then(async () => {
  try { await boot(); } catch (e) { dialog.showErrorBox('Music Curator cannot start', (e as Error).message); app.exit(1); return; }
  menu();
  openWindow();
  const dc = loadDiscordConfig(userData());
  discord.configure(dc.discordClientId, dc.discordEnabled);
  updates.start();
});
