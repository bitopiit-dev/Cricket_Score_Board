import { useTranslation } from 'react-i18next';
import { toast } from '../components/common/Toast';
import type { Match, MatchState } from '../engine/types';
import { matchShareText, shareText } from '../utils/share';
import { useFormat } from './useFormat';

/**
 * One-tap "Share score": the phone's share sheet where there is one,
 * otherwise the WhatsApp-ready text goes to the clipboard with a toast.
 */
export function useShareMatch() {
  const { t } = useTranslation();
  const f = useFormat();
  return async (match: Match, state: MatchState) => {
    const title = `${match.teams[0].name} ${t('common.vs')} ${match.teams[1].name}`;
    const url = window.location.href.split('#')[0] + `#/match/${match.id}`;
    const res = await shareText(title, matchShareText(match, state, t, f), url);
    if (res === 'copied') toast(t('share.copied'));
    else if (res === 'failed') toast(t('share.failed'));
  };
}
