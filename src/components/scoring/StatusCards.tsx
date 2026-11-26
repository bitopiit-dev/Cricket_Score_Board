import { useTranslation } from 'react-i18next';
import type { MatchState, Match } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { inningsLabel, resultText } from '../../utils/matchText';
import { btn } from '../common/controls';
import { manOfTheMatchId } from '../../engine/milestones';
import { isMatchLocked } from '../../engine/scoring';
import { ManOfTheMatchCard } from '../match/MatchCenter';
import { usePrefs } from '../../store/prefsStore';
import { suggestManOfTheMatch, type MomCandidate } from '../../tournament/momSuggest';

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
  onFinish,
  onReopen,
}: {
  match: Match;
  state: MatchState;
  /** Omitted for viewers, who only follow the match. */
  onUndo?: () => void;
  /** Scorer only: choose (or clear, with null) the Man of the Match. */
  onPickMom?: (playerId: string | null) => void;
  /** Scorer only: finish the match and lock the score. */
  onFinish?: () => void;
  /** Super admin only: unlock a finished match. */
  onReopen?: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const mom = manOfTheMatchId(match);
  const locked = isMatchLocked(match);
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  // Dhaka time, like the rest of the tournament
  const finishedText = locked
    ? new Intl.DateTimeFormat(
        lang === 'bn' ? (bengaliDigits ? 'bn-BD' : 'bn-BD-u-nu-latn') : 'en-GB',
        {
          timeZone: 'Asia/Dhaka',
          day: 'numeric',
          month: 'long',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        },
      ).format(match.finishedAt)
    : '';
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
      {onPickMom && <MomSuggestions match={match} state={state} mom={mom} onPick={onPickMom} />}
      {onPickMom && (
        <label className="flex flex-col gap-1.5 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
          <span className="text-sm font-semibold">🏅 {t('mom.orPick')}</span>
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
      {locked ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-2xl bg-emerald-50 p-3 text-emerald-900 ring-1 ring-emerald-600/30 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <p className="font-semibold">🔒 {t('finish.locked')}</p>
          <p className="text-sm">{t('finish.lockedAt', { when: finishedText })}</p>
          {onReopen && (
            <button
              type="button"
              className={btn.secondary}
              onClick={() => {
                if (confirm(t('finish.reopenAsk'))) onReopen();
              }}
            >
              🔓 {t('finish.reopen')}
            </button>
          )}
        </div>
      ) : (
        <>
          {onFinish && (
            <button
              type="button"
              className={`${btn.primary} text-lg`}
              onClick={() => {
                if (confirm(t('finish.ask'))) onFinish();
              }}
            >
              ✅ {t('finish.button')}
            </button>
          )}
          {onFinish && (
            <p className="-mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              {t('finish.hint')}
            </p>
          )}
          {onUndo && (
            <button type="button" className={btn.secondary} onClick={onUndo}>
              ↶ {t('common.undoLast')}
            </button>
          )}
        </>
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

/** Scorer only: the best performers of the match, one tap to choose. */
function MomSuggestions({
  match,
  state,
  mom,
  onPick,
}: {
  match: Match;
  state: MatchState;
  mom: string | null;
  onPick: (playerId: string | null) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const list = suggestManOfTheMatch(match, state);
  if (list.length === 0) return null;
  const won = state.result?.kind === 'won';

  const figures = (c: MomCandidate) => {
    const parts: string[] = [];
    if (c.batted) parts.push(`🏏 ${f.num(c.runs)}${c.notOut ? '*' : ''} (${f.num(c.balls)})`);
    if (c.legalBalls > 0)
      parts.push(`● ${f.num(c.wickets)}/${f.num(c.runsConceded)} (${f.overs(c.legalBalls)})`);
    if (c.fielding > 0) parts.push(`🧤 ${f.num(c.fielding)}`);
    return parts.join(' · ');
  };

  return (
    <section
      aria-labelledby="mom-suggest"
      className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900"
    >
      <h3 id="mom-suggest" className="text-sm font-semibold">
        🏅 {t(won ? 'mom.suggestedWinner' : 'mom.suggestedBoth')}
      </h3>
      <ul className="flex flex-col gap-2">
        {list.map((c, i) => {
          const chosen = mom === c.playerId;
          return (
            <li key={c.playerId}>
              <button
                type="button"
                aria-pressed={chosen}
                onClick={() => onPick(chosen ? null : c.playerId)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                  chosen
                    ? 'border-bpl-yellow bg-bpl-yellow/15 ring-2 ring-bpl-yellow'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full font-bold ${
                    i === 0 ? 'bg-bpl-yellow text-night-950' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {f.num(i + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {c.name}
                    {!won && (
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        {' '}
                        ({match.teams[c.team].name})
                      </span>
                    )}
                  </span>
                  <span className="tabular block truncate text-sm text-slate-600 dark:text-slate-300">
                    {figures(c)}
                  </span>
                </span>
                <span className="tabular shrink-0 text-right text-sm font-bold">
                  {chosen ? `✓ ${t('mom.chosen')}` : t('mom.points', { n: f.num(c.points) })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('mom.basis')}</p>
    </section>
  );
}
