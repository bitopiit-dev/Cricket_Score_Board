import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useGoBack } from '../components/common/Header';
import { PlayerAvatar, TeamAvatar } from '../components/common/TeamAvatar';
import { SubPageTitle } from '../components/layout/AppShell';
import { findTeam, playerDisplayName } from '../data/teams';
import { useFormat } from '../hooks/useFormat';
import { useTournament } from '../hooks/useTournament';
import { playerKey, playerTotals } from '../tournament/awards';
import { economyOf, playerMatchLines, strikeRateOf } from '../tournament/leaders';
import { captainMark } from '../utils/matchText';

const FORM = {
  W: 'bg-emerald-600 text-white',
  L: 'bg-bpl-red text-white',
  T: 'bg-slate-400 text-white',
} as const;

/** A player's tournament: photo, team, batting / bowling / fielding totals and every match. */
export default function PlayerPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { teamId = '', playerId = '' } = useParams();
  const team = findTeam(teamId);
  const player = team?.players.find((p) => p.id === playerId);
  const tour = useTournament(15000);
  const goBack = useGoBack(team ? `/team/${team.id}` : '/teams');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [teamId, playerId]);

  const totals = useMemo(() => {
    if (!tour || !team || !player) return null;
    const key = playerKey(team.id, player.name);
    return playerTotals(tour.matches).find((r) => r.key === key) ?? null;
  }, [tour, team, player]);
  const lines = useMemo(
    () => (tour && team && player ? playerMatchLines(tour.matches, team.id, player.name) : []),
    [tour, team, player],
  );

  if (!team || !player) {
    return (
      <main className="mx-auto w-full max-w-lg p-4">
        <SubPageTitle title={t('tabs.teams')} parent="/teams" />
        <p className="p-10 text-center text-slate-500">{t('player.notFound')}</p>
      </main>
    );
  }

  const r = totals;
  const outs = r ? r.innings - r.notOuts : 0;
  const batting: [string, string][] = [
    [t('player.matches'), f.num(r?.matches ?? 0)],
    [t('col.runs'), f.num(r?.runs ?? 0)],
    [
      t('player.highest'),
      r && r.innings > 0 ? `${f.num(r.highScore)}${r.highScoreNotOut ? '*' : ''}` : '–',
    ],
    [t('player.average'), r && outs > 0 ? f.dec(r.runs / outs, 1) : '–'],
    [t('col.sr'), r && r.balls > 0 ? f.dec(strikeRateOf(r), 1) : '–'],
    [t('player.foursSixes'), `${f.num(r?.fours ?? 0)}/${f.num(r?.sixes ?? 0)}`],
  ];
  const bowling: [string, string][] = [
    [t('col.wickets'), f.num(r?.wickets ?? 0)],
    [t('col.overs'), f.overs(r?.legalBalls ?? 0)],
    [t('col.econ'), r && r.legalBalls > 0 ? f.dec(economyOf(r), 2) : '–'],
    [
      t('player.best'),
      r?.bestBowling ? `${f.num(r.bestBowling.wickets)}/${f.num(r.bestBowling.runs)}` : '–',
    ],
  ];
  const fielding: [string, string][] = [
    [t('player.catches'), f.num(r?.catches ?? 0)],
    [t('player.stumpings'), f.num(r?.stumpings ?? 0)],
    [t('player.runOuts'), f.num(r?.runOuts ?? 0)],
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-night-950 text-white">
        <div
          aria-hidden
          className="countdown-glow absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(70% 70% at 50% 30%, ${team.color}, transparent 72%)`,
          }}
        />
        <div className="relative mx-auto flex max-w-lg flex-col items-center gap-2 px-4 pt-3 pb-5 text-center">
          <button
            type="button"
            onClick={goBack}
            aria-label={t('common.back')}
            className="flex size-10 items-center justify-center self-start rounded-full text-3xl text-white/85 hover:bg-white/10"
          >
            ‹
          </button>
          <span className="-mt-6 rounded-full bg-white p-1 shadow-xl ring-4 ring-white/15">
            <PlayerAvatar name={player.name} color={team.color} photo={player.photo} size="xl" />
          </span>
          <h1
            lang="en"
            className="mt-1 font-display text-3xl leading-none font-extrabold tracking-wide"
          >
            {playerDisplayName(player)}
            {captainMark(player)}
          </h1>
          <Link
            to={`/team/${team.id}`}
            className="flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-sm font-semibold backdrop-blur-sm"
          >
            <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="sm" />
            <span lang="en">{team.name}</span>
          </Link>
          {(player.role || player.captain || player.viceCaptain) && (
            <p className="flex flex-wrap justify-center gap-1.5 text-xs font-semibold">
              {player.captain && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-amber-950">
                  {t('role.captain')}
                </span>
              )}
              {player.viceCaptain && (
                <span className="rounded-full bg-white/15 px-2 py-0.5">
                  {t('role.viceCaptain')}
                </span>
              )}
              {player.role && (
                <span className="rounded-full bg-white/15 px-2 py-0.5">
                  {t(`role.${player.role}`)}
                </span>
              )}
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
        {!r || r.matches === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-400">
            {t('player.noMatches')}
          </p>
        ) : (
          <>
            <StatGrid title={t('player.batting')} items={batting} cols={3} />
            <StatGrid title={t('player.bowling')} items={bowling} cols={4} />
            {r.catches + r.stumpings + r.runOuts > 0 && (
              <StatGrid title={t('player.fielding')} items={fielding} cols={3} />
            )}

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
              <h2 className="px-4 pt-3 pb-1 font-display text-lg font-bold tracking-wide">
                {t('player.matchByMatch')}
              </h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map((l) => {
                  const opp = findTeam(l.opponentTeamId);
                  const parts = [
                    l.batting &&
                      `🏏 ${f.num(l.batting.runs)}${l.batting.out ? '' : '*'} (${f.num(l.batting.balls)})`,
                    l.bowling &&
                      `● ${f.num(l.bowling.wickets)}/${f.num(l.bowling.runs)} (${f.overs(l.bowling.legalBalls)})`,
                    l.fielding > 0 && t('player.fieldingShort', { n: f.num(l.fielding) }),
                  ].filter(Boolean);
                  return (
                    <li key={l.matchId}>
                      <Link
                        to={`/match/${l.matchId}`}
                        className="flex items-center gap-3 px-4 py-2.5 active:bg-slate-50 dark:active:bg-slate-800"
                      >
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${FORM[l.outcome]}`}
                        >
                          {t(`team.form_${l.outcome}`)}
                        </span>
                        {opp && (
                          <TeamAvatar name={opp.name} color={opp.color} logo={opp.logo} size="sm" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {t('common.vs')} <span lang="en">{l.opponentName}</span>
                          </span>
                          <span className="tabular block text-[13px] text-slate-600 dark:text-slate-400">
                            {parts.length > 0 ? parts.join('  ') : t('player.didNotFeature')}
                          </span>
                        </span>
                        <span aria-hidden className="text-slate-400">
                          ›
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatGrid({
  title,
  items,
  cols,
}: {
  title: string;
  items: [string, string][];
  cols: 3 | 4;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-2 font-display text-lg font-bold tracking-wide">{title}</h2>
      <dl className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {items.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col-reverse items-center rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800/70"
          >
            <dt className="mt-1 text-center text-xs leading-tight text-slate-600 dark:text-slate-400">
              {label}
            </dt>
            <dd className="tabular font-display text-2xl leading-none font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
