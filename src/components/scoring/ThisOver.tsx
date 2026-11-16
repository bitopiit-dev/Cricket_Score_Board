import { useTranslation } from 'react-i18next';
import type { BallSummary, InningsState } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';

export function ThisOver({ inn }: { inn: InningsState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const over = inn.overs[inn.overs.length - 1];
  if (!over) return null;
  return (
    <section className="flex items-center gap-2 overflow-x-auto bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
        {t('scoring.over', { n: f.num(over.number) })}
      </span>
      <div className="flex gap-1.5">
        {over.balls.map((b) => (
          <BallChip key={b.eventId} ball={b} />
        ))}
      </div>
      <span className="tabular ml-auto shrink-0 pl-2 text-sm font-semibold">
        = {f.num(over.runs)}
      </span>
    </section>
  );
}

export function BallChip({ ball }: { ball: BallSummary }) {
  const { t } = useTranslation();
  const f = useFormat();

  let label: string;
  if (ball.extra === 'wide') label = (ball.runs ? `${f.num(ball.runs)}+` : '') + t('ball.wide');
  else if (ball.extra === 'noBall')
    label = t('ball.noBall') + (ball.runs ? `+${f.num(ball.runs)}` : '');
  else if (ball.extra === 'bye') label = f.num(ball.runs) + t('ball.bye');
  else if (ball.extra === 'legBye') label = f.num(ball.runs) + t('ball.legBye');
  else label = ball.runs === 0 && !ball.wicket ? '•' : f.num(ball.runs);
  if (ball.wicket)
    label =
      ball.extra === null && ball.runs === 0 ? t('ball.wicket') : `${label} ${t('ball.wicket')}`;

  const color = ball.wicket
    ? 'bg-bpl-red text-white'
    : ball.extra === 'wide' || ball.extra === 'noBall'
      ? 'bg-amber-200 text-amber-950 dark:bg-amber-500/30 dark:text-amber-200'
      : ball.boundary && ball.runs === 6
        ? 'bg-bpl-yellow text-night-950'
        : ball.boundary && ball.runs === 4
          ? 'bg-bpl-cyan text-night-950'
          : ball.runs === 0
            ? 'bg-transparent text-slate-500 ring-1 ring-slate-300 dark:text-slate-400 dark:ring-slate-700'
            : 'bg-white text-slate-800 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700';

  return (
    <span
      className={`tabular flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold whitespace-nowrap ${color} ${ball.freeHit ? 'outline-2 outline-offset-1 outline-amber-400' : ''}`}
    >
      {label}
    </span>
  );
}
