import { useMemo, useState } from 'react';
import { useEdgeFade } from '../hooks/useEdgeFade';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PlayerAvatar, TeamAvatar } from '../components/common/TeamAvatar';
import { PageTitle } from '../components/layout/AppShell';
import { findTeam } from '../data/teams';
import { deriveMatchState } from '../engine/scoring';
import { useFormat } from '../hooks/useFormat';
import { useTournament } from '../hooks/useTournament';
import { isTournamentMatch, playerTotals, type PlayerTotals } from '../tournament/awards';
import {
  economyOf,
  fieldingOf,
  leaderboard,
  MIN_BALLS_FOR_ECON,
  MIN_BALLS_FOR_SR,
  strikeRateOf,
  type BoardId,
} from '../tournament/leaders';
import { playerPath, squadPlayer } from '../tournament/playerLink';
import { PageSkeleton } from '../components/common/Skeleton';

const BOARDS: BoardId[] = ['runs', 'wickets', 'sixes', 'strikeRate', 'economy', 'fielding'];

/** Tournament leaders, one board at a time, from every completed fixture match. */
export default function StatsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const tour = useTournament(15000);
  const [board, setBoard] = useState<BoardId>('runs');
  const chipRow = useEdgeFade<HTMLDivElement>();
  const totals = useMemo(() => (tour ? playerTotals(tour.matches) : null), [tour]);
  const played = useMemo(
    () =>
      tour?.matches.filter((m) => isTournamentMatch(m) && deriveMatchState(m).phase === 'completed')
        .length ?? 0,
    [tour],
  );
  if (!tour || !totals) return <PageSkeleton variant="hero" />;
  const rows = leaderboard(totals, board, 10);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
      <div>
        <PageTitle>{t('tabs.stats')}</PageTitle>
        <p className="text-[13px] text-slate-600 dark:text-slate-400">
          {played > 0
            ? t('stats.fromMatches', { n: f.num(played), count: played })
            : t('stats.empty')}
        </p>
      </div>

      <div
        role="tablist"
        ref={chipRow}
        className="edge-fade -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {BOARDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={board === id}
            onClick={() => setBoard(id)}
            className={`flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap ${
              board === id
                ? 'bg-bpl-yellow text-night-950'
                : 'bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {t(`stats.board.${id}`)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-400">
          {played > 0 ? t('stats.noneYet') : t('stats.empty')}
        </p>
      ) : (
        <>
          <Leader row={rows[0]} board={board} />
          {rows.length > 1 && (
            <ol className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
              {rows.slice(1).map((r, i) => (
                <Row key={r.key} row={r} rank={i + 2} board={board} />
              ))}
            </ol>
          )}
        </>
      )}

      {(board === 'strikeRate' || board === 'economy') && (
        <p className="text-[13px] text-slate-600 dark:text-slate-400">
          {board === 'strikeRate'
            ? t('stats.minBalls', { n: f.num(MIN_BALLS_FOR_SR) })
            : t('stats.minOvers', { n: f.num(MIN_BALLS_FOR_ECON / 6) })}
        </p>
      )}
    </main>
  );
}

/** The number a board ranks by, and a short line of context under it. */
function useBoardValue() {
  const { t } = useTranslation();
  const f = useFormat();
  return (r: PlayerTotals, board: BoardId): { value: string; detail: string } => {
    switch (board) {
      case 'runs':
        return {
          value: f.num(r.runs),
          detail: t('stats.detail.runs', { balls: f.num(r.balls), sr: f.dec(strikeRateOf(r), 1) }),
        };
      case 'wickets':
        return {
          value: f.num(r.wickets),
          detail: t('stats.detail.wickets', {
            econ: f.dec(economyOf(r), 2),
            overs: f.overs(r.legalBalls),
          }),
        };
      case 'sixes':
        return {
          value: f.num(r.sixes),
          detail: t('stats.detail.sixes', { fours: f.num(r.fours) }),
        };
      case 'strikeRate':
        return {
          value: f.dec(strikeRateOf(r), 1),
          detail: t('stats.detail.sr', { runs: f.num(r.runs), balls: f.num(r.balls) }),
        };
      case 'economy':
        return {
          value: f.dec(economyOf(r), 2),
          detail: t('stats.detail.econ', {
            overs: f.overs(r.legalBalls),
            runs: f.num(r.runsConceded),
          }),
        };
      case 'fielding':
        return {
          value: f.num(fieldingOf(r)),
          detail: t('stats.detail.fielding', {
            c: f.num(r.catches),
            st: f.num(r.stumpings),
            ro: f.num(r.runOuts),
          }),
        };
    }
  };
}

function Leader({ row, board }: { row: PlayerTotals; board: BoardId }) {
  const { t } = useTranslation();
  const valueOf = useBoardValue();
  const team = findTeam(row.teamId);
  const player = squadPlayer(row.teamId, row.name);
  const { value, detail } = valueOf(row, board);
  const body = (
    <>
      <div
        aria-hidden
        className="countdown-glow absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(70% 80% at 15% 40%, ${team?.color ?? 'var(--color-night-line)'}, transparent 70%)`,
        }}
      />
      <div className="relative flex items-center gap-4 p-4">
        <span className="relative shrink-0">
          <PlayerAvatar name={row.name} color={team?.color} photo={player?.photo} size="xl" />
          <span className="absolute -top-1 -left-1 flex size-8 items-center justify-center rounded-full bg-bpl-yellow font-display text-lg font-extrabold text-night-950 shadow">
            1
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-bpl-yellow">{t(`stats.board.${board}`)}</p>
          <p lang="en" className="truncate text-lg leading-tight font-bold">
            {row.name}
          </p>
          <p lang="en" className="flex items-center gap-1.5 text-[13px] text-white/75">
            {team && <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="sm" />}
            <span className="truncate">{row.teamName}</span>
          </p>
          <p className="mt-1 text-xs text-white/70">{detail}</p>
        </div>
        <span className="tabular shrink-0 font-display text-5xl leading-none font-extrabold text-bpl-yellow">
          {value}
        </span>
      </div>
    </>
  );
  const cls =
    'relative block overflow-hidden rounded-3xl bg-night-950 text-white shadow-lg ring-1 ring-night-line';
  return player ? (
    <Link to={playerPath(row.teamId, player.id)} className={`${cls} active:opacity-90`}>
      {body}
    </Link>
  ) : (
    <section className={cls}>{body}</section>
  );
}

function Row({ row, rank, board }: { row: PlayerTotals; rank: number; board: BoardId }) {
  const f = useFormat();
  const valueOf = useBoardValue();
  const team = findTeam(row.teamId);
  const player = squadPlayer(row.teamId, row.name);
  const { value, detail } = valueOf(row, board);
  const body = (
    <>
      <span className="tabular w-5 shrink-0 text-center font-bold text-slate-500 dark:text-slate-400">
        {f.num(rank)}
      </span>
      <PlayerAvatar name={row.name} color={team?.color} photo={player?.photo} size="md" />
      <span className="min-w-0 flex-1">
        <span lang="en" className="block truncate font-semibold">
          {row.name}
        </span>
        <span className="block truncate text-[13px] text-slate-600 dark:text-slate-400">
          <span lang="en">{team?.short ?? row.teamName}</span> · {detail}
        </span>
      </span>
      <span className="tabular shrink-0 font-display text-2xl font-bold">{value}</span>
    </>
  );
  return (
    <li className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      {player ? (
        <Link
          to={playerPath(row.teamId, player.id)}
          className="flex items-center gap-3 px-4 py-2.5 active:bg-slate-50 dark:active:bg-slate-800"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
      )}
    </li>
  );
}
