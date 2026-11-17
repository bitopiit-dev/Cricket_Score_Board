import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { findTeam } from '../../data/teams';
import { BALLS_PER_OVER } from '../../engine/rules';
import type { Match, MatchState, TeamIndex } from '../../engine/types';
import { winChance, winChanceTimeline } from '../../engine/winProbability';
import { useFormat } from '../../hooks/useFormat';

const FALLBACK = ['#e10a14', '#2563eb'];

/** Each team's colour; two teams in the same colour would be unreadable. */
export function teamColors(match: Match): [string, string] {
  const c = match.teams.map((tm, i) => findTeam(tm.teamId)?.color ?? FALLBACK[i]);
  if (c[0].toLowerCase() === c[1].toLowerCase()) c[1] = FALLBACK[c[0] === FALLBACK[1] ? 0 : 1];
  return [c[0], c[1]];
}

/** Rounded percentages that still add up to 100. */
function percents(chance: [number, number]): [number, number] {
  const a = Math.round(chance[0] * 100);
  return [a, 100 - a];
}

/**
 * Both teams' live win chance as one split bar, for the dark match hero.
 * Moves with every ball; hidden before the first ball and after the result.
 */
export function WinChanceMeter({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const wc = useMemo(() => winChance(match, state), [match, state]);
  if (!wc || match.events.length === 0) return null;
  const [p0, p1] = percents(wc.chance);
  const colors = teamColors(match);
  const label = `${t('winChance.title')}: ${match.teams[0].name} ${p0}%, ${match.teams[1].name} ${p1}%`;

  const side = (team: TeamIndex, p: number) => (
    <span
      className={`tabular font-display text-lg leading-none font-extrabold ${
        team === 1 ? 'text-right' : ''
      } ${p >= 50 ? 'text-white' : 'text-white/60'}`}
    >
      {f.num(p)}%
    </span>
  );

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5 pt-1">
      <div aria-hidden className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        {side(0, p0)}
        <span className="text-[11px] font-semibold text-white/70">{t('winChance.title')}</span>
        {side(1, p1)}
      </div>
      <div aria-hidden className="relative flex h-2.5 overflow-hidden rounded-full bg-white/10">
        <span className="win-bar h-full" style={{ width: `${p0}%`, backgroundColor: colors[0] }} />
        <span className="win-bar h-full flex-1" style={{ backgroundColor: colors[1] }} />
        {/* The even-money mark, so a lead is visible at a glance */}
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-night-950/70" />
      </div>
    </div>
  );
}

/* ------------------------------ Timeline chart ----------------------------- */

const W = 360;
const H = 190;
const PAD = { l: 12, r: 12, t: 18, b: 22 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

/**
 * How the win chance swung over the match: above the middle line the team
 * that batted first is ahead, below it the chasing team.
 */
export function WinChanceChart({ match }: { match: Match }) {
  const { t } = useTranslation();
  const f = useFormat();
  const clip = useId();
  const pts = useMemo(() => winChanceTimeline(match), [match]);
  if (pts.length < 2) return null;

  const first = firstBattingTeam(match);
  const second = (1 - first) as TeamIndex;
  const colors = teamColors(match);
  const inningsBalls = match.settings.overs * BALLS_PER_OVER;
  const total = Math.max(inningsBalls * 2, pts[pts.length - 1].ball);
  const x = (b: number) => PAD.l + (b / total) * PW;
  const y = (p: number) => PAD.t + (1 - p) * PH;
  const mid = y(0.5);
  const line = pts.map((p) => `${x(p.ball)},${y(p.first)}`).join(' ');
  const area = `${x(pts[0].ball)},${mid} ${line} ${x(pts[pts.length - 1].ball)},${mid}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('winChance.chart')} className="w-full">
      <defs>
        <clipPath id={`${clip}-top`}>
          <rect x={0} y={0} width={W} height={mid} />
        </clipPath>
        <clipPath id={`${clip}-bottom`}>
          <rect x={0} y={mid} width={W} height={H - mid} />
        </clipPath>
      </defs>

      {/* Second innings starts here */}
      <line
        x1={x(inningsBalls)}
        x2={x(inningsBalls)}
        y1={PAD.t}
        y2={PAD.t + PH}
        className="stroke-slate-300 dark:stroke-slate-700"
        strokeDasharray="3 4"
      />
      <text
        x={x(inningsBalls / 2)}
        y={H - 6}
        textAnchor="middle"
        className="fill-slate-500 text-[10px] dark:fill-slate-400"
      >
        {t('scoring.inningsN', { n: f.num(1) })}
      </text>
      <text
        x={x(inningsBalls * 1.5)}
        y={H - 6}
        textAnchor="middle"
        className="fill-slate-500 text-[10px] dark:fill-slate-400"
      >
        {t('scoring.inningsN', { n: f.num(2) })}
      </text>

      <polygon points={area} fill={colors[first]} opacity={0.28} clipPath={`url(#${clip}-top)`} />
      <polygon
        points={area}
        fill={colors[second]}
        opacity={0.28}
        clipPath={`url(#${clip}-bottom)`}
      />
      <line
        x1={PAD.l}
        x2={W - PAD.r}
        y1={mid}
        y2={mid}
        className="stroke-slate-400 dark:stroke-slate-600"
        strokeWidth={1}
      />
      <polyline
        points={line}
        fill="none"
        className="chart-line stroke-slate-800 dark:stroke-slate-100"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
      />

      <text x={PAD.l} y={PAD.t - 6} className="text-[11px] font-semibold" fill={colors[first]}>
        {match.teams[first].name}
      </text>
      <text
        x={W - PAD.r}
        y={PAD.t + PH - 4}
        textAnchor="end"
        className="text-[11px] font-semibold"
        fill={colors[second]}
      >
        {match.teams[second].name}
      </text>
    </svg>
  );
}

function firstBattingTeam(match: Match): TeamIndex {
  const { winner, decision } = match.toss;
  return decision === 'bat' ? winner : ((1 - winner) as TeamIndex);
}
