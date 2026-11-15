import { useTranslation } from 'react-i18next';
import { runRate } from '../../engine/rules';
import { ballsRemaining, requiredRunRate, runsNeeded } from '../../engine/stats';
import type { InningsState, Match, MatchState } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { inningsLabel } from '../../utils/matchText';

export function ScorePanel({
  match,
  inn,
  state,
}: {
  match: Match;
  inn: InningsState;
  state: MatchState;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const need = runsNeeded(inn);
  const rrr = requiredRunRate(inn);

  return (
    <section className="bg-night-950 px-4 pt-2 pb-4 text-white">
      <div className="flex items-center justify-between text-sm text-white/80">
        <span className="truncate font-semibold">{match.teams[inn.battingTeam].name}</span>
        <span className={inn.superOver ? 'rounded bg-amber-400 px-2 font-bold text-amber-950' : ''}>
          {inningsLabel(inn, t, f)}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <span className="tabular text-5xl leading-tight font-bold">
          {f.num(inn.runs)}/{f.num(inn.wickets)}
        </span>
        <span className="tabular pb-2 text-lg text-white/80">
          {t('scoring.oversOf', {
            overs: f.overs(inn.legalBalls),
            total: f.num(inn.oversLimit),
          })}
        </span>
        {inn.freeHitNext && (
          <span className="mb-2 ml-auto animate-pulse rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">
            {t('scoring.freeHit')}
          </span>
        )}
      </div>
      <div className="tabular flex flex-wrap gap-x-4 text-sm text-white/80">
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
        {inn.penaltyRuns !== 0 && (
          <span className="font-semibold text-amber-300">
            {t('scoring.penalty')} {inn.penaltyRuns > 0 ? '+' : '−'}
            {f.num(Math.abs(inn.penaltyRuns))}
          </span>
        )}
      </div>
      {state.reviewsLeft && (
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-white/80">
          <span>{t('scoring.reviewsLeft')}:</span>
          {([0, 1] as const).map((team) => (
            <span key={team}>
              {match.teams[team].name}{' '}
              <span className="font-bold text-white">{f.num(state.reviewsLeft![team])}</span>
            </span>
          ))}
        </div>
      )}
      {need !== null && need > 0 && !inn.ended && (
        <div className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-center font-semibold">
          {t('scoring.need', { runs: f.num(need), balls: f.num(ballsRemaining(inn)) })}
        </div>
      )}
    </section>
  );
}
