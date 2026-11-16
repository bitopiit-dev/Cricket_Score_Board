import { useTranslation } from 'react-i18next';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { PageTitle } from '../components/layout/AppShell';
import { findTeam } from '../data/teams';
import { useFormat } from '../hooks/useFormat';
import { useTournament } from '../hooks/useTournament';
import { LEAGUE_POINTS, QUALIFIERS } from '../tournament/format';
import type { LeagueStage, TableRow } from '../tournament/standings';
import { stageLabel } from '../utils/fixtureText';
import { PageSkeleton } from '../components/common/Skeleton';

/** Points tab: Group A, Group B and Super Six tables from the matches scored in the app. */
export default function PointsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const tour = useTournament();
  if (!tour) return <PageSkeleton variant="table" />;
  const { tables } = tour.ts;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-3xl">
      <PageTitle>{t('tabs.points')}</PageTitle>
      <Table stage="groupA" rows={tables.groupA} qualify={QUALIFIERS.group} />
      <Table stage="groupB" rows={tables.groupB} qualify={QUALIFIERS.group} />
      {tables.superSix.length > 0 ? (
        <Table stage="superSix" rows={tables.superSix} qualify={QUALIFIERS.superSix} />
      ) : (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <h2 className="font-display text-2xl font-bold tracking-wide">
            {stageLabel('superSix', t)}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('points.superSixPending')}
          </p>
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

function Table({
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
                      : 'text-slate-400'
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
                        : 'text-slate-400'
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
