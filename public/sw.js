/*
 * BPL-2027 service worker: lets the app open with no signal (e.g. a scorer at
 * the ground reopening it). Scores themselves live in IndexedDB and Supabase;
 * this only caches the app's own files.
 *
 * - The page (index.html): network first, always checked with the server (not
 *   the browser's HTTP cache), so a new version arrives as soon as there is
 *   signal; the cached copy is used offline.
 * - Built files (assets/, hashed names never change): cache first.
 * - Logos, photos and other files: the cached copy at once, refreshed in the
 *   background (a replaced logo shows on the next visit).
 * - Anything on another site (Supabase, fonts CDN, WhatsApp) is left alone.
 */
const VERSION = 'v1';
const PAGE = `bpl-page-${VERSION}`;
const FILES = `bpl-files-${VERSION}`;
const scope = new URL(self.registration.scope);
const INDEX = new URL('./', scope).href;
// Module scripts are requested with an Origin header that the precache request
// didn't have; servers answering 'Vary: Origin' would otherwise miss the cache.
const MATCH = { ignoreVary: true };

/** The page plus every script and stylesheet it links, so the first offline open works. */
async function precache() {
  const res = await fetch(INDEX, { cache: 'no-cache' });
  if (!res.ok) return;
  const html = await res.clone().text();
  await (await caches.open(PAGE)).put(INDEX, res);
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => new URL(m[1], INDEX))
    .filter((u) => u.origin === scope.origin)
    .map((u) => u.href);
  const files = await caches.open(FILES);
  await Promise.all(urls.map((u) => files.add(u).catch(() => undefined)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precache()
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('bpl-') && k !== PAGE && k !== FILES)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== scope.origin || !url.href.startsWith(scope.href)) return;
  if (url.pathname.endsWith('/sw.js')) return;

  if (req.mode === 'navigate') {
    // Only the app's own page is kept for offline use. Any other page (demo.html)
    // goes straight to the network, so it can never replace the saved app page.
    const appPage =
      url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`;
    if (!appPage) return;
    event.respondWith(
      // no-cache: ask the server every time (a cheap "has it changed?" check)
      // instead of reusing the browser's copy, which GitHub Pages lets live for
      // 10 minutes; otherwise a new version only shows up after that wait
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(PAGE).then((c) => c.put(INDEX, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(INDEX, MATCH)) || Response.error()),
    );
    return;
  }

  const save = (res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      void caches.open(FILES).then((c) => c.put(req, copy));
    }
    return res;
  };
  // Built files have the content hash in their name: the cached copy is always right
  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(req, MATCH).then((hit) => hit || fetch(req).then(save)));
    return;
  }
  // Logos, photos, manifest: show the cached copy now, refresh it in the background,
  // so a replaced team logo appears on the next visit
  event.respondWith(
    caches.match(req, MATCH).then((hit) => {
      const fresh = fetch(req)
        .then(save)
        .catch(() => hit || Response.error());
      if (hit) event.waitUntil(fresh.catch(() => undefined));
      return hit || fresh;
    }),
  );
});
