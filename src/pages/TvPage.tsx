import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_SUBTITLE, APP_TITLE } from '../config/app';
import { PageSkeleton } from '../components/common/Skeleton';
import { useNow, useTournament } from '../hooks/useTournament';
import { usePrefs } from '../store/prefsStore';
import { QUALIFIERS } from '../tournament/format';
import { nextMatchDay, pickHero, upcomingFixtures } from '../tournament/home';
import { assetUrl } from '../utils/asset';
import { Hero, NextMatches, Progress } from './HomePage';
import { Table } from './PointsPage';

/** The page is laid out on a fixed 16:9 canvas, then scaled to fill any TV. */
const CANVAS_W = 1024;
const CANVAS_H = 576;
/** How long each side panel (points table, next matches, progress) stays up. */
const PANEL_MS = 12_000;

/**
 * TV mode (#/tv): a full-screen board for a TV at the ground or in the office.
 * The match (countdown, live score or result) stays on the left; the right side
 * rotates through the points tables, the next matches and the tournament progress.
 * No tab bar and nothing to tap: open it once and leave it running.
 */
export default function TvPage() {
  const { t } = useTranslation();
  const tour = useTournament(5000);
  const now = useNow(1000);
  const scale = useCanvasScale();
  const fullscreen = useFullscreen();
  useWakeLock();

  if (!tour) return <PageSkeleton variant="hero" />;

  const hero = pickHero(tour.matches, tour.ts, now);
  const inHero =
    hero.kind === 'upcoming'
      ? nextMatchDay(tour.ts, now).map((fx) => fx.id)
      : hero.kind === 'result' && hero.next
        ? [hero.next.id]
        : [];
  const next = upcomingFixtures(tour.ts, now, 3, inHero);
  const { tables } = tour.ts;

  const panels: { key: string; node: ReactNode }[] = [];
  if (tables.superSix.length > 0) {
    panels.push({
      key: 'superSix',
      node: <Table stage="superSix" rows={tables.superSix} qualify={QUALIFIERS.superSix} />,
    });
  } else {
    panels.push(
      {
        key: 'groupA',
        node: <Table stage="groupA" rows={tables.groupA} qualify={QUALIFIERS.group} />,
      },
      {
        key: 'groupB',
        node: <Table stage="groupB" rows={tables.groupB} qualify={QUALIFIERS.group} />,
      },
    );
  }
  if (next.length > 0)
    panels.push({ key: 'next', node: <NextMatches fixtures={next} ts={tour.ts} /> });
  panels.push({ key: 'progress', node: <Progress ts={tour.ts} /> });

  return (
    // Always dark, whatever the theme setting on this browser: a TV is seen from across a room
    <div
      className={`dark fixed inset-0 overflow-hidden bg-night-950 text-white ${
        fullscreen.active ? 'cursor-none' : ''
      }`}
    >
      <h1 className="sr-only">{t('tv.title')}</h1>
      <div
        className="absolute top-1/2 left-1/2 flex flex-col gap-3 p-4"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <TvHeader now={now} />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,520px)_minmax(0,1fr)] gap-4">
          {/* The live match is the reason the TV is on, so it gets the larger side */}
          <div className="flex min-h-0 flex-col justify-center overflow-hidden">
            <Hero hero={hero} now={now} />
          </div>
          <Rotator panels={panels} />
        </div>
      </div>

      {fullscreen.supported && !fullscreen.active && (
        // Focused on load, so the OK button on a TV remote goes full screen
        <button
          type="button"
          autoFocus
          onClick={fullscreen.enter}
          className="absolute right-4 bottom-4 rounded-full bg-bpl-yellow px-5 py-3 font-semibold text-night-950 shadow-lg focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {t('tv.fullscreen')}
        </button>
      )}
    </div>
  );
}

/* --------------------------------- Pieces -------------------------------- */

function TvHeader({ now }: { now: number }) {
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  // Dhaka time, so a TV with a wrong time zone still shows the ground's clock
  const locale = lang === 'bn' ? (bengaliDigits ? 'bn-BD' : 'bn-BD-u-nu-latn') : 'en-GB';
  const clock = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Dhaka',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  return (
    <header className="flex items-center gap-3">
      <img
        src={assetUrl('images/bpl-2027-logo-v2.webp')}
        alt=""
        className="size-11 shrink-0 object-contain"
      />
      <div className="min-w-0 flex-1 leading-tight">
        <p lang="en" className="font-display text-2xl font-extrabold tracking-wide">
          {APP_TITLE}
        </p>
        <p lang="en" className="truncate text-xs text-night-muted">
          {APP_SUBTITLE}
        </p>
      </div>
      <ScanToFollow />
      <div className="ml-2 text-right leading-tight">
        <p className="tabular font-display text-3xl font-bold">{clock}</p>
        <p className="text-xs text-night-muted">{date}</p>
      </div>
    </header>
  );
}

/** Shows one panel at a time and moves to the next every PANEL_MS. */
function Rotator({ panels }: { panels: { key: string; node: ReactNode }[] }) {
  const [i, setI] = useState(0);
  const count = panels.length;
  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => setI((n) => n + 1), PANEL_MS);
    return () => clearInterval(timer);
  }, [count]);
  // The list can shrink (e.g. no more upcoming matches), so wrap the index
  const current = panels[i % count];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div key={current.key} className="tv-panel min-h-0 flex-1 overflow-hidden">
        {current.node}
      </div>
      {count > 1 && (
        <div aria-hidden className="flex justify-center gap-1.5">
          {panels.map((p, n) => (
            <span
              key={p.key}
              className={`h-1.5 rounded-full transition-all ${
                n === i % count ? 'w-6 bg-bpl-yellow' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** QR code so people in front of the TV can open the app on their own phone. */
function ScanToFollow() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-night-900 py-1 pr-3 pl-1">
      <img
        src={assetUrl('images/bpl-2027-qr.png')}
        alt=""
        className="size-12 shrink-0 rounded-lg bg-white p-0.5"
      />
      <p className="max-w-40 text-xs leading-snug">{t('tv.scan')}</p>
    </div>
  );
}

/* --------------------------------- Hooks --------------------------------- */

/** Scale that fits the fixed canvas inside the window, keeping 16:9. */
function useCanvasScale(): number {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () =>
      setScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

function useFullscreen() {
  const [active, setActive] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  return {
    supported: typeof document.documentElement.requestFullscreen === 'function',
    active,
    enter: () => void document.documentElement.requestFullscreen().catch(() => {}),
  };
}

/** Keeps the screen from dimming or sleeping while the board is open, where the browser allows it. */
function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => {});
    };
    request();
    // The lock is dropped whenever the page is hidden; take it again on return
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => {});
    };
  }, []);
}
