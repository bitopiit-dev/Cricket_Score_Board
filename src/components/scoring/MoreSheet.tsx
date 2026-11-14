import { useTranslation } from 'react-i18next';
import { Sheet } from '../common/Sheet';

export type MoreAction = 'swapStrike' | 'retire' | 'changeBowler' | 'endInnings';

export function MoreSheet({
  open,
  enabled,
  onClose,
  onAction,
}: {
  open: boolean;
  enabled: Record<MoreAction, boolean>;
  onClose: () => void;
  onAction: (a: MoreAction) => void;
}) {
  const { t } = useTranslation();
  const items: { action: MoreAction; label: string; danger?: boolean }[] = [
    { action: 'swapStrike', label: t('scoring.swapStrike') },
    { action: 'retire', label: t('scoring.retire') },
    { action: 'changeBowler', label: t('scoring.changeBowler') },
    { action: 'endInnings', label: t('scoring.endInnings'), danger: true },
  ];
  return (
    <Sheet open={open} title={t('scoring.more')} onClose={onClose}>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.action}>
            <button
              type="button"
              disabled={!enabled[i.action]}
              onClick={() => onAction(i.action)}
              className={`w-full rounded-xl px-4 py-3 text-left font-semibold disabled:opacity-40 ${
                i.danger
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                  : 'bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700'
              }`}
            >
              {i.label}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
