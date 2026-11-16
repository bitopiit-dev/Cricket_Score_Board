import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { SectionTitle } from '../components/common/controls';
import { SubPageTitle } from '../components/layout/AppShell';
import { useGoBack } from '../components/common/Header';
import { todayInDhaka, type Fixture } from '../data/fixtures';
import { deriveMatchState } from '../engine/scoring';
import { useTournament } from '../hooks/useTournament';
import { usePrefs } from '../store/prefsStore';
import { fixtureTeams, type TournamentState } from '../tournament/standings';
import {
  teamLiveFixture,
  teamRecord,
  teamResults,
  teamStanding,
  type FormLetter,
} from '../tournament/teamView';
import { formatDate, formatTime, slotLabel, stageLabel } from '../utils/fixtureText';
import { resultText } from '../utils/matchText';
import { PlayerAvatar, TeamAvatar } from '../components/common/TeamAvatar';
import { SQUAD_LIMITS } from '../config/tournament';
import {
  duplicateNames,
  findTeam,
  playerDisplayName,
  squadWarnings,
  type PlayerRole,
  type TournamentPlayer,
  type TournamentTeam,
} from '../data/teams';
import { captainMark } from '../utils/matchText';
import { useFormat } from '../hooks/useFormat';
import { playerPath } from '../tournament/playerLink';
import { groupOf } from '../tournament/groups';

