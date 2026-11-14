import { teamInitial } from '../../data/teams';

const SIZES = {
  sm: 'size-8 text-sm',
  md: 'size-12 text-xl',
  lg: 'size-16 text-2xl',
} as const;

/** Team logo, or a coloured circle with the name's first letter until a logo exists. */
export function TeamAvatar({
  name,
  color,
  logo,
  size = 'md',
}: {
  name: string;
  color?: string;
  logo?: string;
  size?: keyof typeof SIZES;
}) {
  const cls = `${SIZES[size]} shrink-0 rounded-full`;
  if (logo) {
    return <img src={logo} alt="" className={`${cls} bg-white object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${cls} flex items-center justify-center font-bold text-white shadow-inner`}
      style={{ backgroundColor: color ?? '#64748b' }}
    >
      {teamInitial(name)}
    </span>
  );
}
