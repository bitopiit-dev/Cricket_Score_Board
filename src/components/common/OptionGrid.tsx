import type { ReactNode } from 'react';

/** Wrap-around group of selectable chips. */
export function OptionGrid<T extends string | number>({
  value,
  options,
  onChange,
  cols = 3,
}: {
  value: T | null;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
  cols?: 2 | 3 | 4;
}) {
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[cols];
  return (
    <div className={`grid gap-2 ${grid}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-xl px-2 py-2 text-sm font-semibold disabled:opacity-30 ${
            o.value === value
              ? 'bg-emerald-700 text-white dark:bg-emerald-600'
              : 'bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 mb-2 text-sm text-slate-600 first:mt-0 dark:text-slate-400">
      {children}
    </div>
  );
}
