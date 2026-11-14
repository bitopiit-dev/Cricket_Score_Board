import { useTranslation } from 'react-i18next';
import { runRate } from '../../engine/rules';
import { ballsRemaining, requiredRunRate, runsNeeded } from '../../engine/stats';
import type { InningsState, Match } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';

export function ScorePanel({ match, inn }: { match: Match; inn: InningsState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const need = runsNeeded(inn);
  const rrr = requiredRunRate(inn, match);

  return (
    <section className="bg-emerald-800 px-4 pt-2 pb-4 text-white dark:bg-emerald-950">
      <div className="flex items-center justify-between text-sm text-emerald-100">
        <span className="truncate font-semibold">{match.teams[inn.battingTeam].name}</span>
        <span>{t('scoring.inningsN', { n: f.num(inn.index + 1) })}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="tabular text-5xl leading-tight font-bold">
          {f.num(inn.runs)}/{f.num(inn.wickets)}
        </span>
        <span className="tabular pb-2 text-lg text-emerald-100">
          {t('scoring.oversOf', {
            overs: f.overs(inn.legalBalls),
            total: f.num(match.settings.overs),
          })}
        </span>
        {inn.freeHitNext && (
          <span className="mb-2 ml-auto animate-pulse rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">
            {t('scoring.freeHit')}
          </span>
        )}
      </div>
      <div className="tabular flex flex-wrap gap-x-4 text-sm text-emerald-100">
        <span>
          {t('scoring.crr')} {f.dec(runRate(inn.runs, inn.legalBalls))}
        </span>
        {inn.target !== null && (
          <>
            <span>
              {t('scoring.target')} {f.num(inn.target)}
            </span>
            {rrr !== null && !inn.ended && (
              <span>
                {t('scoring.rrr')} {f.dec(rrr)}
              </span>
            )}
          </>
        )}
      </div>
      {need !== null && need > 0 && !inn.ended && (
        <div className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-center font-semibold">
          {t('scoring.need', { runs: f.num(need), balls: f.num(ballsRemaining(inn, match)) })}
        </div>
      )}
    </section>
  );
}
