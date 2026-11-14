import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { btn } from '../components/common/controls';
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
    <div className="min-h-dvh">
      <Header title={t('app.title')} />
      <main className="mx-auto flex max-w-lg flex-col gap-3 p-4">
        <Link to="/new" className={`${btn.primary} text-center text-lg`}>
          + {t('home.newMatch')}
        </Link>
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
                <span>{t('home.oversFormat', { overs: f.num(m.settings.overs) })}</span>
                <span>{status}</span>
              </div>
              <div className="mt-1 font-semibold">
                {m.teams[0].name} {t('common.vs')} {m.teams[1].name}
              </div>
              {s.innings.map((inn) => (
                <div key={inn.index} className="tabular text-sm text-slate-600 dark:text-slate-400">
                  {m.teams[inn.battingTeam].name}: {f.num(inn.runs)}/{f.num(inn.wickets)} (
                  {f.overs(inn.legalBalls)})
                </div>
              ))}
            </Link>
          );
        })}
      </main>
    </div>
  );
}
