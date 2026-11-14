import { useMemo } from 'react';
import { usePrefs } from '../store/prefsStore';
import { makeFormatter, type Formatter } from '../utils/format';

/** Number formatter that follows the language / digit preference. */
export function useFormat(): Formatter {
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  return useMemo(() => makeFormatter(lang === 'bn' && bengaliDigits), [lang, bengaliDigits]);
}