export default function TeamPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { id } = useParams();
  const team = findTeam(id);
  const tour = useTournament(10000);

  // Coming from the bottom of the home page: start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!team) {
    return (
      <main className="mx-auto w-full max-w-lg p-4">
        <SubPageTitle title={t('tabs.teams')} parent="/teams" />
        <p className="p-10 text-center text-slate-500">{t('team.notFound')}</p>
      </main>
    );
  }

  const xi = team.players.filter((p) => !p.substitute);
  const subs = team.players.filter((p) => p.substitute);

  return (
    <div>
      <TeamHero team={team} tour={tour} />

      <main className="mx-auto flex w-full max-w-lg flex-col gap-5 p-4">
        {tour && <TeamMatches team={team} ts={tour.ts} />}
        {squadWarnings(team, SQUAD_LIMITS).length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <p className="font-semibold">⚠️ {t('team.adminWarning')}</p>
            <ul className="mt-1 list-disc pl-5">
              {squadWarnings(team, SQUAD_LIMITS).map((w) => (
                <li key={w}>
                  {t(`team.warn_${w}`, {
                    n: f.num(team.players.length),
                    max: f.num(SQUAD_LIMITS.maxPlayers),
                    subs: f.num(SQUAD_LIMITS.maxSubstitutes),
                    names: duplicateNames(team).join(', '),
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
        {team.players.length === 0 ? (
          <p className="rounded-2xl bg-white py-10 text-center text-slate-500 dark:bg-slate-900">
            {t('team.noPlayers')}
          </p>
        ) : (
          <>
            <PlayerGrid title={t('team.players')} players={xi} team={team} />
            {subs.length > 0 && (
              <PlayerGrid title={t('team.substitutes')} players={subs} team={team} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

const ROLE_BADGE: Record<PlayerRole, string> = {
  batter: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  bowler: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  allRounder: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  wicketKeeper: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs leading-tight font-semibold ${className}`}>
      {children}
    </span>
  );
}

function PlayerGrid({
  title,
  players,
  team,
}: {
  title: string;
  players: TournamentPlayer[];
  team: TournamentTeam;
}) {
  const { t } = useTranslation();
  if (players.length === 0) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {players.map((p) => {
          return (
            <li key={p.id}>
              <Link
                to={playerPath(team.id, p.id)}
                className="flex h-full flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800"
              >
                <PlayerAvatar name={p.name} color={team.color} photo={p.photo} size="lg" />
                <span lang="en" className="text-sm leading-tight font-semibold break-words">
                  {playerDisplayName(p)}
                  {captainMark(p)}
                </span>
                {p.shortName && (
                  <span className="-mt-1 text-[13px] text-slate-600 dark:text-slate-400">
                    {t('team.nickname', { name: p.shortName })}
                  </span>
                )}
                {(p.captain || p.viceCaptain || p.role) && (
                  <span className="flex flex-wrap justify-center gap-1">
                    {p.captain && (
                      <Badge className="bg-amber-400 text-amber-950">{t('role.captain')}</Badge>
                    )}
                    {p.viceCaptain && (
                      <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                        {t('role.viceCaptain')}
                      </Badge>
                    )}
                    {p.role && <Badge className={ROLE_BADGE[p.role]}>{t(`role.${p.role}`)}</Badge>}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------ Team identity ------------------------------ */

/** The team's own banner: its colour, logo, name, where it stands and its numbers. */
function TeamHero({
  team,
  tour,
}: {
  team: TournamentTeam;
  tour: ReturnType<typeof useTournament>;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const goBack = useGoBack('/teams');
  const standing = tour ? teamStanding(team.id, tour.ts) : null;
  const row = standing?.row;
  const nrr = row
    ? `${row.nrr > 0 ? '+' : row.nrr < 0 ? '−' : ''}${f.dec(Math.abs(row.nrr), 2)}`
    : '–';
  const stats: [string, string][] = [
    [t('points.playedLong'), f.num(row?.played ?? 0)],
    [t('points.wonLong'), f.num(row?.won ?? 0)],
    [t('points.lostLong'), f.num(row?.lost ?? 0)],
    [t('points.points'), f.num(row?.points ?? 0)],
    ['NRR', nrr],
  ];

  return (
    <section className="relative overflow-hidden bg-night-950 text-white">
      <div
        aria-hidden
        className="countdown-glow absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(75% 65% at 50% 25%, ${team.color}, transparent 72%)`,
        }}
      />
      <div className="relative mx-auto flex max-w-lg flex-col items-center gap-2 px-4 pt-3 pb-4 text-center">
        <button
          type="button"
          onClick={goBack}
          aria-label={t('common.back')}
          className="flex size-10 items-center justify-center self-start rounded-full text-3xl text-white/85 hover:bg-white/10"
        >
          ‹
        </button>
        <span className="-mt-6 rounded-full bg-white p-1 shadow-xl ring-4 ring-white/15">
          <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="xl" />
        </span>
        <h1
          lang="en"
          className="mt-1 font-display text-4xl leading-none font-extrabold tracking-wide"
        >
          {team.name}
        </h1>
        <p className="flex flex-wrap justify-center gap-x-3 text-[13px] text-white/80">
          <span>
            {standing && standing.row.played > 0
              ? `${stageLabel(standing.stage, t)} · ${t('team.position', { pos: t(`slot.ord${standing.position}`) })}`
              : t('points.group', { g: groupOf(team.id) ?? team.group })}
          </span>
          {team.players.length > 0 && (
            <span>
              {t('team.playerCount', { n: f.num(team.players.length), count: team.players.length })}
            </span>
          )}
        </p>
        <dl className="mt-2 grid w-full grid-cols-5 gap-1.5">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col-reverse items-center rounded-xl bg-white/10 px-1 py-2 backdrop-blur-sm"
            >
              <dt className="mt-0.5 text-[11px] leading-tight text-white/70">{label}</dt>
              <dd className="tabular font-display text-2xl leading-none font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const FORM_STYLE: Record<FormLetter, string> = {
  W: 'bg-emerald-600 text-white',
  L: 'bg-bpl-red text-white',
  T: 'bg-slate-400 text-white',
};

/** Live or next match, then the form guide and every result. */
function TeamMatches({ team, ts }: { team: TournamentTeam; ts: TournamentState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const live = teamLiveFixture(team.id, ts);
  const next = live ? undefined : teamRecord(team.id, ts, todayInDhaka()).next;
  const results = teamResults(team.id, ts);
  const opponent = (fx: Fixture) => {
    const [a, b] = fixtureTeams(fx, ts);
    const id = a === team.id ? b : a;
    const slot = a === team.id ? fx.teamB : fx.teamA;
    const tm = findTeam(id ?? undefined);
    return { tm, name: tm?.name ?? slotLabel(slot, id, t, f) };
  };
  const when = (fx: Fixture) =>
    `${formatDate(fx.date, lang, bengaliDigits, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(fx.time, lang, f)}`;

  return (
    <>
      {live &&
        (() => {
          const o = ts.outcomes.get(live.id);
          const opp = opponent(live);
          return (
            <Link
              to={o?.match ? `/match/${o.match.id}` : '/live'}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-bpl-red/70 active:bg-slate-50 dark:bg-slate-900"
            >
              <span className="flex items-center gap-1.5 rounded-full bg-bpl-red px-2 py-0.5 text-xs font-bold text-white">
                <span
                  aria-hidden
                  className="live-pulse size-1.5 rounded-full bg-white text-white"
                />
                {t('homePage.live')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {t('common.vs')} <span lang="en">{opp.name}</span>
                </span>
                {o?.innings && o.innings.length > 0 && (
                  <span className="tabular block text-[13px] text-slate-600 dark:text-slate-400">
                    {o.innings
                      .map(
                        (i) =>
                          `${findTeam(i.teamId)?.short ?? ''} ${f.num(i.runs)}/${f.num(i.wickets)} (${f.overs(i.legalBalls)})`,
                      )
                      .join(' · ')}
                  </span>
                )}
              </span>
              <span className="text-sm font-semibold text-bpl-red">{t('live.details')} ›</span>
            </Link>
          );
        })()}

      {next &&
        (() => {
          const opp = opponent(next);
          return (
            <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                {t('homePage.nextMatch')} · {t('fixtures.matchNo', { n: f.num(next.no) })},{' '}
                {stageLabel(next.stage, t)}
              </p>
              <div className="mt-2 flex items-center gap-3">
                {opp.tm ? (
                  <TeamAvatar
                    name={opp.tm.name}
                    color={opp.tm.color}
                    logo={opp.tm.logo}
                    size="md"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="size-12 shrink-0 rounded-full border border-dashed border-slate-400"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-semibold">
                    {t('common.vs')} <span lang="en">{opp.name}</span>
                  </p>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">{when(next)}</p>
                </div>
              </div>
            </section>
          );
        })()}

      {results.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
            <h2 className="font-display text-xl font-bold tracking-wide">{t('team.results')}</h2>
            <span className="flex items-center gap-1" aria-label={t('team.form')}>
              {results.slice(0, 5).map((r) => (
                <span
                  key={r.fixture.id}
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${FORM_STYLE[r.outcome]}`}
                >
                  {t(`team.form_${r.outcome}`)}
                </span>
              ))}
            </span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((r) => {
              const opp = opponent(r.fixture);
              const o = r.outcomeDetail;
              const st = o.match ? deriveMatchState(o.match) : null;
              const body = (
                <>
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${FORM_STYLE[r.outcome]}`}
                  >
                    {t(`team.form_${r.outcome}`)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {t('common.vs')} <span lang="en">{opp.name}</span>
                    </span>
                    <span className="block text-[13px] text-slate-600 dark:text-slate-400">
                      {o.innings?.map((i) => `${f.num(i.runs)}/${f.num(i.wickets)}`).join(' – ')}
                      {st?.result && o.match ? ` · ${resultText(st.result, o.match, t, f)}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {when(r.fixture).split(' · ')[0]}
                  </span>
                </>
              );
              return (
                <li key={r.fixture.id}>
                  {o.match ? (
                    <Link
                      to={`/match/${o.match.id}`}
                      className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
