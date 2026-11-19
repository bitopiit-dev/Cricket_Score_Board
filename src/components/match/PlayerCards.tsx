import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../common/icons';
import { toast } from '../common/Toast';
import type { Match, MatchState } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { playerName } from '../../utils/matchText';
import { playerMoments, type PlayerMoment } from '../../utils/playerMoments';

/**
 * One tap per standout player (Man of the Match, fifty, hundred, 3+ wickets):
 * draws a 9:16 story card and opens the share sheet, or downloads it.
 */
export function PlayerCards({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const moments = useMemo(() => playerMoments(match, state), [match, state]);
  const [busy, setBusy] = useState<string | null>(null);
  if (moments.length === 0) return null;

  const label = (m: PlayerMoment) =>
    m.kind === 'mom'
      ? t('mom.title')
      : m.kind === 'hundred'
        ? t('playerCard.hundred')
        : m.kind === 'fifty'
          ? t('playerCard.fifty')
          : t('playerCard.haul', { n: f.num(m.bowling?.wickets ?? 0) });

  async function share(m: PlayerMoment) {
    setBusy(m.playerId);
    try {
      const [{ drawPlayerCard }, { shareImage }] = await Promise.all([
        import('../../utils/playerCardImage'),
        import('../../utils/scorecardImage'),
      ]);
      const blob = await drawPlayerCard(match, state, m, t, f);
      const name = `BPL-2027-${playerName(match, m.playerId)}.png`.replace(/[^\w.-]+/g, '-');
      const res = await shareImage(blob, name, `${playerName(match, m.playerId)}: ${label(m)}`);
      if (res === 'downloaded') toast(t('scorecardImage.downloaded'));
      else if (res === 'failed') toast(t('scorecardImage.failed'));
    } catch {
      toast(t('scorecardImage.failed'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="overflow-hidden bg-white shadow-sm sm:rounded-2xl dark:bg-slate-900">
      <h2 className="px-4 pt-3 font-display text-lg font-bold tracking-wide">
        {t('playerCard.title')}
      </h2>
      <p className="px-4 text-sm text-slate-600 dark:text-slate-400">{t('playerCard.hint')}</p>
      <ul className="flex gap-2 overflow-x-auto px-4 pt-2 pb-3">
        {moments.map((m) => (
          <li key={m.playerId} className="shrink-0">
            <button
              type="button"
              onClick={() => void share(m)}
              disabled={busy !== null}
              aria-busy={busy === m.playerId}
              className="flex min-h-11 items-center gap-2 rounded-full bg-slate-100 py-1.5 pr-4 pl-1.5 text-left disabled:opacity-60 dark:bg-slate-800"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-bpl-yellow text-night-950">
                <Icon name="share" className="size-4" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold">{playerName(match, m.playerId)}</span>
                <span className="block text-xs text-slate-600 dark:text-slate-400">{label(m)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
