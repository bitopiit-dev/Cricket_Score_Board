import { useTranslation } from 'react-i18next';
import { TeamAvatar } from '../common/TeamAvatar';
import type { Fixture } from '../../data/fixtures';
import { findTeam } from '../../data/teams';
import { useFormat } from '../../hooks/useFormat';
import { useNow, useTournament } from '../../hooks/useTournament';
import { usePrefs } from '../../store/prefsStore';
import { countdown, fixtureStart, nextFixture } from '../../tournament/home';
import { fixtureTeams } from '../../tournament/standings';
import { formatDate, formatTime, slotLabel, stageLabel } from '../../utils/fixtureText';

/**
 * Live tab: the next fixture with a stadium-scoreboard clock counting down to
 * the first ball. It ticks on its own so the match list below doesn't re-render
 * every second. Hidden once the tournament has no fixture left.
 */
export function NextMatchCountdown() {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const tour = useTournament();
  const now = useNow(1000);
  if (!tour) return null;
  const fx = nextFixture(tour.ts, now);
  if (!fx) return null;

  const [idA, idB] = fixtureTeams(fx, tour.ts);
  const c = countdown(fixtureStart(fx), now);
  const groups: [number, string][] = [
    [c.days, t('homePage.days')],
    [c.hours, t('homePage.hours')],
    [c.minutes, t('homePage.minutes')],
    [c.seconds, t('homePage.seconds')],
  ];

  return (
    <section
      aria-label={t('homePage.nextMatch')}
      className="relative overflow-hidden rounded-3xl bg-night-950 text-white shadow-lg ring-1 ring-night-line"
    >
      <SideGlow fx={fx} ids={[idA, idB]} />
      <div className="relative flex flex-col gap-4 px-4 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2 text-xs text-night-muted">
          <span className="font-semibold text-white/90">{t('homePage.nextMatch')}</span>
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

        {!c.due && <SecondsSweep seconds={c.seconds} />}

        <p className="text-center text-sm text-white/85">
          {formatDate(fx.date, lang, bengaliDigits)}, {formatTime(fx.time, lang, f)}
          {fx.venue && <span className="text-night-muted">, {fx.venue}</span>}
        </p>
      </div>
    </section>
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

/** A bar that fills once a minute, red to yellow, under the clock. */
function SecondsSweep({ seconds }: { seconds: number }) {
  // Counting down: full at :59, empty at :00
  const pct = ((seconds + 1) / 60) * 100;
  return (
    <div
      aria-hidden
      className="mx-auto h-1 w-full max-w-xs overflow-hidden rounded-full bg-night-800"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-bpl-red to-bpl-yellow transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
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
