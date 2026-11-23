import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TeamAvatar } from '../common/TeamAvatar';
import { MatchHero } from '../match/MatchCenter';
import { teamColors, WinChanceMeter } from '../match/WinChance';
import { BallChip } from '../scoring/ThisOver';
import { fixtureById } from '../../data/fixtures';
import { findTeam } from '../../data/teams';
import { BALLS_PER_OVER, runRate } from '../../engine/rules';
import { ballsRemaining, economy, requiredRunRate, runsNeeded } from '../../engine/stats';
import type { InningsState, Match, MatchState, Phase, TeamIndex } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { projectedTotal } from '../../tournament/home';
import { stageLabel } from '../../utils/fixtureText';
import { playerName } from '../../utils/matchText';

/** Phases inside an innings, once it has openers: the scoreboard shows. */
const BETWEEN_BALLS: readonly Phase[] = ['inPlay', 'needBatter', 'needBowler'];

/**
 * The match being played, as a big dark scoreboard: the batting side's score,
 * the chase, both batters, the bowler, the win chance and this over. Between
 * innings (or before a super over) it shows the plain match hero instead.
 * The whole card opens the Match Center.
 */
export function LiveScoreboard({ m, s }: { m: Match; s: MatchState }) {
  const { t } = useTranslation();
  const inn = s.current;
  const [ca, cb] = teamColors(m);
  const style = { '--a': ca, '--b': cb } as CSSProperties;
  const over = inn?.overs[inn.overs.length - 1];

  return (
    // Always a dark card: `dark` gives what's inside (ball chips, win chance) their dark colours
    <Link
      to={`/match/${m.id}`}
      data-board="live"
      style={style}
      className="dark relative block overflow-hidden rounded-3xl bg-night-950 text-white shadow-[0_20px_50px_-30px_var(--color-bpl-red)] ring-1 ring-bpl-red/50 active:opacity-90"
    >
      {inn && !inn.ended && BETWEEN_BALLS.includes(s.phase) ? (
        <InPlay m={m} s={s} inn={inn} />
      ) : (
        <MatchHero match={m} state={s} />
      )}
      <div className="relative flex items-center gap-2 border-t border-white/10 bg-night-950/60 px-4 py-2.5">
        {over && over.balls.length > 0 && (
          <span className="hidden shrink-0 text-xs text-night-muted sm:inline">
            {t('scoring.thisOver')}
          </span>
        )}
        <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
          {over?.balls.map((b) => (
            <BallChip key={b.eventId} ball={b} />
          ))}
        </div>
        <span className="shrink-0 text-sm font-semibold text-bpl-yellow">
          {t('live.details')} ›
        </span>
      </div>
    </Link>
  );
}

