import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { PageTitle } from '../components/layout/AppShell';
import { TOURNAMENT_TEAMS, teamsInGroup, type GroupId } from '../data/teams';
import { useFormat } from '../hooks/useFormat';

/** Teams tab: the 12 tournament teams; tap one for its squad. */
export default function TeamsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4 md:max-w-3xl">
      <PageTitle>
        {t('tabs.teams')} <span className="text-slate-400">({f.num(TOURNAMENT_TEAMS.length)})</span>
      </PageTitle>
      {(['A', 'B'] as GroupId[]).map((g) => (
        <section key={g} aria-label={t('points.group', { g })}>
          <h2 className="mb-2 font-display text-xl font-bold tracking-wide text-slate-500">
            {t('points.group', { g })}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {teamsInGroup(g).map((team) => (
              <li key={team.id}>
                <Link
                  to={`/team/${team.id}`}
                  className="flex h-full flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800"
                  style={{ borderTop: `4px solid ${team.color}` }}
                >
                  <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="lg" />
                  <span lang="en" className="text-sm leading-tight font-semibold break-words">
                    {team.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
