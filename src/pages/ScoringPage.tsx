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
import { InningsBreakCard, ResultCard } from '../components/scoring/StatusCards';
import { ThisOver } from '../components/scoring/ThisOver';
import { WicketSheet } from '../components/scoring/WicketSheet';
import type { ExtraType } from '../engine/types';
import { useMatchStore } from '../store/matchStore';

type Open = null | 'wicket' | 'other' | 'more' | 'retire' | 'changeBowler' | 'openers' | ExtraType;

export default function ScoringPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { match, state, notFound, lastError, load, dispatch, undo, clearError } = useMatchStore();
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);

  useEffect(() => {
    if (!lastError) return;
    const timer = setTimeout(clearError, 3000);
    return () => clearTimeout(timer);
  }, [lastError, clearError]);

  if (notFound) {
    return (
      <div className="min-h-dvh">
        <Header title="404" backTo="/" />
        <p className="p-8 text-center">
          <Link to="/" className="text-emerald-700 underline">
            ← {t('common.back')}
          </Link>
        </p>
      </div>
    );
  }
  if (!match || !state || match.id !== id) return null;

  const { phase } = state;
  const inn = state.current;
  const title = `${match.teams[0].name} ${t('common.vs')} ${match.teams[1].name}`;
  const close = () => setOpen(null);
  /** Dispatch and close the open sheet if accepted. */
  const send: typeof dispatch = (input) => {
    const ok = dispatch(input);
    if (ok) close();
    return ok;
  };
  const canUndo = match.events.length > 0;

  const moreEnabled: Record<MoreAction, boolean> = {
    swapStrike: (phase === 'inPlay' || phase === 'needBowler') && !inn?.loneBatter,
    retire: phase === 'inPlay' || phase === 'needBowler',
    changeBowler: phase === 'inPlay',
    endInnings: phase === 'inPlay' || phase === 'needBowler' || phase === 'needBatter',
  };

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
      case 'endInnings':
        if (window.confirm(t('scoring.endInningsConfirm'))) send({ type: 'endInnings' });
        break;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        title={title}
        backTo="/"
        actions={
          <button
            type="button"
            onClick={() => setOpen('more')}
            aria-label={t('scoring.more')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-white/10"
          >
            ⋮
          </button>
        }
      />

      {(match.settings.shortPitch || match.settings.sixOut) && (
        <div className="bg-emerald-900 px-4 py-0.5 text-center text-xs text-emerald-200 dark:bg-black/40">
          {[
            match.settings.shortPitch && t('scoring.shortPitch'),
            match.settings.sixOut && t('scoring.sixOut'),
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}

      {inn && <ScorePanel match={match} inn={inn} />}

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {phase === 'inningsBreak' && (
          <InningsBreakCard
            match={match}
            state={state}
            onStart={() => setOpen('openers')}
            onUndo={undo}
          />
        )}
        {phase === 'completed' && <ResultCard match={match} state={state} onUndo={undo} />}

        {inn && phase !== 'inningsBreak' && phase !== 'completed' && (
          <>
            <CreasePanel match={match} inn={inn} />
            <ThisOver inn={inn} />
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
                onUndo={undo}
              />
            </div>
          </>
        )}
      </main>

      {lastError && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-white shadow-lg dark:bg-white dark:text-slate-900"
        >
          {t(`errors.${lastError}`)}
        </div>
      )}

      {/* Required choices driven by the match phase */}
      {phase === 'needOpeners' && (
        <OpenersSheet
          match={match}
          inningsIndex={0}
          onStart={(s, n, b) =>
            send({ type: 'inningsStart', strikerId: s, nonStrikerId: n, bowlerId: b })
          }
        />
      )}
      {phase === 'inningsBreak' && open === 'openers' && (
        <OpenersSheet
          match={match}
          inningsIndex={1}
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
          onUndo={undo}
          onPick={(batterId) => send({ type: 'newBatter', batterId })}
        />
      )}
      {phase === 'needBowler' && inn && open !== 'more' && open !== 'retire' && (
        <BowlerSheet
          match={match}
          inn={inn}
          onUndo={undo}
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
      <MoreSheet
        open={open === 'more'}
        enabled={moreEnabled}
        onClose={close}
        onAction={(a) => {
          close();
          onMore(a);
        }}
      />
    </div>
  );
}
