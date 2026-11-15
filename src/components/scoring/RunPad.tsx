import { useTranslation } from 'react-i18next';
import type { ExtraType } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';

interface Props {
  disabled: boolean;
  canUndo: boolean;
  onRuns: (runs: number, boundary: boolean) => void;
  onExtra: (extra: ExtraType) => void;
  onOther: () => void;
  onWicket: () => void;
  onUndo: () => void;
  /** Tournament "six out" rule: the 6 button becomes a Six Out button. */
  sixOut: boolean;
  onSixOut: () => void;
}

const base =
  'flex h-16 items-center justify-center rounded-2xl text-xl font-bold shadow-sm transition active:scale-95 disabled:opacity-40 disabled:active:scale-100';

export function RunPad({
  disabled,
  canUndo,
  onRuns,
  onExtra,
  onOther,
  onWicket,
  onUndo,
  sixOut,
  onSixOut,
}: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const runBtn = `${base} bg-white text-slate-900 dark:bg-slate-800 dark:text-white`;
  const extraBtn = `${base} bg-amber-100 text-base text-amber-950 dark:bg-amber-500/20 dark:text-amber-200`;

  return (
    <div className="grid grid-cols-4 gap-2 p-3">
      {[0, 1, 2, 3].map((r) => (
        <button
          key={r}
          type="button"
          disabled={disabled}
          className={runBtn}
          onClick={() => onRuns(r, false)}
        >
          {f.num(r)}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={`${base} bg-bpl-green text-white`}
        onClick={() => onRuns(4, true)}
      >
        {f.num(4)}
      </button>
      {sixOut ? (
        <button
          type="button"
          disabled={disabled}
          className={`${base} bg-bpl-red px-1 text-sm leading-tight text-white`}
          onClick={onSixOut}
        >
          {t('scoring.sixOut')}
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          className={`${base} bg-bpl-yellow text-night-950`}
          onClick={() => onRuns(6, true)}
        >
          {f.num(6)}
        </button>
      )}
      <button type="button" disabled={disabled} className={`${runBtn} text-base`} onClick={onOther}>
        {f.num(5)}, {f.num(7)}…
      </button>
      <button
        type="button"
        disabled={!canUndo}
        className={`${base} bg-slate-200 text-base text-slate-800 dark:bg-slate-700 dark:text-slate-100`}
        onClick={onUndo}
      >
        ↶ {t('common.undo')}
      </button>

      {(['wide', 'noBall', 'bye', 'legBye'] as const).map((x) => (
        <button
          key={x}
          type="button"
          disabled={disabled}
          className={extraBtn}
          onClick={() => onExtra(x)}
        >
          {t(`scoring.${x}`)}
        </button>
      ))}

      <button
        type="button"
        disabled={disabled}
        className={`${base} col-span-4 bg-bpl-red text-white`}
        onClick={onWicket}
      >
        {t('scoring.wicket')}
      </button>
    </div>
  );
}
