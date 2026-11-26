import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { CreasePanel } from '../components/scoring/CreasePanel';
import { MoreSheet, type MoreAction } from '../components/scoring/MoreSheet';
import {
  BowlerSheet,
  NewBatterSheet,
  OpenersSheet,
  RetireSheet,
} from '../components/scoring/PlayerSheets';
import { RunPad } from '../components/scoring/RunPad';
import { ExtrasSheet, OtherRunsSheet } from '../components/scoring/RunsSheets';
import { ScorePanel } from '../components/scoring/ScorePanel';
import { ReviewSheet } from '../components/scoring/ReviewSheet';
import {
  InningsBreakCard,
  ResultCard,
  SuperOverBreakCard,
} from '../components/scoring/StatusCards';
import { ThisOver } from '../components/scoring/ThisOver';
import { WicketSheet } from '../components/scoring/WicketSheet';
import { KICK_PENALTY_RUNS } from '../engine/rules';
import type { ExtraType } from '../engine/types';
import { useFormat } from '../hooks/useFormat';
import { useMatchStore } from '../store/matchStore';
import { useCanScore, useCanUnlock } from '../sync/auth';
import { Icon } from '../components/common/icons';
import { useShareMatch } from '../hooks/useShareMatch';
import { MatchCenter } from '../components/match/MatchCenter';
import { isVoidMatch } from '../data/fixtures';
import { SyncStatus } from '../components/scoring/SyncStatus';
import { ballOutcome } from '../utils/ballText';
import { PageSkeleton } from '../components/common/Skeleton';

type Open =
  null | 'wicket' | 'other' | 'more' | 'retire' | 'changeBowler' | 'openers' | 'review' | ExtraType;