function InPlay({ m, s, inn }: { m: Match; s: MatchState; inn: InningsState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const fx = fixtureById(m.fixtureId);
  const batting = m.teams[inn.battingTeam];
  const team = findTeam(batting.teamId);
  // The other main innings already played, if any
  const other = s.innings.find(
    (x) => !x.superOver && x.index !== inn.index && x.battingTeam !== inn.battingTeam,
  );
  const need = runsNeeded(inn);
  const chasing = need !== null && need > 0;
  const rrr = chasing ? requiredRunRate(inn) : null;
  const projected = chasing ? null : projectedTotal(inn);
  const overNo = Math.min(Math.floor(inn.legalBalls / BALLS_PER_OVER) + 1, inn.oversLimit);
  const batters = [inn.strikerId, inn.nonStrikerId].flatMap((id) => {
    const b = id ? inn.batters.find((x) => x.playerId === id) : undefined;
    return b ? [b] : [];
  });
  const bowler = inn.bowlerId ? inn.bowlers.find((x) => x.playerId === inn.bowlerId) : undefined;

  const tile = (label: string, value: string) => (
    <div className="flex-1 rounded-xl border border-white/10 bg-night-950/60 px-3 py-2">
      <span className="block text-[11px] text-night-muted">{label}</span>
      <span className="tabular font-display text-2xl leading-none font-bold">{value}</span>
    </div>
  );

  return (
    <div className="relative">
      {/* Each team's colour glows behind its side */}
      <div
        aria-hidden
        className="countdown-glow absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(45% 80% at 0% 30%, var(--a), transparent 70%), radial-gradient(45% 80% at 100% 30%, var(--b), transparent 70%)',
        }}
      />
      <div className="relative flex flex-wrap items-center gap-2 px-4 pt-3.5 text-xs text-white/85 sm:px-5">
        <span className="flex items-center gap-1.5 rounded-full bg-bpl-red px-2.5 py-0.5 font-bold text-white">
          <span aria-hidden className="live-pulse size-1.5 rounded-full bg-white text-white" />
          {t('homePage.live')}
        </span>
        {fx && (
          <span>
            {t('fixtures.matchNo', { n: f.num(fx.no) })}, {stageLabel(fx.stage, t)}
          </span>
        )}
        <span className="ml-auto font-semibold">
          {inn.superOver
            ? t('scoring.superOver')
            : t('live.overOf', {
                innings: t('scoring.inningsN', { n: f.num(inn.index + 1) }),
                n: f.num(overNo),
                total: f.num(inn.oversLimit),
              })}
        </span>
      </div>

      <div className="relative grid gap-4 px-4 pt-3 pb-4 sm:px-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-4">
            <span
              className="shrink-0 rounded-full p-[3px]"
              style={{ backgroundColor: team?.color ?? 'var(--a)' }}
            >
              <span className="block rounded-full bg-white p-0.5">
                <TeamAvatar name={batting.name} color={team?.color} logo={team?.logo} size="hero" />
              </span>
            </span>
            <div className="min-w-0">
              <p lang="en" className="font-display text-lg leading-tight font-bold text-white/85">
                {t('live.batting', { team: batting.name })}
              </p>
              <p className="tabular font-display text-6xl leading-none font-extrabold">
                {f.num(inn.runs)}/{f.num(inn.wickets)}
                <span className="ml-2 font-sans text-base font-semibold text-night-muted">
                  ({f.overs(inn.legalBalls)})
                </span>
              </p>
            </div>
          </div>

          {other && <OtherInnings m={m} inn={other} team={other.battingTeam} />}

          {chasing && (
            <p className="font-display text-xl leading-tight font-bold text-bpl-yellow">
              {t('scoring.need', { runs: f.num(need), balls: f.num(ballsRemaining(inn)) })}
            </p>
          )}

          <div className="flex gap-2">
            {tile(t('live.runRate'), f.dec(runRate(inn.runs, inn.legalBalls), 2))}
            {rrr !== null && tile(t('live.required'), f.dec(rrr, 2))}
            {projected !== null && tile(t('live.projected'), f.num(projected))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          {batters.length > 0 && (
            <Box
              title={t('player.batting')}
              cols={[t('col.runs'), t('col.balls'), t('col.fours'), t('col.sixes')]}
              rows={batters.map((b) => ({
                key: b.playerId,
                name: playerName(m, b.playerId),
                star: b.playerId === inn.strikerId,
                cells: [f.num(b.runs), f.num(b.balls), f.num(b.fours), f.num(b.sixes)],
              }))}
            />
          )}
          {bowler && (
            <Box
              title={t('player.bowling')}
              cols={[t('col.overs'), t('col.conceded'), t('col.wickets'), t('col.econ')]}
              rows={[
                {
                  key: bowler.playerId,
                  name: playerName(m, bowler.playerId),
                  cells: [
                    f.overs(bowler.legalBalls),
                    f.num(bowler.runsConceded),
                    f.num(bowler.wickets),
                    f.dec(economy(bowler), 2),
                  ],
                },
              ]}
            />
          )}
          <div className="rounded-xl border border-white/10 bg-night-950/70 px-3 py-2">
            <WinChanceMeter match={m} state={s} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OtherInnings({ m, inn, team }: { m: Match; inn: InningsState; team: TeamIndex }) {
  const f = useFormat();
  const side = m.teams[team];
  const tm = findTeam(side.teamId);
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-night-950/60 px-3 py-2 text-sm">
      <TeamAvatar name={side.name} color={tm?.color} logo={tm?.logo} size="sm" />
      <span lang="en" className="min-w-0 flex-1 truncate">
        {side.name}
      </span>
      <span className="tabular font-display text-xl font-bold">
        {f.num(inn.runs)}/{f.num(inn.wickets)}
        <span className="ml-1 font-sans text-xs font-normal text-night-muted">
          ({f.overs(inn.legalBalls)})
        </span>
      </span>
    </div>
  );
}

/** A small dark table: batters or the bowler. The first number is the one that matters most. */
function Box({
  title,
  cols,
  rows,
}: {
  title: string;
  cols: string[];
  rows: { key: string; name: string; star?: boolean; cells: string[] }[];
}) {
  const { t } = useTranslation();
  return (
    <table className="w-full table-fixed overflow-hidden rounded-xl border border-white/10 bg-night-950/70 text-sm">
      <thead>
        <tr className="text-[11px] text-night-muted">
          <th className="px-3 pt-2 pb-1 text-left font-semibold">{title}</th>
          {cols.map((c) => (
            <th key={c} className="w-11 pt-2 pb-1 text-right font-semibold last:pr-3">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="truncate px-3 py-1 font-semibold" lang="en">
              {r.name}
              {r.star && (
                <>
                  <span aria-hidden className="ml-1 text-bpl-yellow">
                    *
                  </span>
                  <span className="sr-only"> ({t('scoring.striker')})</span>
                </>
              )}
            </td>
            {r.cells.map((c, i) => (
              <td
                key={i}
                className={`tabular py-1 text-right last:pr-3 ${
                  i === 0 ? 'font-display text-base font-bold text-white' : 'text-white/80'
                }`}
              >
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
