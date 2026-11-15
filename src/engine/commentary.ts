import { BALLS_PER_OVER, ballRuns } from './rules';
import { deriveMatchState } from './scoring';
import type { BallEvent, Match, TeamIndex } from './types';

/** One delivery as it happened, for the ball-by-ball list. */
export interface CommentaryBall {
  eventId: string;
  inningsIndex: number;
  superOver: boolean;
  battingTeam: TeamIndex;
  /** 1-based over number. */
  over: number;
  /** Ball within the over as shown ("3.4" → 4); an extra shares the next legal ball's number. */
  ball: number;
  bowlerId: string;
  batterId: string;
  event: BallEvent;
  /** Runs added to the total by this delivery. */
  total: number;
  /** Team score after the delivery. */
  score: { runs: number; wickets: number };
}

/**
 * Every delivery of the match with who bowled it, who faced it and the score
 * after it, oldest first. Worked out by replaying the events, so it always
 * agrees with the scorecard (including undo).
 */
export function buildCommentary(match: Match): CommentaryBall[] {
  const out: CommentaryBall[] = [];
  match.events.forEach((ev, i) => {
    if (ev.type !== 'ball') return;
    const before = deriveMatchState({ ...match, events: match.events.slice(0, i) }).current;
    const after = deriveMatchState({ ...match, events: match.events.slice(0, i + 1) });
    if (!before || !before.bowlerId || !before.strikerId) return;
    const inn = after.innings[before.index] ?? before;
    const legalBefore = before.legalBalls;
    out.push({
      eventId: ev.id,
      inningsIndex: before.index,
      superOver: before.superOver,
      battingTeam: before.battingTeam,
      over: Math.floor(legalBefore / BALLS_PER_OVER) + 1,
      ball: (legalBefore % BALLS_PER_OVER) + 1,
      bowlerId: before.bowlerId,
      batterId: before.strikerId,
      event: ev,
      total: ballRuns(ev, match.settings).total,
      score: { runs: inn.runs, wickets: inn.wickets },
    });
  });
  return out;
}
