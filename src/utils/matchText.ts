import type { TFunction } from 'i18next';
import type { InningsState, Match, MatchResult } from '../engine/types';
import type { Formatter } from './format';

export function playerName(match: Match, id: string | null | undefined): string {
  if (!id) return '';
  for (const team of match.teams) {
    const p = team.players.find((x) => x.id === id);
    if (p) return (p.shortName ?? p.name) + captainMark(p);
  }
  return '?';
}

export function resultText(result: MatchResult, match: Match, t: TFunction, f: Formatter): string {
  if (result.kind === 'tie') return t('result.tie');
  if (result.by === 'superOver') {
    return t('result.wonSuperOver', { team: match.teams[result.winner].name });
  }
  const key = result.by === 'runs' ? 'result.wonByRuns' : 'result.wonByWickets';
  return t(key, {
    team: match.teams[result.winner].name,
    n: f.num(result.margin),
    count: result.margin,
  });
}

/** "Innings 2", or "Super Over" / "Super Over 2" for the tie-breakers. */
export function inningsLabel(inn: InningsState, t: TFunction, f: Formatter): string {
  if (!inn.superOver) return t('scoring.inningsN', { n: f.num(inn.index + 1) });
  const n = Math.floor(inn.index / 2);
  return n === 1 ? t('scoring.superOver') : t('scoring.superOverN', { n: f.num(n) });
}

/** " (C)" / " (VC)" after a captain's or vice-captain's name. */
export function captainMark(p: { captain?: boolean; viceCaptain?: boolean }): string {
  return p.captain ? ' (C)' : p.viceCaptain ? ' (VC)' : '';
}
