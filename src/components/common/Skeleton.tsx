import { useTranslation } from 'react-i18next';

/** A placeholder block with a light sweeping across it while data loads. */
export function Bone({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`shimmer block rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

/**
 * The shape of a page before its data arrives, instead of a blank screen.
 * `hero`: a big dark card then cards (Home, Live, Stats); `table`: titled
 * tables (Points); `list`: rows (Fixtures, Awards, a player).
 */
export function PageSkeleton({
  variant = 'list',
  inline = false,
}: {
  variant?: 'hero' | 'table' | 'list';
  /** Inside a page that already has its title and padding. */
  inline?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t('common.loading')}
      className={inline ? 'flex flex-col gap-3' : 'mx-auto flex w-full max-w-lg flex-col gap-3 p-4'}
    >
      {variant !== 'hero' && !inline && <Bone className="h-9 w-40" />}
      {variant === 'hero' && (
        <div className="flex flex-col gap-4 rounded-3xl bg-night-950 p-5 ring-1 ring-night-line">
          <div className="flex items-center justify-between">
            <Bone className="size-16 !rounded-full !bg-night-800" />
            <Bone className="h-6 w-12 !bg-night-800" />
            <Bone className="size-16 !rounded-full !bg-night-800" />
          </div>
          <Bone className="mx-auto h-12 w-3/4 !bg-night-800" />
          <Bone className="mx-auto h-3 w-1/2 !bg-night-800" />
        </div>
      )}
      {Array.from({ length: variant === 'table' ? 2 : 3 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900"
        >
          <Bone className="h-5 w-1/3" />
          {Array.from({ length: variant === 'table' ? 6 : 2 }, (_, j) => (
            <div key={j} className="flex items-center gap-3">
              <Bone className="size-8 shrink-0 !rounded-full" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-4 w-10" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
