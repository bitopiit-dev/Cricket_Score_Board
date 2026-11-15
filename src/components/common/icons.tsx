import type { ReactNode } from 'react';

/** Line icons drawn on a 24×24 grid, in the same style as the tab bar. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const PATHS = {
  rules: (
    <>
      <path {...stroke} d="M6 3.5h9l3.5 3.5v13.5H6z" />
      <path {...stroke} d="M15 3.5V7h3.5M9 11h6M9 14.5h6M9 18h4" />
    </>
  ),
  committee: (
    <>
      <circle {...stroke} cx="12" cy="7.5" r="3" />
      <path {...stroke} d="M6.5 20a5.5 5.5 0 0 1 11 0" />
      <circle {...stroke} cx="5" cy="10" r="2" />
      <circle {...stroke} cx="19" cy="10" r="2" />
      <path {...stroke} d="M2 17.5a3.5 3.5 0 0 1 4-3.4M22 17.5a3.5 3.5 0 0 0-4-3.4" />
    </>
  ),
  awards: (
    <>
      <path {...stroke} d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" />
      <path {...stroke} d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4" />
      <path {...stroke} d="M12 13.5V17M8.5 20.5h7M9.5 20.5l.5-3.5h4l.5 3.5" />
    </>
  ),
  lock: (
    <>
      <rect {...stroke} x="5" y="10.5" width="14" height="10" rx="2" />
      <path {...stroke} d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  stats: (
    <>
      <path {...stroke} d="M4 20h16" />
      <rect {...stroke} x="5.5" y="11" width="3" height="6" rx="0.5" />
      <rect {...stroke} x="10.5" y="6" width="3" height="11" rx="0.5" />
      <rect {...stroke} x="15.5" y="13" width="3" height="4" rx="0.5" />
    </>
  ),
  share: (
    <>
      <circle {...stroke} cx="18" cy="5.5" r="2.5" />
      <circle {...stroke} cx="6" cy="12" r="2.5" />
      <circle {...stroke} cx="18" cy="18.5" r="2.5" />
      <path {...stroke} d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
    </>
  ),
  install: (
    <>
      <rect {...stroke} x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path {...stroke} d="M12 7v7M9 11.5l3 3 3-3M10.5 18.5h3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'size-6' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      {PATHS[name]}
    </svg>
  );
}
