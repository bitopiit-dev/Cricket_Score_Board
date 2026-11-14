import { useTranslation } from 'react-i18next';
import type { MatchState, Match } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { inningsLabel, resultText } from '../../utils/matchText';
import { btn } from '../common/controls';

function InningsLines({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <ul className="flex flex-col gap-2">
      {state.innings.map((inn) => (
        <li key={inn.index} className="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
          {inn.superOver && (
            <div className="text-xs font-bold text-amber-700 uppercase dark:text-amber-400">
              {inningsLabel(inn, t, f)}
            </div>
          )}
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold">{match.teams[inn.battingTeam].name}</span>
            <span className="tabular text-xl font-bold">
              {f.num(inn.runs)}/{f.num(inn.wickets)}
            </span>
          </div>
          <div className="tabular flex justify-between text-sm text-slate-500">
            <span>{inn.endReason && t(`endReason.${inn.endReason}`)}</span>
            <span>
              {t('scoring.oversOf', {
                overs: f.overs(inn.legalBalls),
                total: f.num(inn.oversLimit),
              })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function InningsBreakCard({
  match,
  state,
  onStart,
  onUndo,
}: {
  match: Match;
  state: MatchState;
  onStart: () => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  // Between the halves of a pair (main match or a super over)
  const first = state.innings[state.innings.length - 1];
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-center text-xl font-bold">
        {first.superOver ? inningsLabel(first, t, f) : t('scoring.inningsBreak')}
      </h2>
      <InningsLines match={match} state={state} />
      <p className="text-center text-lg">
        {match.teams[first.bowlingTeam].name} — {t('scoring.target')}{' '}
        <span className="font-bold">{f.num(first.runs + 1)}</span>
      </p>
      <button type="button" className={`${btn.primary} text-lg`} onClick={onStart}>
        {first.superOver ? t('scoring.startSuperOverChase') : t('scoring.startSecondInnings')}
      </button>
      <button type="button" className={btn.secondary} onClick={onUndo}>
        ↶ {t('common.undoLast')}
      </button>
    </div>
  );
}

export function ResultCard({
  match,
  state,
  onUndo,
}: {
  match: Match;
  state: MatchState;
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-center text-sm font-semibold tracking-wide text-slate-500 uppercase">
        {t('scoring.matchOver')}
      </h2>
      {state.result && (
        <p className="text-center text-2xl font-bold text-emerald-700 dark:text-emerald-400">
          {resultText(state.result, match, t, f)}
        </p>
      )}
      <InningsLines match={match} state={state} />
      <button type="button" className={btn.secondary} onClick={onUndo}>
        ↶ {t('common.undoLast')}
      </button>
    </div>
  );
}

/** Scores level after a pair of innings: start a super over. */
export function SuperOverBreakCard({
  match,
  state,
  onStart,
  onUndo,
}: {
  match: Match;
  state: MatchState;
  onStart: () => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-center text-2xl font-bold text-amber-700 dark:text-amber-400">
        {t('scoring.scoresLevel')}
      </h2>
      <p className="text-center text-slate-600 dark:text-slate-300">{t('scoring.superOverNext')}</p>
      <InningsLines match={match} state={state} />
      <button type="button" className={`${btn.primary} text-lg`} onClick={onStart}>
        {t('scoring.startSuperOver')}
      </button>
      <button type="button" className={btn.secondary} onClick={onUndo}>
        ↶ {t('common.undoLast')}
      </button>
    </div>
  );
}
