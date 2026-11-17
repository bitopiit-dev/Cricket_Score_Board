import { useTranslation } from 'react-i18next';
import { findTeam } from '../../data/teams';
import { overBars, wormPoints } from '../../engine/charts';
import type { InningsState, Match, MatchState } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { WinChanceChart } from './WinChance';

const FALLBACK = ['#e10a14', '#2563eb'];

/** Manhattan (runs per over) and worm (running total) for the two main innings. */
export function MatchCharts({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const main = state.innings.filter((i) => !i.superOver && i.legalBalls + i.overs.length > 0);
  if (main.length === 0) {
    return (
      <section className="bg-white p-6 text-center text-slate-600 shadow-sm sm:rounded-2xl dark:bg-slate-900 dark:text-slate-400">
        {t('scoring.notStartedYet')}
      </section>
    );
  }
  const colors = main.map(
    (inn, i) => findTeam(match.teams[inn.battingTeam].teamId)?.color ?? FALLBACK[i],
  );
  // Two teams in near-identical colours would be unreadable: the second falls back
  if (colors.length === 2 && colors[0].toLowerCase() === colors[1].toLowerCase()) {
    colors[1] = FALLBACK[1];
  }
  const overs = Math.max(...main.map((i) => i.oversLimit));

  return (
    <>
      <ChartCard title={t('charts.manhattan')} hint={t('charts.manhattanHint')}>
        <Legend match={match} main={main} colors={colors} />
        <Manhattan main={main} colors={colors} overs={overs} />
      </ChartCard>
      <ChartCard title={t('charts.worm')} hint={t('charts.wormHint')}>
        <Legend match={match} main={main} colors={colors} />
        <Worm match={match} main={main} colors={colors} overs={overs} />
      </ChartCard>
      {match.events.some((e) => e.type === 'ball') && (
        <ChartCard title={t('winChance.chart')} hint={t('winChance.chartHint')}>
          <WinChanceChart match={match} />
        </ChartCard>
      )}
    </>
  );
}

/* ------------------------------ Shared layout ----------------------------- */

const W = 360;
const H = 210;
const PAD = { l: 30, r: 12, t: 12, b: 26 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

/** A round top for the y axis: 10, 15, 20, 25, 30, 40, 50… */
function niceMax(v: number): { max: number; step: number } {
  const step = v <= 10 ? 2 : v <= 25 ? 5 : v <= 60 ? 10 : v <= 150 ? 25 : 50;
  return { max: Math.max(step * 2, Math.ceil(v / step) * step), step };
}

function Grid({
  max,
  step,
  overs,
  xLabelEvery,
  edge = false,
}: {
  max: number;
  step: number;
  overs: number;
  xLabelEvery: number;
  /** Label the end of each over (worm) instead of its middle (bars). */
  edge?: boolean;
}) {
  const f = useFormat();
  const ys: number[] = [];
  for (let v = 0; v <= max; v += step) ys.push(v);
  const y = (v: number) => PAD.t + PH - (v / max) * PH;
  return (
    <g className="text-[10px]">
      {ys.map((v) => (
        <g key={v}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(v)}
            y2={y(v)}
            className={
              v === 0
                ? 'stroke-slate-400 dark:stroke-slate-600'
                : 'stroke-slate-200 dark:stroke-slate-800'
            }
            strokeWidth={1}
          />
          <text
            x={PAD.l - 6}
            y={y(v) + 3.5}
            textAnchor="end"
            className="fill-slate-500 dark:fill-slate-400"
          >
            {f.num(v)}
          </text>
        </g>
      ))}
      {Array.from({ length: overs }, (_, i) => i + 1)
        .filter((o) => o % xLabelEvery === 0 || o === 1)
        .map((o) => (
          <text
            key={o}
            x={PAD.l + ((edge ? o : o - 0.5) / overs) * PW}
            y={H - 8}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400"
          >
            {f.num(o)}
          </text>
        ))}
    </g>
  );
}

/* -------------------------------- Manhattan ------------------------------- */

function Manhattan({
  main,
  colors,
  overs,
}: {
  main: InningsState[];
  colors: string[];
  overs: number;
}) {
  const { t } = useTranslation();
  const bars = main.map((inn) => overBars(inn));
  const { max, step } = niceMax(Math.max(6, ...bars.flat().map((b) => b.runs)));
  const slot = PW / overs;
  const n = main.length;
  const bw = Math.min(14, (slot - 4) / n);
  const y = (v: number) => PAD.t + PH - (v / max) * PH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('charts.manhattan')} className="w-full">
      <Grid max={max} step={step} overs={overs} xLabelEvery={overs > 12 ? 2 : 1} />
      {bars.map((list, i) =>
        list.map((b) => {
          const x = PAD.l + (b.over - 1) * slot + slot / 2 - (bw * n) / 2 + i * bw;
          const top = y(b.runs);
          return (
            <g key={`${i}-${b.over}`}>
              <rect
                x={x + 0.5}
                y={top}
                width={bw - 1}
                height={Math.max(0, PAD.t + PH - top)}
                rx={2}
                fill={colors[i]}
                className="chart-bar"
                style={{ animationDelay: `${b.over * 30}ms` }}
              >
                <title>{`${t('matchCenter.overN', { n: b.over })}: ${b.runs}`}</title>
              </rect>
              {Array.from({ length: b.wickets }, (_, k) => (
                <circle
                  key={k}
                  cx={x + bw / 2}
                  cy={top - 6 - k * 9}
                  r={3.5}
                  className="fill-bpl-red stroke-white dark:stroke-slate-900"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          );
        }),
      )}
    </svg>
  );
}

/* ---------------------------------- Worm ---------------------------------- */

function Worm({
  match,
  main,
  colors,
  overs,
}: {
  match: Match;
  main: InningsState[];
  colors: string[];
  overs: number;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const series = main.map((inn) => wormPoints(inn, match.settings));
  const target = main[1]?.target ?? null;
  const { max, step } = niceMax(Math.max(10, target ?? 0, ...series.flat().map((p) => p.runs)));
  const x = (o: number) => PAD.l + (o / overs) * PW;
  const y = (v: number) => PAD.t + PH - (v / max) * PH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('charts.worm')} className="w-full">
      <Grid max={max} step={step} overs={overs} xLabelEvery={overs > 12 ? 2 : 1} edge />
      {target !== null && (
        <g>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(target)}
            y2={y(target)}
            stroke={colors[1]}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            opacity={0.7}
          />
          <text
            x={W - PAD.r}
            y={y(target) - 4}
            textAnchor="end"
            className="text-[10px] font-semibold"
            fill={colors[1]}
          >
            {t('scoring.target')} {f.num(target)}
          </text>
        </g>
      )}
      {series.map((pts, i) => (
        <g key={i}>
          <polyline
            points={pts.map((p) => `${x(p.x)},${y(p.runs)}`).join(' ')}
            fill="none"
            stroke={colors[i]}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            className="chart-line"
          />
          {pts
            .filter((p) => p.wicket)
            .map((p, k) => (
              <circle
                key={k}
                cx={x(p.x)}
                cy={y(p.runs)}
                r={4}
                fill="white"
                stroke={colors[i]}
                strokeWidth={2}
              />
            ))}
        </g>
      ))}
    </svg>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function Legend({ match, main, colors }: { match: Match; main: InningsState[]; colors: string[] }) {
  const f = useFormat();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-1 text-[13px]">
      {main.map((inn, i) => (
        <li key={inn.index} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: colors[i] }}
          />
          <span lang="en" className="font-semibold">
            {match.teams[inn.battingTeam].name}
          </span>
          <span className="tabular text-slate-600 dark:text-slate-400">
            {f.num(inn.runs)}/{f.num(inn.wickets)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden bg-white pb-2 shadow-sm sm:rounded-2xl dark:bg-slate-900">
      <h2 className="px-4 pt-3 font-display text-lg font-bold tracking-wide">{title}</h2>
      <p className="px-4 pb-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <div className="px-1">{children}</div>
    </section>
  );
}
