import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { watchData } from '../../sync/remoteData';

/**
 * When the admin publishes new fixtures or teams, people with the app open get a
 * tap-to-refresh bar instead of a sudden reload (which could interrupt scoring).
 */
export function DataUpdatedBar() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  useEffect(() => watchData(() => setShow(true)), []);
  if (!show) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-night-950 p-3 text-sm text-white shadow-xl md:bottom-6"
    >
      <span className="flex-1">{t('app.dataUpdated')}</span>
      <button
        type="button"
        onClick={() => location.reload()}
        className="rounded-xl bg-bpl-yellow px-3 py-1.5 font-semibold text-night-950"
      >
        {t('app.refresh')}
      </button>
    </div>
  );
}
