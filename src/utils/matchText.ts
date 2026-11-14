import type { TFunction } from 'i18next';
import type { Match, MatchResult } from '../engine/types';
import type { Formatter } from './format';

export function playerName(match: Match, id: string | null | undefined): string {
  if (!id) return '';
  for (const team of match.teams) {
    const p = team.players.find((x) => x.id === id);
    if (p) return p.name;
  }
  return '?';
}

export function resultText(result: MatchResult, match: Match, t: TFunction, f: Formatter): string {
  if (result.kind === 'tie') return t('result.tie');
  const key = result.by === 'runs' ? 'result.wonByRuns' : 'result.wonByWickets';
  return t(key, {
    team: match.teams[result.winner].name,
    n: f.num(result.margin),
    count: result.margin,
  });
}
