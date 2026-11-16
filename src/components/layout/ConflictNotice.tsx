import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MATCH_CONFLICT } from '../../sync/matchSync';

/**
 * Tells the scorer when the server refused this phone's copy of a match because
 * another phone had already changed it. The server's score is kept; this
 * phone's copy is saved on the phone as a backup.
 */
export function ConflictNotice() {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const on = () => setShown(true);
    window.addEventListener(MATCH_CONFLICT, on);
    return () => window.removeEventListener(MATCH_CONFLICT, on);
  }, []);
  if (!shown) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-amber-400 p-4 text-amber-950 shadow-xl"
    >
      <p className="flex-1 text-sm leading-snug">
        <span className="block font-bold">{t('conflict.title')}</span>
        {t('conflict.body')}
      </p>
      <button
        type="button"
        onClick={() => setShown(false)}
        aria-label={t('common.close')}
        className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-xl hover:bg-amber-300"
      >
        ×
      </button>
    </div>
  );
}
