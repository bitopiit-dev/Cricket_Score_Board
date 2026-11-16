import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TeamAvatar } from '../common/TeamAvatar';
import type { Fixture } from '../../data/fixtures';
import { findTeam } from '../../data/teams';
import { useFormat } from '../../hooks/useFormat';
import { useNow, useTournament } from '../../hooks/useTournament';
import { usePrefs } from '../../store/prefsStore';
import { countdown, fixtureStart, nextMatchDay } from '../../tournament/home';
import { fixtureTeams, type TournamentState } from '../../tournament/standings';
import { formatDate, formatTime, slotLabel, stageLabel } from '../../utils/fixtureText';

/**
 * Home and Live: the next match day's fixtures, each with a stadium-scoreboard
 * clock counting down to the first ball. With two matches that day they take
 * turns in the same place (swipe, tap a dot, or let it move on by itself).
 * It ticks on its own so the page around it doesn't re-render every second.
 * Hidden once the tournament has no fixture left.
 */
export function NextMatchCountdown() {
  const tour = useTournament();
  const now = useNow(1000);
  if (!tour) return null;
  const day = nextMatchDay(tour.ts, now);
  if (day.length === 0) return null;
  if (day.length === 1)
    return (
      <Frame>
        <CountdownSlide fx={day[0]} ts={tour.ts} now={now} first />
      </Frame>
    );
  return <Carousel fixtures={day} ts={tour.ts} now={now} />;
}

const FRAME =
  'relative overflow-hidden rounded-3xl bg-night-950 text-white shadow-lg ring-1 ring-night-line';

function Frame({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('homePage.nextMatch')} className={FRAME}>
      {children}
    </section>
  );
}

/** How long each match stays before the next one slides in. */
const SLIDE_MS = 7000;

function scrollToSlide(el: HTMLElement, i: number, smooth: boolean) {
  el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
}

