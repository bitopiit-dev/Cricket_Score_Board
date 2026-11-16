import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { battingMilestone, isWicketHaul } from '../../engine/milestones';
import { useFormat } from '../../hooks/useFormat';

/** Small championship-gold pill for a milestone or award. */
export function GoldBadge({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <span
      title={label}
      className="ml-1.5 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-bpl-yellow px-1.5 py-px align-middle text-[10px] leading-tight font-extrabold whitespace-nowrap text-night-950 shadow-[0_0_8px_rgb(245_158_11/0.35)]"
    >
      {children}
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

/** "50" or "100" next to a batter who reached it. */
export function BattingBadge({ runs }: { runs: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const m = battingMilestone(runs);
  if (!m) return null;
  return (
    <GoldBadge label={t(m === 100 ? 'badge.hundred' : 'badge.fifty')}>
      <span aria-hidden>{f.num(m)}</span>
    </GoldBadge>
  );
}

/** "3W" style badge for three or more wickets. */
export function HaulBadge({ wickets }: { wickets: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  if (!isWicketHaul(wickets)) return null;
  return (
    <GoldBadge label={t('badge.haulLong', { n: f.num(wickets) })}>
      <span aria-hidden>{t('badge.haul', { n: f.num(wickets) })}</span>
    </GoldBadge>
  );
}

/** Marks the Man of the Match. */
export function MomBadge() {
  const { t } = useTranslation();
  return (
    <GoldBadge label={t('mom.title')}>
      <span aria-hidden>🏅 {t('mom.short')}</span>
    </GoldBadge>
  );
}