export default function ScoringPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const shareMatch = useShareMatch();
  const { id } = useParams<{ id: string }>();
  const { match, state, notFound, lastError, load, dispatch, undo, clearError } = useMatchStore();
  const setManOfTheMatch = useMatchStore((s) => s.setManOfTheMatch);
  const finishMatch = useMatchStore((s) => s.finish);
  const reopenMatch = useMatchStore((s) => s.reopen);
  const canUnlock = useCanUnlock();
  const [open, setOpen] = useState<Open>(null);
  /** The ball just recorded, shown briefly so the scorer can see it went in right. */
  const [done, setDone] = useState<{ key: number; text: string } | null>(null);
  // Viewers follow the score; only scorers and super admins get the controls.
  const canScore = useCanScore();

  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(null), 2200);
    return () => clearTimeout(timer);
  }, [done]);

  useEffect(() => {
    if (!lastError) return;
    const timer = setTimeout(clearError, 3000);
    return () => clearTimeout(timer);
  }, [lastError, clearError]);

  if (notFound) {
    return (
      <div className="min-h-dvh">
        <Header title="404" backTo="/home" />
        <p className="p-8 text-center">
          <Link to="/" className="text-emerald-700 underline">
            ← {t('common.back')}
          </Link>
        </p>
      </div>
    );
  }
  if (!match || !state || match.id !== id) return <PageSkeleton variant="hero" />;

  const { phase } = state;
  const inn = state.current;
  const title = `${match.teams[0].name} ${t('common.vs')} ${match.teams[1].name}`;
  const close = () => setOpen(null);
  /** Dispatch and close the open sheet if accepted. */
  const send: typeof dispatch = (input) => {
    const ok = dispatch(input);
    if (ok) {
      close();
      // A short buzz confirms the tap; a wicket gets a double one
      buzz(input.type === 'ball' && input.wicket ? [30, 60, 30] : 15);
      if (input.type === 'ball')
        setDone({ key: Date.now(), text: ballOutcome(input, match, t, f) });
      // So the undo chip names what it will undo
      else if (input.type === 'swapStrike')
        setDone({ key: Date.now(), text: t('scoring.strikeSwapped') });
    }
    return ok;
  };
  const undoNow = () => {
    undo();
    buzz(10);
    setDone(null);
  };
  const canUndo = match.events.length > 0;

  // People following the match get the Match Center; only scorers get the scoring screen.
  // A match set aside for a replay is read-only: the replay is scored as a new match.
  if (!canScore || isVoidMatch(match)) {
    return <MatchCenter match={match} state={state} title={title} onShare={() => void onShare()} />;
  }

  const duringInnings = phase === 'inPlay' || phase === 'needBowler' || phase === 'needBatter';
  const moreEnabled: Record<MoreAction, boolean> = {
    swapStrike: (phase === 'inPlay' || phase === 'needBowler') && !inn?.loneBatter,
    retire: phase === 'inPlay' || phase === 'needBowler',
    changeBowler: phase === 'inPlay',
    review: duringInnings && !!state.reviewsLeft?.some((n) => n > 0),
    penalty: duringInnings,
    endInnings: duringInnings,
  };
  const between = phase === 'inningsBreak' || phase === 'superOverBreak';

  /** Score message + a link straight to this match, for WhatsApp and friends. */
  async function onShare() {
    await shareMatch(match!, state!);
  }

  function onMore(action: MoreAction) {
    switch (action) {
      case 'swapStrike':
        send({ type: 'swapStrike' });
        break;
      case 'retire':
        setOpen('retire');
        break;
      case 'changeBowler':
        setOpen('changeBowler');
        break;
      case 'review':
        setOpen('review');
        break;
      case 'penalty':
        if (
          inn &&
          window.confirm(
            t('scoring.penaltyConfirm', {
              n: f.num(KICK_PENALTY_RUNS),
              team: match!.teams[inn.battingTeam].name,
            }),
          )
        ) {
          send({ type: 'penalty', runs: -KICK_PENALTY_RUNS });
        }
        break;
      case 'endInnings':
        if (window.confirm(t('scoring.endInningsConfirm'))) send({ type: 'endInnings' });
        break;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        title={title}
        backTo="/home"
        actions={
          <>
            <SyncStatus matchId={match.id} />
            <button
              type="button"
              onClick={() => void onShare()}
              aria-label={t('common.share')}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
            >
              <Icon name="share" className="size-5" />
            </button>
            {canScore && (
              <button
                type="button"
                onClick={() => setOpen('more')}
                aria-label={t('scoring.more')}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-white/10"
              >
                ⋮
              </button>
            )}
          </>
        }
      />

      {(match.settings.shortPitch || match.settings.sixOut) && (
        <div className="bg-night-900 px-4 py-0.5 text-center text-xs text-night-muted">
          {[
            match.settings.shortPitch && t('scoring.shortPitch'),
            match.settings.sixOut && t('scoring.sixOut'),
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}

      {inn && <ScorePanel match={match} inn={inn} state={state} />}

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {phase === 'inningsBreak' && (
          <InningsBreakCard
            match={match}
            state={state}
            onStart={canScore ? () => setOpen('openers') : undefined}
            onUndo={canScore ? undo : undefined}
          />
        )}
        {phase === 'superOverBreak' && (
          <SuperOverBreakCard
            match={match}
            state={state}
            onStart={canScore ? () => setOpen('openers') : undefined}
            onUndo={canScore ? undo : undefined}
          />
        )}
        {phase === 'completed' && (
          <ResultCard
            match={match}
            state={state}
            onUndo={canScore ? undo : undefined}
            onPickMom={canScore ? setManOfTheMatch : undefined}
            onFinish={canScore ? finishMatch : undefined}
            onReopen={canScore && canUnlock ? reopenMatch : undefined}
          />
        )}

        {!canScore &&
          (phase === 'needOpeners' || phase === 'needBatter' || phase === 'needBowler') && (
            <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {match.events.length === 0
                ? t('scoring.notStartedYet')
                : t('scoring.waitingForScorer')}
            </p>
          )}

        {inn && !between && phase !== 'completed' && (
          <>
            <CreasePanel
              match={match}
              inn={inn}
              onSwapStrike={
                canScore && moreEnabled.swapStrike ? () => send({ type: 'swapStrike' }) : undefined
              }
            />
            <ThisOver inn={inn} />
            {canScore && (
              <div className="mt-auto">
                <RunPad
                  disabled={phase !== 'inPlay'}
                  canUndo={canUndo}
                  sixOut={!!match.settings.sixOut}
                  onRuns={(runs, boundary) =>
                    send({ type: 'ball', runs, extra: null, ...(boundary ? { boundary } : {}) })
                  }
                  onSixOut={() =>
                    send({
                      type: 'ball',
                      runs: 0,
                      extra: null,
                      wicket: { kind: 'sixOut', batterId: inn.strikerId! },
                    })
                  }
                  onExtra={(x) => setOpen(x)}
                  onOther={() => setOpen('other')}
                  onWicket={() => setOpen('wicket')}
                  onUndo={undoNow}
                />
              </div>
            )}
          </>
        )}
      </main>

      {done && !lastError && (
        <div
          key={done.key}
          role="status"
          className="toast-in fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-[60] mx-auto flex w-fit max-w-[92%] items-center gap-3 rounded-full bg-slate-900 py-1.5 pr-1.5 pl-4 text-sm text-white shadow-lg dark:bg-white dark:text-slate-900"
        >
          <span className="truncate">
            {t('scoring.recorded')}: <span className="font-semibold">{done.text}</span>
          </span>
          <button
            type="button"
            onClick={undoNow}
            className="shrink-0 rounded-full bg-white/15 px-3 py-1 font-semibold dark:bg-slate-900/10"
          >
            ↶ {t('common.undo')}
          </button>
        </div>
      )}

      {lastError && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-white shadow-lg dark:bg-white dark:text-slate-900"
        >
          {t(`errors.${lastError}`)}
        </div>
      )}

      {canScore && (
        <>
          {/* Required choices driven by the match phase */}
          {phase === 'needOpeners' && (
            <OpenersSheet
              match={match}
              innings={state.innings}
              onStart={(s, n, b) =>
                send({ type: 'inningsStart', strikerId: s, nonStrikerId: n, bowlerId: b })
              }
            />
          )}
          {between && open === 'openers' && (
            <OpenersSheet
              key={state.innings.length}
              match={match}
              innings={state.innings}
              onClose={close}
              onStart={(s, n, b) =>
                send({ type: 'inningsStart', strikerId: s, nonStrikerId: n, bowlerId: b })
              }
            />
          )}
          {phase === 'needBatter' && inn && (
            <NewBatterSheet
              match={match}
              inn={inn}
              onUndo={undoNow}
              onPick={(batterId) => send({ type: 'newBatter', batterId })}
            />
          )}
          {phase === 'needBowler' && inn && open !== 'more' && open !== 'retire' && (
            <BowlerSheet
              match={match}
              inn={inn}
              onUndo={undoNow}
              onPick={(bowlerId) => send({ type: 'newBowler', bowlerId })}
            />
          )}

          {/* Optional sheets */}
          {inn && phase === 'inPlay' && (
            <>
              <ExtrasSheet
                extra={
                  open === 'wide' || open === 'noBall' || open === 'bye' || open === 'legBye'
                    ? open
                    : null
                }
                sixOut={!!match.settings.sixOut}
                onClose={close}
                onPick={(runs, boundary) =>
                  send({
                    type: 'ball',
                    runs,
                    extra: open as ExtraType,
                    ...(boundary ? { boundary } : {}),
                  })
                }
              />
              <OtherRunsSheet
                open={open === 'other'}
                onClose={close}
                onPick={(runs) => send({ type: 'ball', runs, extra: null })}
              />
              {open === 'wicket' && (
                <WicketSheet
                  match={match}
                  inn={inn}
                  onClose={close}
                  onConfirm={(w) => send({ type: 'ball', ...w })}
                />
              )}
              {open === 'changeBowler' && (
                <BowlerSheet
                  match={match}
                  inn={inn}
                  onClose={close}
                  onPick={(bowlerId) => send({ type: 'newBowler', bowlerId })}
                />
              )}
            </>
          )}
          {inn && open === 'retire' && (
            <RetireSheet
              match={match}
              inn={inn}
              onClose={close}
              onConfirm={(batterId, kind) => send({ type: 'retire', batterId, kind })}
            />
          )}
          {open === 'review' && inn && state.reviewsLeft && (
            <ReviewSheet
              match={match}
              inn={inn}
              reviewsLeft={state.reviewsLeft}
              onClose={close}
              onConfirm={(team, successful) => send({ type: 'review', team, successful })}
            />
          )}
          <MoreSheet
            open={open === 'more'}
            enabled={moreEnabled}
            onClose={close}
            onAction={(a) => {
              close();
              onMore(a);
            }}
          />
        </>
      )}
    </div>
  );
}

/** Vibrates where the phone supports it (Android); silently nothing elsewhere. */
function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
