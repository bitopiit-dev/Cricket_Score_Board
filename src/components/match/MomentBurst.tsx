import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BallEvent, Match } from '../../engine/types';
import { playerName } from '../../utils/matchText';

type Kind = 'four' | 'six' | 'wicket';
interface Moment {
  key: string;
  kind: Kind;
  line: string;
}

const lastBall = (m: Match) =>
  [...m.events].reverse().find((e): e is BallEvent => e.type === 'ball') ?? null;

const kindOf = (b: BallEvent): Kind | null =>
  b.wicket
    ? 'wicket'
    : b.boundary && b.runs === 6
      ? 'six'
      : b.boundary && b.runs === 4
        ? 'four'
        : null;

/**
 * A short full-screen burst when a four, six or wicket arrives live from the
 * scorer. Never on opening the match, and not for a pile of balls arriving at
 * once after the scorer was offline (that is catching up, not a moment).
 */
export function MomentBurst({ match }: { match: Match }) {
  const { t } = useTranslation();
  const ball = lastBall(match);
  const count = match.events.length;
  // What was on screen last time; starts with the match as first opened, so no burst on opening
  const [seen, setSeen] = useState({ id: ball?.id ?? null, count });
  const [moment, setMoment] = useState<Moment | null>(null);

  // Adjusting state while rendering (React's pattern for "a prop changed")
  if (seen.id !== (ball?.id ?? null) || seen.count !== count) {
    const grew = count - seen.count;
    setSeen({ id: ball?.id ?? null, count });
    const kind = ball && ball.id !== seen.id && grew >= 1 && grew <= 3 ? kindOf(ball) : null;
    if (ball && kind) {
      const line =
        kind === 'wicket' && ball.wicket
          ? `${playerName(match, ball.wicket.batterId)}, ${t(`dismissal.${ball.wicket.kind}`)}`
          : '';
      setMoment({ key: ball.id, kind, line });
    }
  }

  useEffect(() => {
    if (!moment) return;
    const timer = setTimeout(() => setMoment(null), 1900);
    return () => clearTimeout(timer);
  }, [moment]);

  if (!moment) return null;
  const word =
    moment.kind === 'wicket'
      ? t('moment.wicket')
      : t(moment.kind === 'six' ? 'matchCenter.outcome.six' : 'matchCenter.outcome.four');

  return (
    <div
      key={moment.key}
      aria-live="polite"
      className={`moment moment-${moment.kind} pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center`}
    >
      <div aria-hidden className="moment-flash absolute inset-0" />
      <div aria-hidden className="moment-ring absolute size-56 rounded-full" />
      <div aria-hidden className="absolute size-0">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="moment-spark"
            style={{ ['--a' as string]: `${(360 / 14) * i}deg` }}
          />
        ))}
      </div>
      <p className="moment-word relative font-display text-8xl leading-none font-extrabold tracking-wide">
        {word}
      </p>
      {moment.line && (
        <p className="moment-line relative mt-3 rounded-full bg-night-950/85 px-4 py-1.5 text-base font-semibold text-white">
          {moment.line}
        </p>
      )}
    </div>
  );
}
