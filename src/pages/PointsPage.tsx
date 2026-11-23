import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { PageTitle } from '../components/layout/AppShell';
import { todayInDhaka, type Fixture, type Slot } from '../data/fixtures';
import { findTeam } from '../data/teams';
import { useFormat } from '../hooks/useFormat';
import { useTournament } from '../hooks/useTournament';
import { LEAGUE_POINTS, QUALIFIERS } from '../tournament/format';
import {
  placeIn,
  pointsRows,
  projectedSuperSix,
  stageProgress,
  todaysLeagueFixtures,
} from '../tournament/pointsView';
import {
  fixtureTeams,
  type LeagueStage,
  type TableRow,
  type TournamentState,
} from '../tournament/standings';
import type { FormLetter } from '../tournament/teamView';
import { formatDate, formatTime, slotLabel, stageLabel } from '../utils/fixtureText';
import { PageSkeleton } from '../components/common/Skeleton';
import { usePrefs } from '../store/prefsStore';

/** Points tab: Group A, Group B and Super Six tables from the matches scored in the app. */
export default function PointsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const tour = useTournament();
  if (!tour) return <PageSkeleton variant="table" />;
  const { ts } = tour;
  const today = todayInDhaka();
  const projected = projectedSuperSix(ts);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-3xl lg:max-w-5xl">
      <PageTitle>{t('tabs.points')}</PageTitle>
      <TodayMatches ts={ts} today={today} />
      <LeagueTable stage="groupA" ts={ts} today={today} qualify={QUALIFIERS.group} />
      <LeagueTable stage="groupB" ts={ts} today={today} qualify={QUALIFIERS.group} />
      {ts.tables.superSix.length > 0 ? (
        <LeagueTable stage="superSix" ts={ts} today={today} qualify={QUALIFIERS.superSix} />
      ) : (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <h2 className="font-display text-2xl font-bold tracking-wide">
            {stageLabel('superSix', t)}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {projected
              ? t('points.ifEndedToday', { n: f.num(QUALIFIERS.superSix) })
              : t('points.superSixPending')}
          </p>
          {projected && (
            <ul className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-6">
              {projected.map((p) => {
                const team = findTeam(p.teamId);
                return (
                  <li key={p.teamId}>
                    <Link
                      to={`/team/${p.teamId}`}
                      className="flex h-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-2 text-center active:bg-slate-50 dark:border-slate-700 dark:active:bg-slate-800"
                    >
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {t('slot.groupPos', { g: p.group, pos: t(`slot.ord${p.position}`) })}
                      </span>
                      <TeamAvatar
                        name={team?.name ?? p.teamId}
                        color={team?.color}
                        logo={team?.logo}
                        size="md"
                      />
                      <span lang="en" className="text-xs leading-tight font-semibold break-words">
                        {team?.name ?? p.teamId}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      <p className="text-[13px] text-slate-600 dark:text-slate-400">
        {t('points.legend', {
          win: f.num(LEAGUE_POINTS.win),
          tie: f.num(LEAGUE_POINTS.tie),
          loss: f.num(LEAGUE_POINTS.loss),
        })}
      </p>
    </main>
  );
}

/** The day's league matches, with each side's place, so fans see which games move the table. */
function TodayMatches({ ts, today }: { ts: TournamentState; today: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const fixtures = todaysLeagueFixtures(today);
  if (fixtures.length === 0) return null;
  return (
    <section aria-labelledby="points-today">
      <h2 id="points-today" className="mb-2 font-display text-xl font-bold tracking-wide">
        {t('points.today')}
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {fixtures.map((fx) => {
          const o = ts.outcomes.get(fx.id);
          const [a, b] = fixtureTeams(fx, ts);
          const stage = fx.stage as LeagueStage;
          const pa = a ? placeIn(stage, a, ts) : undefined;
          const pb = b ? placeIn(stage, b, ts) : undefined;
          const body = (
            <>
              <span className="flex items-center gap-2 text-sm">
                {o?.status === 'live' ? (
                  <LiveChip />
                ) : o?.status === 'completed' ? (
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    {t('points.finished')}
                  </span>
                ) : (
                  <span className="font-display text-base font-bold text-amber-700 dark:text-amber-400">
                    {formatTime(fx.time, lang, f)}
                  </span>
                )}
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {pa && pb
                    ? t('points.places', {
                        stage: stageLabel(fx.stage, t),
                        a: t(`slot.ord${pa}`),
                        b: t(`slot.ord${pb}`),
                      })
                    : stageLabel(fx.stage, t)}
                </span>
              </span>
              <span className="mt-2 flex items-center gap-2">
                <Side slot={fx.teamA} teamId={a} />
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {t('common.vs')}
                </span>
                <Side slot={fx.teamB} teamId={b} end />
              </span>
            </>
          );
          const cls = 'block h-full rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900';
          return (
            <li key={fx.id}>
              {o?.match ? (
                <Link
                  to={`/match/${o.match.id}`}
                  className={`${cls} active:bg-slate-50 dark:active:bg-slate-800`}
                >
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Side({ slot, teamId, end }: { slot: Slot; teamId: string | null; end?: boolean }) {
  const { t } = useTranslation();
  const f = useFormat();
  const team = teamId ? findTeam(teamId) : undefined;
  return (
    <span
      className={`flex min-w-0 flex-1 items-center gap-2 ${end ? 'flex-row-reverse text-right' : ''}`}
    >
      {team && <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="sm" />}
      <span lang="en" className="min-w-0 text-sm leading-tight font-semibold break-words">
        {slotLabel(slot, teamId, t, f)}
      </span>
    </span>
  );
}

function LiveChip() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bpl-red px-2 py-0.5 text-[11px] font-bold text-white uppercase">
      <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-white" />
      {t('fixtures.live')}
    </span>
  );
}

const FORM_STYLE: Record<FormLetter, string> = {
  W: 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950',
  L: 'bg-rose-600 text-white',
  T: 'bg-slate-500 text-white dark:bg-slate-600',
};

/** One box per match of the stage: results first, then empty boxes for matches to play. */
function FormBoxes({ form, slots, small }: { form: FormLetter[]; slots: number; small?: boolean }) {
  const { t } = useTranslation();
  const size = small ? 'size-3.5 text-[9px]' : 'size-5 text-xs';
  return (
    <span className={`inline-flex ${small ? 'gap-0.5' : 'gap-1'}`}>
      <span className="sr-only">
        {t('points.formSr', { form: form.map((x) => t(`team.form_${x}`)).join(' ') || '–' })}
      </span>
      {form.map((x, i) => (
        <span
          key={i}
          aria-hidden
          className={`${size} grid place-items-center rounded-[5px] font-display leading-none font-bold ${FORM_STYLE[x]}`}
        >
          {t(`team.form_${x}`)}
        </span>
      ))}
      {Array.from({ length: Math.max(0, slots - form.length) }, (_, i) => (
        <span
          key={`e${i}`}
          aria-hidden
          className={`${size} rounded-[5px] border border-dashed border-slate-300 dark:border-slate-600`}
        />
      ))}
    </span>
  );
}

/**
 * A league table with form, the most points still possible and each team's
 * next match. On phones it keeps the classic columns and shows the form under
 * the team name; wider screens add the Max column, a points bar and the next match.
 */
function LeagueTable({
  stage,
  ts,
  today,
  qualify,
}: {
  stage: LeagueStage;
  ts: TournamentState;
  today: string;
  qualify: number;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const favoriteTeam = usePrefs((s) => s.favoriteTeam);
  const views = pointsRows(stage, ts, today);
  const progress = stageProgress(stage, ts);
  // Before the first match the order is only the fixture order, not a ranking
  const started = views.some((v) => v.row.played > 0);
  // Bars share one scale: the highest "most points still possible" in the table
  const scale = Math.max(1, ...views.map((v) => v.maxPoints));
  const nrr = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${f.dec(Math.abs(n), 3)}`;
  const th = 'px-0.5 py-2 text-center font-semibold';
  const td = 'tabular px-1 py-2 text-center';
  const wide = 'hidden md:table-cell';
  const widest = 'hidden lg:table-cell';

  const nextLabel = (fx: Fixture) =>
    fx.date === today
      ? formatTime(fx.time, lang, f)
      : formatDate(fx.date, lang, bengaliDigits, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });

  return (
    <section
      data-stage={stage}
      className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-4 pt-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wide">{stageLabel(stage, t)}</h2>
          <p className="text-[13px] text-slate-600 dark:text-slate-400">
            {t(stage === 'superSix' ? 'points.qualifySemis' : 'points.qualifySuperSix', {
              n: f.num(qualify),
            })}
          </p>
        </div>
        {progress.total > 0 && (
          <div className="text-[12px] text-slate-600 sm:text-right dark:text-slate-400">
            {t('points.progress', { played: f.num(progress.played), total: f.num(progress.total) })}
            <span aria-hidden className="mt-1 flex gap-[3px]">
              {Array.from({ length: progress.total }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-2.5 rounded-sm sm:w-3.5 ${
                    i < progress.played ? 'bg-bpl-yellow' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </span>
          </div>
        )}
      </div>
      {!started && (
        <p className="mx-4 mt-2 rounded-lg bg-slate-100 px-3 py-2 text-[13px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t('points.notStarted')}
        </p>
      )}
      <table className="mt-2 w-full table-fixed text-sm">
        <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
          <tr>
            <th className={`${th} w-6 md:w-9`}>#</th>
            <th className={`${th} text-left`}>{t('points.team')}</th>
            <th className={`${th} ${wide} w-36 text-left`}>{t('points.form')}</th>
            <th className={`${th} w-6 md:w-10`} title={t('points.playedLong')}>
              {t('points.played')}
            </th>
            <th className={`${th} w-6 md:w-10`} title={t('points.wonLong')}>
              {t('points.won')}
            </th>
            <th className={`${th} w-6 md:w-10`} title={t('points.lostLong')}>
              {t('points.lost')}
            </th>
            <th className={`${th} w-7 md:w-12`} title={t('points.tiedLong')}>
              {t('points.tied')}
            </th>
            <th className={`${th} w-11 md:w-16`}>{t('points.nrr')}</th>
            <th className={`${th} w-9 md:w-12 lg:w-32 lg:pl-2 lg:text-left`}>
              {t('points.points')}
            </th>
            <th className={`${th} ${wide} w-14`} title={t('points.maxLong')}>
              {t('points.max')}
            </th>
            <th className={`${th} ${widest} w-40 text-left`}>{t('points.next')}</th>
          </tr>
        </thead>
        <tbody>
          {views.map((v, i) => {
            const { row: r } = v;
            const team = findTeam(r.teamId);
            const q = started && i < qualify;
            const fav = r.teamId === favoriteTeam;
            const fx = v.live ?? v.next;
            const opponent = fx ? fixtureTeams(fx, ts).find((id) => id !== r.teamId) : undefined;
            const opp = opponent ? findTeam(opponent) : undefined;
            const cutBelow = started && i === qualify - 1 && i < views.length - 1;
            return (
              <tr
                key={r.teamId}
                className={`border-b border-slate-100 dark:border-slate-800 ${
                  q
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                    : fav
                      ? 'bg-amber-50/70 dark:bg-amber-400/5'
                      : ''
                } ${cutBelow ? 'border-b-2 border-dashed border-b-emerald-500/60' : ''}`}
              >
                <td
                  className={`${td} font-display text-base font-bold ${
                    q
                      ? 'text-emerald-700 shadow-[inset_3px_0_0_var(--color-emerald-500)] dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {started ? f.num(i + 1) : '–'}
                </td>
                <td className="relative min-w-0 py-2 pr-1 pl-0.5">
                  {cutBelow && (
                    <span className="absolute -bottom-2.5 left-0 z-10 rounded-sm bg-white px-1.5 text-[11px] leading-4 font-semibold whitespace-nowrap text-emerald-700 dark:bg-slate-900 dark:text-emerald-400">
                      {t(stage === 'superSix' ? 'points.cutSemis' : 'points.cutSuperSix')}
                    </span>
                  )}
                  <Link
                    to={`/team/${r.teamId}`}
                    className="flex items-center gap-2 active:opacity-70"
                  >
                    {/* Below 360px the name needs the room more than the logo */}
                    <span
                      className="hidden shrink-0 rounded-full p-[2px] min-[360px]:block"
                      style={{ backgroundColor: team?.color ?? '#64748b' }}
                    >
                      <span className="block rounded-full bg-white p-px dark:bg-slate-900">
                        <TeamAvatar
                          name={team?.name ?? r.teamId}
                          color={team?.color}
                          logo={team?.logo}
                          size="sm"
                        />
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="leading-tight font-semibold break-words">
                        <span lang="en">{team?.name ?? r.teamId}</span>
                        {fav && (
                          <>
                            <span aria-hidden className="ml-1 text-bpl-yellow">
                              ★
                            </span>
                            <span className="sr-only">{t('favorite.star')}</span>
                          </>
                        )}
                        {q && <span className="sr-only">{t('points.qualifiedMark')}</span>}
                      </span>
                      {/* Phones: form under the name, as the Form column is hidden */}
                      {started && v.slots > 0 && (
                        <span className="md:hidden">
                          <FormBoxes form={v.form} slots={v.slots} small />
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className={`${td} ${wide} text-left`}>
                  {v.slots > 0 && <FormBoxes form={v.form} slots={v.slots} />}
                </td>
                <td className={td}>{f.num(r.played)}</td>
                <td className={td}>{f.num(r.won)}</td>
                <td className={td}>{f.num(r.lost)}</td>
                <td className={td}>{f.num(r.tiedNr)}</td>
                <td
                  className={`${td} text-xs ${
                    r.nrr > 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : r.nrr < 0
                        ? 'text-red-600 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {nrr(r.nrr)}
                </td>
                <td className={`${td} lg:pl-2 lg:text-left`}>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-emerald-700 lg:w-5 dark:text-emerald-400">
                      {f.num(r.points)}
                    </span>
                    {/* Points now, and a tick at the most still possible */}
                    <span
                      aria-hidden
                      className="relative hidden h-1.5 w-20 rounded-full bg-slate-200 lg:block dark:bg-slate-700"
                    >
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                        style={{ width: `${(r.points / scale) * 100}%` }}
                      />
                      <span
                        className="absolute -top-[3px] h-3 w-0.5 -translate-x-1/2 rounded-full bg-slate-500 dark:bg-slate-400"
                        style={{ left: `${(v.maxPoints / scale) * 100}%` }}
                      />
                    </span>
                  </span>
                </td>
                <td className={`${td} ${wide} text-slate-600 dark:text-slate-400`}>
                  {f.num(v.maxPoints)}
                </td>
                <td className={`${td} ${widest} text-left text-xs`}>
                  {fx && (
                    <span className="flex items-center gap-2">
                      {opp && (
                        <TeamAvatar name={opp.name} color={opp.color} logo={opp.logo} size="sm" />
                      )}
                      <span className="min-w-0">
                        {opp && (
                          <span className="sr-only" lang="en">
                            {t('favorite.vs', { team: opp.name })}{' '}
                          </span>
                        )}
                        {v.live ? (
                          <LiveChip />
                        ) : (
                          <span
                            className={
                              fx.date === today
                                ? 'font-semibold text-amber-700 dark:text-amber-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }
                          >
                            {fx.date === today && `${t('fixtures.today')} `}
                            {nextLabel(fx)}
                          </span>
                        )}
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
        {t('points.key')}{' '}
        {t('points.formKey', {
          w: t('team.form_W'),
          l: t('team.form_L'),
          t: t('team.form_T'),
        })}{' '}
        <span className="hidden md:inline">{t('points.maxKey')}</span>
      </p>
    </section>
  );
}

/** The compact table used by TV mode. */
export function Table({
  stage,
  rows,
  qualify,
}: {
  stage: LeagueStage;
  rows: TableRow[];
  qualify: number;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const nrr = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${f.dec(Math.abs(n), 3)}`;
  // Before the first match the order is only the fixture order, not a ranking
  const started = rows.some((r) => r.played > 0);
  const favoriteTeam = usePrefs((s) => s.favoriteTeam);
  const th = 'px-0.5 py-2 text-center font-semibold';
  const td = 'tabular px-1 py-2 text-center';

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
      <h2 className="px-4 pt-3 font-display text-2xl font-bold tracking-wide">
        {stageLabel(stage, t)}
      </h2>
      <p className="px-4 text-[13px] text-slate-600 dark:text-slate-400">
        {t(stage === 'superSix' ? 'points.qualifySemis' : 'points.qualifySuperSix', {
          n: f.num(qualify),
        })}
      </p>
      {!started && (
        <p className="mx-4 mt-2 rounded-lg bg-slate-100 px-3 py-2 text-[13px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t('points.notStarted')}
        </p>
      )}
      {/* Fixed column widths so every table on the page lines up */}
      <table className="mt-2 w-full table-fixed text-sm">
        <colgroup>
          <col className="w-5" />
          <col />
          <col className="w-6 md:w-14" />
          <col className="w-6 md:w-14" />
          <col className="w-6 md:w-14" />
          <col className="w-6 md:w-14" />
          <col className="w-9 md:w-16" />
          <col className="w-11 md:w-20" />
        </colgroup>
        <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <tr>
            <th className={th}>#</th>
            <th className={`${th} text-left`}>{t('points.team')}</th>
            <th className={th} title={t('points.playedLong')}>
              {t('points.played')}
            </th>
            <th className={th} title={t('points.wonLong')}>
              {t('points.won')}
            </th>
            <th className={th} title={t('points.lostLong')}>
              {t('points.lost')}
            </th>
            <th className={th} title={t('points.tiedLong')}>
              {t('points.tied')}
            </th>
            <th className={th}>{t('points.points')}</th>
            <th className={th}>{t('points.nrr')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const team = findTeam(r.teamId);
            const q = started && i < qualify;
            return (
              <tr
                key={r.teamId}
                className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                  q ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''
                }`}
              >
                <td
                  className={`${td} font-bold ${
                    q
                      ? 'text-emerald-700 shadow-[inset_3px_0_0_var(--color-emerald-500)] dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {started ? f.num(i + 1) : '–'}
                </td>
                <td className="min-w-0 py-2 pr-1 pl-0.5">
                  <span className="flex items-center gap-2">
                    <TeamAvatar
                      name={team?.name ?? r.teamId}
                      color={team?.color}
                      logo={team?.logo}
                      size="sm"
                    />
                    <span lang="en" className="min-w-0 leading-tight font-semibold break-words">
                      {team?.name ?? r.teamId}
                    </span>
                    {r.teamId === favoriteTeam && (
                      <>
                        <span aria-hidden className="shrink-0 text-bpl-yellow">
                          ★
                        </span>
                        <span className="sr-only">{t('favorite.star')}</span>
                      </>
                    )}
                    {q && <span className="sr-only">{t('points.qualifiedMark')}</span>}
                  </span>
                </td>
                <td className={td}>{f.num(r.played)}</td>
                <td className={td}>{f.num(r.won)}</td>
                <td className={td}>{f.num(r.lost)}</td>
                <td className={td}>{f.num(r.tiedNr)}</td>
                <td
                  className={`${td} font-display text-lg font-bold text-emerald-700 dark:text-emerald-400`}
                >
                  {f.num(r.points)}
                </td>
                <td
                  className={`${td} text-xs ${
                    r.nrr > 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : r.nrr < 0
                        ? 'text-red-600'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {nrr(r.nrr)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {t('points.key')}
      </p>
    </section>
  );
}
