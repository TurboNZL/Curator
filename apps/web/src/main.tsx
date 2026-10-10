import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.tsx';
import './index.css';
import './ui-styles.css';
import { applyAppearance } from './lib/appearance.ts';
import { useStore } from './lib/store.ts';

// before the first paint, so a saved theme does not flash the default one
applyAppearance(useStore.getState().settings);

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
);

// Offline app shell. Service workers need a secure origin (https or localhost); elsewhere this is skipped and the app still works online.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
