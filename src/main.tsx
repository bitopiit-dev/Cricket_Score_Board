import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/hind-siliguri/400.css';
import '@fontsource/hind-siliguri/600.css';
import '@fontsource/hind-siliguri/700.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import './index.css';
import './i18n';
import App from './App';
import { requestPersistentStorage } from './db/repository';
import { startMatchSync } from './sync/matchSync';
import { loadData } from './sync/remoteData';

void requestPersistentStorage();

// Offline start-up (public/sw.js). Only in the built site: in development it
// would serve stale files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((e) => console.warn('Service worker not registered', e));
  });
}

// The admin's latest fixtures and teams first (at most a couple of seconds;
// offline, the copy kept on this phone or the built-in one is used).
const root = createRoot(document.getElementById('root')!);
void loadData().finally(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  startMatchSync();
});
