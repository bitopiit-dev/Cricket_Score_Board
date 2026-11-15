import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, SectionTitle } from '../components/common/controls';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { SubPageTitle } from '../components/layout/AppShell';
import { PageSkeleton } from '../components/common/Skeleton';
import { findTeam } from '../data/teams';
import { matchRepository } from '../db/repository';
import { useFormat } from '../hooks/useFormat';
import {
  MOS_POINTS,
  bestWicketTakers,
  manOfTheSeries,
  playerTotals,
  type PlayerTotals,
} from '../tournament/awards';

export default function AwardsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const [totals, setTotals] = useState<PlayerTotals[] | null>(null);

  useEffect(() => {
    void matchRepository.list().then((ms) => setTotals(playerTotals(ms)));
  }, []);

  const wickets = totals ? bestWicketTakers(totals) : [];
  const mos = totals ? manOfTheSeries(totals) : [];

  return (
    <div>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
        <SubPageTitle title={t('awards.title')} parent="/more" />
        {!totals && <PageSkeleton inline />}
        {totals && totals.length === 0 && (
          <p className="rounded-2xl bg-white py-10 text-center text-slate-500 dark:bg-slate-900">
            {t('awards.empty')}
          </p>
        )}
        {totals && totals.length > 0 && (
          <>
            <Card>
              <SectionTitle>🏅 {t('awards.manOfSeries')}</SectionTitle>
              <Ranking
                rows={mos}
                main={(r) => t('awards.points', { n: f.num(r.points) })}
                detail={(r) =>
                  t('awards.mosDetail', {
                    runs: f.num(r.runs),
                    wickets: f.num(r.wickets),
                    fielding: f.num(r.catches + r.stumpings + r.runOuts),
                  })
                }
              />
              <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">
                {t('awards.formula', {
                  run: f.num(MOS_POINTS.run),
                  wicket: f.num(MOS_POINTS.wicket),
                  fielding: f.num(MOS_POINTS.fielding),
                  maiden: f.num(MOS_POINTS.maiden),
                })}
              </p>
            </Card>
            <Card>
              <SectionTitle>🎯 {t('awards.bestWicketTaker')}</SectionTitle>
              <Ranking
                rows={wickets}
                main={(r) => t('awards.wickets', { n: f.num(r.wickets), count: r.wickets })}
                detail={(r) =>
                  t('awards.bowlingDetail', {
                    overs: f.overs(r.legalBalls),
                    runs: f.num(r.runsConceded),
                    econ: f.dec(r.legalBalls ? (r.runsConceded * 6) / r.legalBalls : 0),
                  })
                }
              />
            </Card>
            <p className="text-center text-[13px] text-slate-600 dark:text-slate-400">
              {t('awards.note')}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Ranking({
  rows,
  main,
  detail,
}: {
  rows: PlayerTotals[];
  main: (r: PlayerTotals) => string;
  detail: (r: PlayerTotals) => string;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  if (rows.length === 0) return <p className="text-sm text-slate-500">{t('awards.none')}</p>;
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r, i) => {
        const team = findTeam(r.teamId);
        return (
          <li
            key={r.key}
            className={`flex items-center gap-3 rounded-xl p-2 ${
              i === 0 ? 'bg-amber-50 dark:bg-amber-950/30' : ''
            }`}
          >
            <span className="tabular w-5 text-center font-bold text-slate-400">{f.num(i + 1)}</span>
            <TeamAvatar name={r.teamName} color={team?.color} logo={team?.logo} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{r.name}</div>
              <div className="truncate text-[13px] text-slate-600 dark:text-slate-400">
                {r.teamName} · {detail(r)}
              </div>
            </div>
            <span className="tabular shrink-0 font-bold text-emerald-700 dark:text-emerald-400">
              {main(r)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
