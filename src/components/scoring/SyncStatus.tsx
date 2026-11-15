import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isQueued, QUEUE_CHANGED } from '../../sync/matchSync';
import { supabase } from '../../sync/supabase';

type Status = 'synced' | 'pending' | 'offline';

function current(matchId: string): Status {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  return isQueued(matchId) ? 'pending' : 'synced';
}

/**
 * Scorer's header: whether the people following can see the latest ball.
 * Green = uploaded, amber = waiting to upload, grey = no signal (balls are
 * safe on the phone and go up when the signal is back).
 */
export function SyncStatus({ matchId }: { matchId: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>(() => current(matchId));

  useEffect(() => {
    const update = () => setStatus(current(matchId));
    window.addEventListener(QUEUE_CHANGED, update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const timer = setInterval(update, 5000); // backstop
    return () => {
      window.removeEventListener(QUEUE_CHANGED, update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      clearInterval(timer);
    };
  }, [matchId]);

  if (!supabase) return null; // no server: nothing to sync
  const style = {
    synced: 'bg-emerald-500/15 text-emerald-300',
    pending: 'bg-amber-400/20 text-amber-300',
    offline: 'bg-white/10 text-night-muted',
  }[status];
  const dot = {
    synced: 'bg-emerald-400',
    pending: 'animate-pulse bg-amber-400 motion-reduce:animate-none',
    offline: 'bg-night-muted',
  }[status];

  return (
    <span
      role="status"
      title={t(`sync.${status}Long`)}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${style}`}
    >
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {t(`sync.${status}`)}
    </span>
  );
}
