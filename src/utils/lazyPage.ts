import { lazy, type ComponentType } from 'react';

const loaders: (() => Promise<unknown>)[] = [];

/**
 * A page loaded on first visit, so the first screen downloads less.
 * Every page registered here is fetched in the background soon after start
 * (see preloadPages), so the service worker still has all of them for offline use.
 */
export function lazyPage<T extends ComponentType>(load: () => Promise<{ default: T }>) {
  loaders.push(load);
  return lazy(load);
}

/** Fetch every lazy page once the app is idle; skipped when the phone asks to save data. */
export function preloadPages() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData;
  if (saveData) return;
  const run = () => loaders.forEach((load) => void load().catch(() => undefined));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}
