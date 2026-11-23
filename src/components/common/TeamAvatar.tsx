import { useState } from 'react';
import { assetUrl } from '../../utils/asset';
import { initials, teamInitial } from '../../data/teams';

const SIZES = {
  sm: 'size-8 text-sm',
  md: 'size-12 text-lg',
  lg: 'size-16 text-2xl',
  xl: 'size-24 text-4xl',
  /** Teams tab cards: a little smaller on narrow phones. */
  hero: 'size-20 text-3xl sm:size-24 sm:text-4xl',
} as const;

type Size = keyof typeof SIZES;

/** Picture in a circle, or a coloured circle with letters when there is no picture. */
export function Avatar({
  text,
  color,
  src,
  size = 'md',
}: {
  text: string;
  color?: string;
  src?: string;
  size?: Size;
}) {
  const cls = `${SIZES[size]} shrink-0 rounded-full`;
  // If the picture file is missing, fall back to the letters.
  const [failedSrc, setFailedSrc] = useState<string>();
  if (src && src !== failedSrc) {
    return (
      <img
        src={assetUrl(src)}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className={`${cls} bg-white object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${cls} flex items-center justify-center font-bold text-white shadow-inner`}
      style={{ backgroundColor: color ?? '#64748b' }}
    >
      {text}
    </span>
  );
}

/** Team logo, or the name's first letter until a logo exists. */
export function TeamAvatar(props: { name: string; color?: string; logo?: string; size?: Size }) {
  return (
    <Avatar text={teamInitial(props.name)} color={props.color} src={props.logo} size={props.size} />
  );
}

/** Player photo, or the name's initials. */
export function PlayerAvatar(props: { name: string; color?: string; photo?: string; size?: Size }) {
  return (
    <Avatar text={initials(props.name)} color={props.color} src={props.photo} size={props.size} />
  );
}
