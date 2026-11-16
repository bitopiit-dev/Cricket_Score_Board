import type { TFunction } from 'i18next';
import type { Match, MatchState } from '../engine/types';
import type { Formatter } from './format';
import { resultText } from './matchText';

/** A short score message for WhatsApp, Messenger or SMS. */
export function matchShareText(
  match: Match,
  state: MatchState,
  t: TFunction,
  f: Formatter,
): string {
  const [a, b] = match.teams;
  const lines = [`🏏 BPL-2027: ${a.name} ${t('common.vs')} ${b.name}`];
  for (const inn of state.innings) {
    lines.push(
      `${inn.superOver ? `${t('scoring.superOver')} · ` : ''}${match.teams[inn.battingTeam].name}: ${f.num(inn.runs)}/${f.num(inn.wickets)} (${f.overs(inn.legalBalls)})`,
    );
  }
  if (state.phase === 'completed' && state.result)
    lines.push(resultText(state.result, match, t, f));
  else if (match.events.length === 0) lines.push(t('home.notStarted'));
  else lines.push(`🔴 ${t('homePage.live')}`);
  return lines.join('\n');
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * Opens the phone's share sheet. Where there is none (most desktops), copies
 * the message and link to the clipboard; failing that, opens WhatsApp.
 */
export async function shareText(title: string, text: string, url: string): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (e) {
      // Closing the share sheet is not an error
      if ((e as Error).name === 'AbortError') return 'shared';
    }
  }
  const full = `${text}\n${url}`;
  try {
    await navigator.clipboard.writeText(full);
    return 'copied';
  } catch {
    // No clipboard (old browser or not allowed): fall through to WhatsApp
  }
  const w = window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank');
  return w ? 'shared' : 'failed';
}
