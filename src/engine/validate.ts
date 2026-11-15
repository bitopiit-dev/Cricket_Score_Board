import { deriveMatchState } from './scoring';
import type { Match } from './types';

/**
 * True when the data really is a match this app can show. Scores come from
 * other phones and older app versions, so a broken one is skipped rather than
 * allowed to crash every viewer's screen.
 */
export function isUsableMatch(data: unknown, id: string): data is Match {
  if (!data || typeof data !== 'object') return false;
  const m = data as Partial<Match>;
  const teamOk = (t: unknown) =>
    !!t &&
    typeof (t as { name?: unknown }).name === 'string' &&
    Array.isArray((t as { players?: unknown }).players);
  if (
    m.id !== id ||
    !Array.isArray(m.teams) ||
    m.teams.length !== 2 ||
    !m.teams.every(teamOk) ||
    !m.settings ||
    typeof m.settings.overs !== 'number' ||
    !Array.isArray(m.events)
  ) {
    return false;
  }
  try {
    deriveMatchState(m as Match);
    return true;
  } catch {
    return false;
  }
}
