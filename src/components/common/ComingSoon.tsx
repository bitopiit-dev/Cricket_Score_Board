import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Friendly placeholder for a section whose data is not ready yet. */
export function ComingSoon({
  icon,
  title,
  text,
  items,
  children,
}: {
  icon: string;
  title: string;
  text: string;
  /** What the section will show. */
  items?: string[];
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden rounded-3xl border border-night-line bg-night-950 p-6 text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 size-48 -translate-x-1/2 rounded-full bg-neon-violet/30 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-3">
        <span aria-hidden className="text-5xl">
          {icon}
        </span>
        <span className="rounded-full bg-gradient-to-r from-neon-cyan to-neon-violet px-3 py-0.5 text-xs font-bold tracking-wide text-night-950 uppercase">
          {t('comingSoon.badge')}
        </span>
        <h2 className="font-display text-3xl font-bold tracking-wide">{title}</h2>
        <p className="max-w-sm text-night-muted">{text}</p>
        {items && (
          <ul className="mt-1 flex flex-wrap justify-center gap-2">
            {items.map((i) => (
              <li
                key={i}
                className="rounded-full border border-neon-cyan/40 px-3 py-1 text-sm text-neon-cyan"
              >
                {i}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </section>
  );
}
