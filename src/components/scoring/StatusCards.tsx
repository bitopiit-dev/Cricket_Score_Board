import { useTranslation } from 'react-i18next';
import type { MatchState, Match } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { inningsLabel, resultText } from '../../utils/matchText';
import { btn } from '../common/controls';
import { manOfTheMatchId } from '../../engine/milestones';
import { ManOfTheMatchCard } from '../match/MatchCenter';

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
          <div className="tabular flex justify-between text-sm text-slate-500 dark:text-slate-400">
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
  /** Omitted for viewers, who only follow the match. */
  onStart?: () => void;
  onUndo?: () => void;
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
      {onStart && (
        <button type="button" className={`${btn.primary} text-lg`} onClick={onStart}>
          {first.superOver ? t('scoring.startSuperOverChase') : t('scoring.startSecondInnings')}
        </button>
      )}
      {onUndo && (
        <button type="button" className={btn.secondary} onClick={onUndo}>
          ↶ {t('common.undoLast')}
        </button>
      )}
    </div>
  );
}

export function ResultCard({
  match,
  state,
  onUndo,
  onPickMom,
}: {
  match: Match;
  state: MatchState;
  /** Omitted for viewers, who only follow the match. */
  onUndo?: () => void;
  /** Scorer only: choose (or clear, with null) the Man of the Match. */
  onPickMom?: (playerId: string | null) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const mom = manOfTheMatchId(match);
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-center text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
        {t('scoring.matchOver')}
      </h2>
      {state.result && (
        <p className="text-center text-2xl font-bold text-emerald-700 dark:text-emerald-400">
          {resultText(state.result, match, t, f)}
        </p>
      )}
      <InningsLines match={match} state={state} />
      <ManOfTheMatchCard match={match} state={state} />
      {onPickMom && (
        <label className="flex flex-col gap-1.5 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
          <span className="text-sm font-semibold">🏅 {t('mom.pick')}</span>
          <select
            value={mom ?? ''}
            onChange={(e) => onPickMom(e.target.value || null)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">— {t('mom.none')} —</option>
            {match.teams.map((team, i) => (
              <optgroup key={i} label={team.name}>
                {team.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('mom.hint')}</span>
        </label>
      )}
      {onUndo && (
        <button type="button" className={btn.secondary} onClick={onUndo}>
          ↶ {t('common.undoLast')}
        </button>
      )}
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
  /** Omitted for viewers, who only follow the match. */
  onStart?: () => void;
  onUndo?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-center text-2xl font-bold text-amber-700 dark:text-amber-400">
        {t('scoring.scoresLevel')}
      </h2>
      <p className="text-center text-slate-600 dark:text-slate-300">{t('scoring.superOverNext')}</p>
      <InningsLines match={match} state={state} />
      {onStart && (
        <button type="button" className={`${btn.primary} text-lg`} onClick={onStart}>
          {t('scoring.startSuperOver')}
        </button>
      )}
      {onUndo && (
        <button type="button" className={btn.secondary} onClick={onUndo}>
          ↶ {t('common.undoLast')}
        </button>
      )}
    </div>
  );
}
