import { useTranslation } from 'react-i18next';
import type { ExtraType } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { Sheet } from '../common/Sheet';

const choice =
  'flex h-14 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700';

interface Option {
  runs: number;
  boundary: boolean;
  label: string;
}

function RunChoices({ options, onPick }: { options: Option[]; onPick: (o: Option) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          className={`${choice} ${o.boundary ? 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100' : ''}`}
          onClick={() => onPick(o)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Wide / no-ball / bye / leg-bye: one tap on the runs completes the ball. */
export function ExtrasSheet({
  extra,
  sixOut,
  onClose,
  onPick,
}: {
  extra: ExtraType | null;
  sixOut: boolean;
  onClose: () => void;
  onPick: (runs: number, boundary: boolean) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  if (!extra) return null;

  const plain = (runs: number): Option => ({ runs, boundary: false, label: f.num(runs) });
  const four = { runs: 4, boundary: true, label: `${f.num(4)} ▣` };
  const six = { runs: 6, boundary: true, label: `${f.num(6)} ▣` };

  let prompt: string;
  let options: Option[];
  switch (extra) {
    case 'wide':
      prompt = t('scoring.extraRunsWide');
      options = [0, 1, 2, 3, 4, 5].map(plain);
      break;
    case 'noBall':
      prompt = t('scoring.runsOffBat');
      // With six out on, a six off a no-ball is not possible either.
      options = sixOut
        ? [plain(0), plain(1), plain(2), plain(3), four, plain(5)]
        : [plain(0), plain(1), plain(2), plain(3), four, six, plain(5)];
      break;
    default:
      prompt = t('scoring.runsRun');
      options = [1, 2, 3, 4, 5].map(plain);
  }

  return (
    <Sheet open title={t(`scoring.${extra}`)} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">{prompt}</p>
      <RunChoices options={options} onPick={(o) => onPick(o.runs, o.boundary)} />
      {extra === 'noBall' && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          ▣ = {t('scoring.boundary')}
        </p>
      )}
    </Sheet>
  );
}

/** Unusual runs (5, 7 or an all-run 4) with no boundary. */
export function OtherRunsSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (runs: number) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <Sheet open={open} title={t('scoring.runsRun')} onClose={onClose}>
      <RunChoices
        options={[4, 5, 6, 7, 8].map((runs) => ({ runs, boundary: false, label: f.num(runs) }))}
        onPick={(o) => onPick(o.runs)}
      />
    </Sheet>
  );
}
