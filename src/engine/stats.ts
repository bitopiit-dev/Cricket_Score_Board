import { BALLS_PER_OVER } from './rules';
import type { BowlerStats, Extras, InningsState, Match, Partnership } from './types';

export function extrasTotal(e: Extras): number {
  return e.wides + e.noBalls + e.byes + e.legByes;
}

/** Runs conceded per over. */
export function economy(b: BowlerStats): number {
  return b.legalBalls === 0 ? 0 : (b.runsConceded * BALLS_PER_OVER) / b.legalBalls;
}

export function ballsRemaining(inn: InningsState, match: Match): number {
  return Math.max(0, match.settings.overs * BALLS_PER_OVER - inn.legalBalls);
}

/** Runs still needed in a chase, or null in the first innings. */
export function runsNeeded(inn: InningsState): number | null {
  return inn.target === null ? null : Math.max(0, inn.target - inn.runs);
}

export function requiredRunRate(inn: InningsState, match: Match): number | null {
  const need = runsNeeded(inn);
  if (need === null) return null;
  const balls = ballsRemaining(inn, match);
  return balls === 0 ? null : (need * BALLS_PER_OVER) / balls;
}

export function currentPartnership(inn: InningsState): Partnership | null {
  const p = inn.partnerships[inn.partnerships.length - 1];
  return p && !p.ended ? p : null;
}

/** Players of the batting team who have not batted yet. */
export function didNotBat(inn: InningsState, match: Match): string[] {
  const batted = new Set(inn.batters.map((b) => b.playerId));
  return match.teams[inn.battingTeam].players.map((p) => p.id).filter((id) => !batted.has(id));
}

/** Legal balls bowled in the current (latest) over. */
export function legalBallsInCurrentOver(inn: InningsState): number {
  const over = inn.overs[inn.overs.length - 1];
  return over ? over.balls.filter((b) => b.legal).length : 0;
}
