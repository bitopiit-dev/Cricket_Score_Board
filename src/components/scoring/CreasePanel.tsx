import { useTranslation } from 'react-i18next';
import { strikeRate } from '../../engine/rules';
import { currentPartnership, economy } from '../../engine/stats';
import type { InningsState, Match } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { playerName } from '../../utils/matchText';

/** Current batters, bowler and partnership. */
export function CreasePanel({ match, inn }: { match: Match; inn: InningsState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const batters = [inn.strikerId, inn.nonStrikerId]
    .filter((id): id is string => id !== null)
    .map((id) => inn.batters.find((b) => b.playerId === id)!);
  const bowlerId = inn.bowlerId ?? inn.overs[inn.overs.length - 1]?.bowlerId;
  const bowler = inn.bowlers.find((b) => b.playerId === bowlerId);
  const p = currentPartnership(inn);

  const th = 'px-1 py-1 text-right font-normal text-slate-500 dark:text-slate-400';
  const td = 'tabular px-1 py-1.5 text-right';

  return (
    <section className="bg-white px-3 py-2 text-sm dark:bg-slate-900">
      <table className="w-full">
        <thead>
          <tr>
            <th className={`${th} w-[42%] text-left`}>{t('scoring.batter')}</th>
            <th className={th}>{t('col.runs')}</th>
            <th className={th}>{t('col.balls')}</th>
            <th className={th}>{t('col.fours')}</th>
            <th className={th}>{t('col.sixes')}</th>
            <th className={th}>{t('col.sr')}</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b) => {
            const onStrike = b.playerId === inn.strikerId;
            return (
              <tr key={b.playerId} className={onStrike ? 'font-semibold' : ''}>
                <td className="max-w-0 truncate px-1 py-1.5">
                  {onStrike && (
                    <span className="mr-1 text-emerald-600" aria-label={t('scoring.onStrike')}>
                      ●
                    </span>
                  )}
                  {playerName(match, b.playerId)}
                  {inn.loneBatter && (
                    <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                      ({t('scoring.loneBatter')})
                    </span>
                  )}
                </td>
                <td className={td}>{f.num(b.runs)}</td>
                <td className={td}>{f.num(b.balls)}</td>
                <td className={td}>{f.num(b.fours)}</td>
                <td className={td}>{f.num(b.sixes)}</td>
                <td className={td}>{f.dec(strikeRate(b.runs, b.balls), 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="mt-1 w-full border-t border-slate-200 dark:border-slate-800">
        <thead>
          <tr>
            <th className={`${th} text-left`}>{t('scoring.bowler')}</th>
            <th className={th}>{t('col.overs')}</th>
            <th className={th}>{t('col.maidens')}</th>
            <th className={th}>{t('col.conceded')}</th>
            <th className={th}>{t('col.wickets')}</th>
            <th className={th}>{t('col.econ')}</th>
          </tr>
        </thead>
        <tbody>
          {bowler && (
            <tr>
              <td className="max-w-0 truncate px-1 py-1.5">{playerName(match, bowler.playerId)}</td>
              <td className={td}>{f.overs(bowler.legalBalls)}</td>
              <td className={td}>{f.num(bowler.maidens)}</td>
              <td className={td}>{f.num(bowler.runsConceded)}</td>
              <td className={td}>{f.num(bowler.wickets)}</td>
              <td className={td}>{f.dec(economy(bowler))}</td>
            </tr>
          )}
        </tbody>
      </table>

      {p && (
        <div className="tabular mt-1 border-t border-slate-200 px-1 pt-1.5 text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {t('scoring.partnership')}: {f.num(p.runs)} ({f.num(p.legalBalls)})
        </div>
      )}
    </section>
  );
}
