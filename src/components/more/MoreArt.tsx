import { useId } from 'react';
import { assetUrl } from '../../utils/asset';

/**
 * Decorative pictures in the corner of each More card. All are aria-hidden:
 * the card's title and hint already say what it is. Real app pictures are
 * used where there are some (the QR code, committee photos, the latest photo).
 */

const box = 'pointer-events-none absolute select-none';

/** A phone showing the app's real QR code. */
export function ShareArt({ qr }: { qr: string }) {
  return (
    <span
      aria-hidden
      className={`${box} top-3 right-4 w-[66px] rotate-12 sm:top-4 sm:right-5 rounded-2xl border-2 border-violet-400 bg-gradient-to-br from-violet-800 to-indigo-950 p-1.5 shadow-[0_16px_28px_-10px_rgb(124_58_237)] sm:w-[100px] sm:p-2`}
    >
      <span className="block rounded-lg bg-white p-1 text-center">
        <span className="block font-display text-[11px] leading-tight font-extrabold text-violet-900">
          BPL-2027
        </span>
        <img src={assetUrl(qr)} alt="" loading="lazy" className="block w-full" />
      </span>
      <span className="mx-auto mt-2 mb-0.5 block h-1 w-6 rounded-full bg-violet-300/50" />
    </span>
  );
}

/** Rising bars with a trend line and a crown on the tallest. */
export function StatsArt() {
  const id = useId();
  return (
    <svg aria-hidden viewBox="0 0 200 130" className={`${box} right-1 bottom-0 w-28 sm:w-40`}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" stopOpacity=".35" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity=".45" />
        </linearGradient>
      </defs>
      <rect x="30" y="80" width="26" height="50" rx="4" fill={`url(#${id}b)`} />
      <rect x="66" y="62" width="26" height="68" rx="4" fill={`url(#${id}b)`} />
      <rect x="102" y="44" width="26" height="86" rx="4" fill={`url(#${id}b)`} />
      <rect x="138" y="24" width="26" height="106" rx="4" fill={`url(#${id}g)`} />
      <path
        d="M20 86 L60 66 L92 72 L126 40 L151 18"
        fill="none"
        stroke="#a855f7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="151" cy="18" r="4" fill="#a855f7" />
      <path d="M141 6l5 4 5-7 5 7 5-4-2 9h-16z" fill="#f59e0b" />
    </svg>
  );
}

/** A clipboard with ticks. */
export function RulesArt() {
  return (
    <svg aria-hidden viewBox="0 0 200 150" className={`${box} right-0 bottom-0 w-28 sm:w-40`}>
      <g transform="rotate(8 120 75)">
        <rect x="74" y="20" width="96" height="124" rx="10" fill="#f59e0b" opacity=".25" />
        <rect x="82" y="28" width="80" height="108" rx="6" fill="#fde68a" />
        <rect x="102" y="14" width="40" height="18" rx="6" fill="#b45309" />
        <path
          d="M93 56l6 6 10-12M93 84l6 6 10-12M93 112l6 6 10-12"
          fill="none"
          stroke="#b45309"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M120 58h30M120 86h30M120 114h22"
          stroke="#d97706"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** The first committee members' photos, overlapping, then "+N". */
export function CommitteeArt({ photos, more }: { photos: string[]; more: string | null }) {
  return (
    <span
      aria-hidden
      className={`${box} right-3 bottom-3 flex w-[92px] sm:right-4 sm:bottom-4 sm:w-[118px] flex-wrap justify-end gap-y-1.5`}
    >
      {photos.map((src) => (
        <img
          key={src}
          src={assetUrl(src)}
          alt=""
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="-ml-3 size-9 sm:-ml-3.5 sm:size-11 rounded-full border-[3px] border-teal-50 bg-teal-100 object-cover dark:border-teal-950 dark:bg-teal-900"
        />
      ))}
      {more && (
        <span className="-ml-3 grid size-9 sm:-ml-3.5 sm:size-11 place-items-center rounded-full border-[3px] border-teal-50 bg-teal-700 font-display text-base font-bold text-white dark:border-teal-950 dark:bg-teal-800 dark:text-teal-100">
          {more}
        </span>
      )}
    </span>
  );
}

/** A gold trophy inside a laurel. */
export function AwardsArt() {
  const id = useId();
  const leaves = [-6, -6, -3, 2, 10];
  return (
    <svg aria-hidden viewBox="0 0 200 150" className={`${box} right-1 bottom-1 w-28 sm:w-40`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset=".5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        d="M46 40c-14 26-8 60 22 80M154 40c14 26 8 60-22 80"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".7"
      />
      <g fill="#f59e0b" opacity=".75">
        {leaves.map((dx, i) => (
          <g key={i}>
            <ellipse
              cx={46 + dx}
              cy={50 + i * 16}
              rx="7"
              ry="4"
              transform={`rotate(-40 ${46 + dx} ${50 + i * 16})`}
            />
            <ellipse
              cx={154 - dx}
              cy={50 + i * 16}
              rx="7"
              ry="4"
              transform={`rotate(40 ${154 - dx} ${50 + i * 16})`}
            />
          </g>
        ))}
      </g>
      <path d="M70 22h60v28a30 30 0 0 1-60 0z" fill={`url(#${id})`} />
      <path
        d="M70 30H56a16 16 0 0 0 18 22M130 30h14a16 16 0 0 1-18 22"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="6"
      />
      <rect x="94" y="78" width="12" height="22" fill="#d97706" />
      <rect x="78" y="100" width="44" height="10" rx="3" fill={`url(#${id})`} />
      <rect x="72" y="110" width="56" height="16" rx="3" fill="#92400e" />
      <path
        d="M80 30h6l-4 20"
        stroke="#fff"
        strokeOpacity=".55"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Two tilted photo frames; the front one shows the latest gallery photo, or the BPL logo. */
export function MediaArt({ photo, logo }: { photo?: string; logo: string }) {
  return (
    <span
      aria-hidden
      className={`${box} right-3 bottom-3 h-[76px] w-[104px] sm:bottom-5 sm:h-[100px] sm:w-[150px]`}
    >
      <span className="absolute inset-[8px_18px_0_6px] -rotate-10 rounded-lg border-2 border-fuchsia-400/60 bg-fuchsia-400/20" />
      <span className="absolute inset-[0_0_10px_26px] rotate-6 overflow-hidden rounded-lg border-4 border-white bg-night-950 shadow-[0_12px_24px_-8px_rgb(0_0_0/0.6)]">
        <img
          src={photo ?? assetUrl(logo)}
          alt=""
          loading="lazy"
          className={`size-full ${photo ? 'object-cover' : 'object-contain p-2'}`}
        />
      </span>
    </span>
  );
}
