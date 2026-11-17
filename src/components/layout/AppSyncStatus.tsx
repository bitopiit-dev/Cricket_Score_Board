import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { appSyncStatus, QUEUE_CHANGED, SYNC_CHANGED, type AppSync } from '../../sync/matchSync';

const DOT: Record<AppSync, string> = {
  synced: 'bg-bpl-green',
  pending: 'animate-pulse bg-bpl-yellow motion-reduce:animate-none',
  connecting: 'animate-pulse bg-night-muted motion-reduce:animate-none',
  offline: 'bg-bpl-red',
  local: 'bg-night-muted',
};

/**
 * Header: whether what this device shows is what everyone sees.
 * Green = synced, amber = this device still has changes to upload,
 * red = no connection (showing the last saved copy).
 */
export function AppSyncStatus() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AppSync>(appSyncStatus);

  useEffect(() => {
    const update = () => setStatus(appSyncStatus());
    const events = [SYNC_CHANGED, QUEUE_CHANGED, 'online', 'offline'];
    events.forEach((e) => window.addEventListener(e, update));
    const timer = setInterval(update, 5000); // backstop
    return () => {
      events.forEach((e) => window.removeEventListener(e, update));
      clearInterval(timer);
    };
  }, []);

  return (
    <span
      role="status"
      title={t(`app.sync.${status}Long`)}
      className="hidden items-center gap-1.5 text-xs whitespace-nowrap text-night-muted sm:flex"
    >
      <span aria-hidden className={`size-2 rounded-full ${DOT[status]}`} />
      {t(`app.sync.${status}`)}
    </span>
  );
}
