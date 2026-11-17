import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { findTeam } from '../../data/teams';
import type { Match, MatchState } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { resultText } from '../../utils/matchText';
import { TeamAvatar } from '../common/TeamAvatar';

/** A finished match still counts as news for this long after its last ball. */
export const FRESH_FOR_MS = 12 * 60 * 60 * 1000;
const seenKey = (id: string) => `bpl:trophy-seen:${id}`;

/**
 * Whether to show the trophy: the match has a winner, this device hasn't shown
 * it yet, and either the last ball was just watched live or the match ended
 * recently (so opening last week's match doesn't throw a party).
 */
export function shouldCelebrate(s: {
  hasWinner: boolean;
  seen: boolean;
  endedWhileOpen: boolean;
  finishedAt: number | null;
  now: number;
}): boolean {
  if (!s.hasWinner || s.seen) return false;
  if (s.endedWhileOpen) return true;
  return s.finishedAt !== null && s.now - s.finishedAt < FRESH_FOR_MS;
}

function readSeen(id: string): boolean {
  try {
    return localStorage.getItem(seenKey(id)) === '1';
  } catch {
    return false;
  }
}
function markSeen(id: string) {
  try {
    localStorage.setItem(seenKey(id), '1');
  } catch {
    /* private mode: it may show again, which is fine */
  }
}

/**
 * Full-screen golden trophy with the winning team's name and "Congratulations",
 * once per device per match. Tap anywhere, the button or Esc to close; it also
 * closes by itself after a few seconds.
 */
export function WinnerCelebration({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const completed = state.phase === 'completed';
  const [wasCompleted, setWasCompleted] = useState(completed);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const result = state.result;
  const winner = result && result.kind !== 'tie' ? result.winner : null;

  // Decide once when the page opens, and again if the match ends while it is open
  const [checked, setChecked] = useState(false);
  // When the page opened; enough to judge "ended recently"
  const [openedAt] = useState(() => Date.now());
  if (!checked || completed !== wasCompleted) {
    const endedWhileOpen = checked && completed && !wasCompleted;
    setChecked(true);
    setWasCompleted(completed);
    if (
      completed &&
      shouldCelebrate({
        hasWinner: winner !== null,
        seen: readSeen(match.id),
        endedWhileOpen,
        finishedAt: match.events.at(-1)?.at ?? null,
        now: openedAt,
      })
    ) {
      setOpen(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    markSeen(match.id);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const timer = setTimeout(() => setOpen(false), 9000);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [open, match.id]);

  if (!open || winner === null || !result) return null;
  const team = match.teams[winner];
  const info = findTeam(team.teamId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trophy-title"
      onClick={() => setOpen(false)}
      className="trophy-overlay fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden px-6 text-center text-white"
    >
      <div aria-hidden className="trophy-rays absolute top-1/2 left-1/2 size-[160vmax]" />
      <div aria-hidden className="absolute inset-0">
        {Array.from({ length: 36 }, (_, i) => (
          <span
            key={i}
            className="trophy-confetti"
            style={{
              ['--x' as string]: `${(i * 37) % 100}%`,
              ['--d' as string]: `${(i % 9) * 0.22}s`,
              ['--r' as string]: `${(i * 53) % 360}deg`,
              ['--c' as string]: ['#f5c542', '#fff1b8', '#e11d48', '#10b981', '#38bdf8', '#f59e0b'][
                i % 6
              ],
            }}
          />
        ))}
      </div>

      <Trophy />

      <p
        id="trophy-title"
        className="trophy-word relative mt-4 font-display text-5xl leading-none font-extrabold sm:text-6xl"
      >
        {t('trophy.congrats')}
      </p>
      <div className="trophy-team relative mt-5 flex items-center gap-3 rounded-full bg-night-950/80 py-2 pr-6 pl-2 ring-2 ring-[#f5c542]">
        <TeamAvatar name={team.name} color={info?.color} logo={info?.logo} size="md" />
        <span lang="en" className="text-left text-2xl leading-tight font-bold">
          {team.name}
        </span>
      </div>
      <p className="trophy-line relative mt-3 text-lg font-semibold text-[#fff1b8]">
        {resultText(result, match, t, f)}
      </p>
      <button
        ref={closeRef}
        type="button"
        onClick={() => setOpen(false)}
        className="trophy-line relative mt-8 min-h-11 rounded-full bg-white/15 px-6 font-semibold ring-1 ring-white/40 hover:bg-white/25"
      >
        {t('trophy.close')}
      </button>
    </div>
  );
}

/** An original golden cup: bowl, handles, stem and a dark plinth, with a light sweep. */
function Trophy() {
  return (
    <svg aria-hidden viewBox="0 0 200 240" className="trophy-cup relative w-44 sm:w-56">
      <defs>
        <linearGradient id="trophy-gold" x1="0" x2="1">
          <stop offset="0" stopColor="#7a4b00" />
          <stop offset=".22" stopColor="#d99a00" />
          <stop offset=".45" stopColor="#ffe27a" />
          <stop offset=".55" stopColor="#fff4c2" />
          <stop offset=".75" stopColor="#e7a800" />
          <stop offset="1" stopColor="#8a5600" />
        </linearGradient>
        <linearGradient id="trophy-gold-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="1" stopColor="#c98a00" />
        </linearGradient>
        <linearGradient id="trophy-sweep" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="trophy-shape">
          <path d="M50 30H150V70C150 115 125 140 100 140C75 140 50 115 50 70Z" />
          <path d="M88 140H112L106 176H94Z" />
          <path d="M70 186H130L138 214H62Z" />
        </clipPath>
      </defs>
      {/* handles */}
      <path
        d="M52 44C18 40 16 98 64 110"
        fill="none"
        stroke="url(#trophy-gold-v)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M148 44C182 40 184 98 136 110"
        fill="none"
        stroke="url(#trophy-gold-v)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* bowl, stem, knot, foot */}
      <path
        d="M50 30H150V70C150 115 125 140 100 140C75 140 50 115 50 70Z"
        fill="url(#trophy-gold)"
      />
      <ellipse cx="100" cy="30" rx="50" ry="8" fill="#fff1b8" />
      <ellipse cx="100" cy="30" rx="42" ry="5" fill="#b07800" />
      <path d="M88 140H112L106 176H94Z" fill="url(#trophy-gold)" />
      <ellipse cx="100" cy="179" rx="16" ry="6" fill="url(#trophy-gold)" />
      <path d="M70 186H130L138 214H62Z" fill="url(#trophy-gold)" />
      {/* star on the bowl */}
      <path
        d="M100 58l7.6 15.4 17 2.5-12.3 12 2.9 16.9L100 96.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z"
        fill="#fff6d0"
        stroke="#b07800"
        strokeWidth="2"
      />
      {/* plinth with a name plate */}
      <rect x="52" y="214" width="96" height="20" rx="3" fill="#3b2410" />
      <rect x="78" y="219" width="44" height="10" rx="2" fill="url(#trophy-gold-v)" />
      {/* light sweep across the gold */}
      <g clipPath="url(#trophy-shape)">
        <rect
          className="trophy-sweep"
          x="-60"
          y="0"
          width="50"
          height="240"
          fill="url(#trophy-sweep)"
          transform="skewX(-18)"
        />
      </g>
    </svg>
  );
}