function Carousel({
  fixtures,
  ts,
  now,
}: {
  fixtures: Fixture[];
  ts: TournamentState;
  now: number;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Stopped for good once someone takes over (swipe, dot or the pause button)
  const [stopped, setStopped] = useState(false);
  // Held while the pointer or keyboard focus is on it
  const [held, setHeld] = useState(false);
  const reducedMotion = useReducedMotion();
  const count = fixtures.length;
  const current = Math.min(active, count - 1);
  const rotating = !stopped && !held && !reducedMotion;

  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => {
      const el = track.current;
      if (!el || !el.clientWidth) return;
      scrollToSlide(el, (Math.round(el.scrollLeft / el.clientWidth) + 1) % count, true);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [rotating, count]);

  const show = (i: number) => {
    setStopped(true);
    if (track.current) scrollToSlide(track.current, i, !reducedMotion);
  };

  return (
    <section
      aria-roledescription={t('homePage.carousel')}
      aria-label={t('homePage.nextMatch')}
      className={FRAME}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      }}
    >
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth) setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
        onPointerDown={() => setStopped(true)}
        // Keyboard: focus the matches and use the arrow keys, as with a swipe
        tabIndex={0}
        aria-label={t('homePage.slidesKeys')}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          show((current + (e.key === 'ArrowRight' ? 1 : count - 1)) % count);
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-3xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bpl-yellow"
      >
        {fixtures.map((fx, i) => (
          <div
            key={fx.id}
            role="group"
            aria-roledescription={t('homePage.slide')}
            aria-label={t('homePage.slideOf', { i: f.num(i + 1), n: f.num(count) })}
            aria-hidden={i !== current}
            inert={i !== current}
            className="relative w-full shrink-0 snap-start"
          >
            <CountdownSlide fx={fx} ts={ts} now={now} first={i === 0} />
          </div>
        ))}
      </div>

      <div className="relative flex items-center justify-center gap-1 pb-2">
        {fixtures.map((fx, i) => (
          <button
            key={fx.id}
            type="button"
            onClick={() => show(i)}
            aria-label={t('homePage.showMatch', { n: f.num(fx.no) })}
            aria-current={i === current}
            className="group flex size-11 items-center justify-center"
          >
            <span
              aria-hidden
              className={`h-2 rounded-full transition-all motion-reduce:transition-none ${
                i === current ? 'w-6 bg-bpl-yellow' : 'w-2 bg-white/40 group-hover:bg-white/70'
              }`}
            />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStopped((s) => !s)}
          aria-label={t(stopped ? 'homePage.playSlides' : 'homePage.pauseSlides')}
          className="flex size-11 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden className="text-xs">
            {stopped ? '▶' : '❚❚'}
          </span>
        </button>
      </div>
    </section>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** One match: both teams, the scoreboard clock and the start time. */
function CountdownSlide({
  fx,
  ts,
  now,
  first,
}: {
  fx: Fixture;
  ts: TournamentState;
  now: number;
  first: boolean;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const [idA, idB] = fixtureTeams(fx, ts);
  const c = countdown(fixtureStart(fx), now);
  const groups: [number, string][] = [
    [c.days, t('homePage.days')],
    [c.hours, t('homePage.hours')],
    [c.minutes, t('homePage.minutes')],
    [c.seconds, t('homePage.seconds')],
  ];

  return (
    <>
      <SideGlow fx={fx} ids={[idA, idB]} />
      <div className="relative flex flex-col gap-4 px-4 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2 text-xs text-night-muted">
          <span className="font-semibold text-white/90">
            {t(first ? 'homePage.nextMatch' : 'homePage.thenMatch')}
          </span>
          <span>
            {t('fixtures.matchNo', { n: f.num(fx.no) })}, {stageLabel(fx.stage, t)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <Side slot={fx.teamA} id={idA} />
          <span className="font-display text-xl font-bold text-night-muted">{t('common.vs')}</span>
          <Side slot={fx.teamB} id={idB} />
        </div>

        {c.due ? (
          <p className="countdown-due py-3 text-center font-display text-4xl font-extrabold tracking-wide text-bpl-yellow">
            {t('homePage.startingSoon')}
          </p>
        ) : (
          <div
            role="timer"
            aria-label={t('homePage.startsIn')}
            className="countdown-board flex items-start justify-center gap-1 sm:gap-2"
          >
            {groups.map(([n, label], i) => (
              <div key={label} className="flex items-start gap-1 sm:gap-2">
                {i > 0 && <Colon />}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex gap-1">
                    {String(Math.min(n, 99))
                      .padStart(2, '0')
                      .split('')
                      .map((d, j) => (
                        <Digit key={j} value={f.num(d)} />
                      ))}
                  </div>
                  <span className="text-xs text-night-muted">{label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-white/85">
          {formatDate(fx.date, lang, bengaliDigits)}, {formatTime(fx.time, lang, f)}
          {fx.venue && <span className="text-night-muted">, {fx.venue}</span>}
        </p>
      </div>
    </>
  );
}

/** One scoreboard cell. A new value drops in (key = value restarts the animation). */
function Digit({ value }: { value: string }) {
  return (
    <span className="digit-cell relative flex items-center justify-center overflow-hidden rounded-lg">
      <span
        key={value}
        className="digit-in tabular font-display leading-none font-extrabold text-bpl-yellow"
      >
        {value}
      </span>
      {/* The split line of a flip-board cell */}
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-night-950/80" />
    </span>
  );
}

function Colon() {
  return (
    <span aria-hidden className="countdown-colon flex flex-col justify-center gap-2">
      <span className="size-1.5 rounded-full bg-bpl-red" />
      <span className="size-1.5 rounded-full bg-bpl-red" />
    </span>
  );
}

function Side({ slot, id }: { slot: Fixture['teamA']; id: string | null }) {
  const { t } = useTranslation();
  const f = useFormat();
  const team = findTeam(id ?? (slot.kind === 'team' ? slot.teamId : undefined));
  const name = team?.name ?? slotLabel(slot, id, t, f);
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <TeamAvatar name={name} color={team?.color} logo={team?.logo} size="lg" />
      <span lang="en" className="line-clamp-2 text-sm leading-tight font-semibold">
        {name}
      </span>
    </div>
  );
}

/** Each team's colour glows softly behind its side of the card. */
function SideGlow({ fx, ids }: { fx: Fixture; ids: [string | null, string | null] }) {
  const color = (slot: Fixture['teamA'], id: string | null) =>
    findTeam(id ?? (slot.kind === 'team' ? slot.teamId : undefined))?.color ??
    'var(--color-night-line)';
  const a = color(fx.teamA, ids[0]);
  const b = color(fx.teamB, ids[1]);
  return (
    <div
      aria-hidden
      className="countdown-glow absolute inset-0 opacity-60"
      style={{
        background: `radial-gradient(60% 55% at 12% 30%, ${a}, transparent 70%), radial-gradient(60% 55% at 88% 30%, ${b}, transparent 70%)`,
      }}
    />
  );
}
