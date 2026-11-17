import type { TFunction } from 'i18next';
import { creditsBowler } from '../engine/rules';
import type { BatterStats, InningsState, Match, MatchResult } from '../engine/types';
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

/** How a batter's innings ended: "ক্যাচ (X) · বোলার Y", "নট আউট", "ব্যাটিং করছেন"… */
export function dismissalText(
  b: BatterStats,
  match: Match,
  inn: InningsState,
  t: TFunction,
): string {
  if (!b.dismissal) {
    if (b.retiredHurt) return t('dismissal.retiredHurt');
    return inn.ended ? t('dismissal.notOut') : t('matchCenter.batting');
  }
  const d = b.dismissal;
  const parts = [t(`dismissal.${d.kind}`)];
  if (d.fielderId) parts[0] += ` (${playerName(match, d.fielderId)})`;
  if (d.bowlerId && creditsBowler(d.kind)) {
    parts.push(t('matchCenter.bowledBy', { name: playerName(match, d.bowlerId) }));
  }
  return parts.join(' · ');
}

/** Over-by-over rows for the record: runs and wickets in the over, and the score after it. */
export function overRows(inn: InningsState) {
  let runs = 0;
  let wickets = 0;
  return inn.overs.map((o) => {
    const w = o.balls.filter((b) => b.wicket).length;
    runs += o.runs;
    wickets += w;
    return {
      number: o.number,
      bowlerId: o.bowlerId,
      runs: o.runs,
      wickets: w,
      score: runs,
      fallen: wickets,
    };
  });
}

/** File name the browser suggests when saving the report as PDF (Latin letters only). */
export function reportFileName(match: Match, fixtureNo?: number): string {
  const clean = (s: string) =>
    s
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const no = fixtureNo ? `Match ${String(fixtureNo).padStart(2, '0')} - ` : '';
  return clean(`BPL-2027 ${no}${match.teams[0].name} vs ${match.teams[1].name}`);
}
