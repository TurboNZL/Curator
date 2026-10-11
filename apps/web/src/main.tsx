import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.tsx';
import './index.css';
import './ui-styles.css';
import './fortnite-fonts.css';
import { applyAppearance } from './lib/appearance.ts';
import { startConnect } from './lib/connect.ts';
import { startPresence } from './lib/discordPresence.ts';
import { useStore } from './lib/store.ts';
import { startRipple } from './lib/ripple.ts';
import { startHaptics } from './lib/haptics.ts';
import { syncNativeServer } from './lib/native.ts';

// before the first paint, so a saved theme does not flash the default one
applyAppearance(useStore.getState().settings);
startConnect();
startHaptics();
startRipple();
startPresence();
// the Android app's car interface needs the server address too; the app's own page is served from a private address, so a blank URL means "this origin"
{
  let last = '';
  const push = (s: { serverUrl: string; token: string }) => { const k = `${s.serverUrl}|${s.token}`; if (k !== last) { last = k; syncNativeServer(s.serverUrl, s.token); } };
  push(useStore.getState().settings);
  useStore.subscribe((st) => push(st.settings));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
);

// Offline app shell. Service workers need a secure origin (https or localhost); elsewhere this is skipped and the app still works online.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
