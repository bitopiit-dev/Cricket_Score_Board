import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BottomNav } from '../components/common/BottomNav';
import { LanguageToggle } from '../components/common/Header';
import { APP_SUBTITLE, APP_TITLE } from '../config/app';
import { SectionTitle, btn } from '../components/common/controls';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { TOURNAMENT_TEAMS } from '../data/teams';
import { matchRepository } from '../db/repository';
import { deriveMatchState } from '../engine/scoring';
import type { Match } from '../engine/types';
import { useFormat } from '../hooks/useFormat';

/** Basic match list. Polished in a later step. */
export default function HomePage() {
  const { t } = useTranslation();
  const f = useFormat();
  const [matches, setMatches] = useState<Match[] | null>(null);

  useEffect(() => {
    void matchRepository.list().then(setMatches);
  }, []);

  return (
    <div className="min-h-dvh pb-24">
      <header className="relative bg-emerald-800 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 text-center text-white dark:bg-emerald-950">
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3">
          <LanguageToggle />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">{APP_TITLE}</h1>
        <p className="mt-1 text-emerald-100">{APP_SUBTITLE}</p>
      </header>
      <main className="mx-auto flex max-w-lg flex-col gap-3 p-4">
        <Link to="/new" className={`${btn.primary} text-center text-lg`}>
          + {t('home.newMatch')}
        </Link>
        {matches && matches.length > 0 && (
          <h2 className="mt-2 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {t('home.matches')}
          </h2>
        )}
        {matches?.length === 0 && (
          <p className="py-10 text-center text-slate-500">{t('home.noMatches')}</p>
        )}
        {matches?.map((m) => {
          const s = deriveMatchState(m);
          const status =
            s.phase === 'completed'
              ? t('home.completed')
              : m.events.length === 0
                ? t('home.notStarted')
                : t('home.inProgress');
          return (
            <Link
              key={m.id}
              to={`/match/${m.id}`}
              className="rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {t('home.oversFormat', {
                    overs: f.num(m.settings.overs),
                    count: m.settings.overs,
                  })}
                </span>
                <span>{status}</span>
              </div>
              <div className="mt-1 font-semibold">
                {m.teams[0].name} {t('common.vs')} {m.teams[1].name}
              </div>
              {s.innings.map((inn) => (
                <div key={inn.index} className="tabular text-sm text-slate-600 dark:text-slate-400">
                  {inn.superOver && `${t('scoring.superOver')} · `}
                  {m.teams[inn.battingTeam].name}: {f.num(inn.runs)}/{f.num(inn.wickets)} (
                  {f.overs(inn.legalBalls)})
                </div>
              ))}
            </Link>
          );
        })}

        <section className="mt-4" aria-labelledby="teams-heading">
          <SectionTitle>
            <span id="teams-heading">
              {t('home.teams')} ({f.num(TOURNAMENT_TEAMS.length)})
            </span>
          </SectionTitle>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TOURNAMENT_TEAMS.map((team) => (
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
      </main>
      <BottomNav />
    </div>
  );
}
