import type { ReactNode } from 'react';
import { useFormat } from '../../hooks/useFormat';

export const btn = {
  primary:
    'rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white shadow-sm active:bg-emerald-800 disabled:opacity-40 dark:bg-emerald-600',
  secondary:
    'rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold active:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700',
  danger:
    'rounded-xl bg-red-600 px-4 py-3 font-semibold text-white active:bg-red-700 disabled:opacity-40',
};

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30 dark:border-slate-700 dark:bg-slate-900';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900 dark:shadow-none ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
      {children}
    </h2>
  );
}

/** Pick one of a few options. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-sm font-semibold ${
            o.value === value
              ? 'bg-white text-emerald-800 shadow dark:bg-slate-950 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Integer input with −/+ buttons. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const f = useFormat();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const stepBtn =
    'h-10 w-10 rounded-full bg-slate-100 text-xl font-bold active:bg-slate-200 disabled:opacity-30 dark:bg-slate-800';
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span>{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={stepBtn}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
          aria-label={`${label} −`}
        >
          −
        </button>
        <span className="tabular w-8 text-center text-lg font-semibold">{f.num(value)}</span>
        <button
          type="button"
          className={stepBtn}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
          aria-label={`${label} +`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600/50 after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5 dark:bg-slate-700" />
    </label>
  );
}
