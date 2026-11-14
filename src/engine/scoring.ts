import {
  BALLS_PER_OVER,
  SUPER_OVER,
  allowedDismissals,
  availableBatters,
  ballRuns,
  battingTeamFor,
  bowlerEligibility,
  creditsBowler,
  isLegal,
  maxWickets,
  strikerOnly,
} from './rules';
import { computeResult } from './result';
import type {
  BallEvent,
  BatterStats,
  BowlerStats,
  InningsState,
  Match,
  MatchEvent,
  MatchEventInput,
  MatchState,
  Phase,
  ReviewRecord,
  RetireEvent,
  TeamIndex,
} from './types';

/** Per-over bookkeeping that is not part of the public state. */
interface OverContext {
  conceded: number;
  bowlerChanged: boolean;
}

/**
 * Replays every event of the match and returns the derived state.
 * Pure function: same events in, same state out.
 */
export function deriveMatchState(match: Match): MatchState {
  const innings: InningsState[] = [];
  let cur: InningsState | null = null;
  let over: OverContext = { conceded: 0, bowlerChanged: false };
  const perTeam = match.settings.reviewsPerTeam ?? 0;
  const reviewsLeft: [number, number] | null = perTeam > 0 ? [perTeam, perTeam] : null;
  const reviews: ReviewRecord[] = [];

  for (const ev of match.events) {
    if (ev.type === 'inningsStart') {
      if (cur && !cur.ended) continue;
      cur = createInnings(innings.length, match, innings);
      innings.push(cur);
      addBatter(cur, ev.strikerId);
      addBatter(cur, ev.nonStrikerId);
      cur.strikerId = ev.strikerId;
      cur.nonStrikerId = ev.nonStrikerId;
      startPartnership(cur);
      setBowler(cur, ev.bowlerId);
      cur.overs.push({ number: 1, bowlerId: ev.bowlerId, balls: [], runs: 0 });
      over = { conceded: 0, bowlerChanged: false };
      continue;
    }
    if (!cur || cur.ended) continue;

    switch (ev.type) {
      case 'ball':
        applyBall(cur, ev, match, over);
        break;
      case 'newBatter':
        addBatter(cur, ev.batterId);
        if (cur.strikerId === null) cur.strikerId = ev.batterId;
        else cur.nonStrikerId = ev.batterId;
        startPartnership(cur);
        break;
      case 'newBowler':
        if (cur.bowlerId === null) {
          cur.overs.push({
            number: cur.overs.length + 1,
            bowlerId: ev.bowlerId,
            balls: [],
            runs: 0,
          });
          over = { conceded: 0, bowlerChanged: false };
        } else {
          over.bowlerChanged = true;
        }
        setBowler(cur, ev.bowlerId);
        break;
      case 'retire':
        applyRetire(cur, ev, match);
        break;
      case 'swapStrike':
        swapEnds(cur);
        break;
      case 'penalty':
        cur.runs += ev.runs;
        cur.penaltyRuns += ev.runs;
        break;
      case 'review':
        reviews.push({
          team: ev.team,
          successful: ev.successful,
          inningsIndex: cur.index,
          legalBalls: cur.legalBalls,
        });
        if (reviewsLeft && !ev.successful) {
          reviewsLeft[ev.team] = Math.max(0, reviewsLeft[ev.team] - 1);
        }
        break;
      case 'endInnings':
        cur.ended = true;
        cur.endReason = 'manual';
        break;
    }
    checkInningsEnd(cur, match);
  }

  const phase = computePhase(innings, match);
  const result = phase === 'completed' ? computeResult(innings) : null;

  return { innings, current: cur, phase, result, reviewsLeft, reviews };
}

function createInnings(index: number, match: Match, previous: InningsState[]): InningsState {
  const battingTeam = battingTeamFor(index, match.toss, previous);
  const superOver = index >= 2;
  const allOut = maxWickets(match.teams[battingTeam], match.settings);
  // The second innings of each pair chases the first.
  const chasing = index % 2 === 1 ? previous[index - 1] : undefined;
  return {
    index,
    superOver,
    oversLimit: superOver ? SUPER_OVER.overs : match.settings.overs,
    wicketsLimit: superOver ? Math.min(SUPER_OVER.wickets, allOut) : allOut,
    penaltyRuns: 0,
    battingTeam,
    bowlingTeam: battingTeam === 0 ? 1 : 0,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    batters: [],
    bowlers: [],
    fallOfWickets: [],
    partnerships: [],
    overs: [],
    strikerId: null,
    nonStrikerId: null,
    loneBatter: false,
    bowlerId: null,
    previousOverBowlerId: null,
    freeHitNext: false,
    target: chasing ? chasing.runs + 1 : null,
    ended: false,
    endReason: null,
  };
}

function addBatter(inn: InningsState, playerId: string): BatterStats {
  const existing = inn.batters.find((b) => b.playerId === playerId);
  if (existing) {
    existing.retiredHurt = false; // returning after retiring hurt
    return existing;
  }
  const stats: BatterStats = {
    playerId,
    order: inn.batters.length,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissal: null,
    retiredHurt: false,
  };
  inn.batters.push(stats);
  return stats;
}

function setBowler(inn: InningsState, playerId: string): BowlerStats {
  inn.bowlerId = playerId;
  let stats = inn.bowlers.find((b) => b.playerId === playerId);
  if (!stats) {
    stats = {
      playerId,
      order: inn.bowlers.length,
      legalBalls: 0,
      runsConceded: 0,
      wickets: 0,
      maidens: 0,
      dots: 0,
      wides: 0,
      noBalls: 0,
    };
    inn.bowlers.push(stats);
  }
  return stats;
}

function batter(inn: InningsState, id: string): BatterStats {
  return inn.batters.find((b) => b.playerId === id)!;
}

function startPartnership(inn: InningsState) {
  if (inn.strikerId && inn.nonStrikerId) {
    inn.partnerships.push({
      batterIds: [inn.strikerId, inn.nonStrikerId],
      runs: 0,
      legalBalls: 0,
      ended: false,
    });
  }
}

function currentPartnership(inn: InningsState) {
  const p = inn.partnerships[inn.partnerships.length - 1];
  return p && !p.ended ? p : undefined;
}

function swapEnds(inn: InningsState) {
  if (inn.loneBatter) return;
  [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
}

function vacate(inn: InningsState, playerId: string) {
  if (inn.strikerId === playerId) inn.strikerId = null;
  else if (inn.nonStrikerId === playerId) inn.nonStrikerId = null;
  const p = currentPartnership(inn);
  if (p) p.ended = true;
}

/** Last-man-stands: when nobody is left to come in, the survivor bats alone. */
function handleVacancy(inn: InningsState, match: Match) {
  if (!match.settings.lastManStands || inn.superOver) return;
  const survivors = [inn.strikerId, inn.nonStrikerId].filter((x): x is string => x !== null);
  if (survivors.length !== 1) return;
  if (availableBatters(inn, match.teams[inn.battingTeam]).length > 0) return;
  inn.loneBatter = true;
  inn.strikerId = survivors[0];
  inn.nonStrikerId = null;
}

function applyBall(inn: InningsState, ev: BallEvent, match: Match, over: OverContext) {
  const { settings } = match;
  const legal = isLegal(ev.extra);
  const freeHit = inn.freeHitNext;
  const r = ballRuns(ev, settings);
  const striker = batter(inn, inn.strikerId!);
  const bowler = inn.bowlers.find((b) => b.playerId === inn.bowlerId)!;
  const currentOver = inn.overs[inn.overs.length - 1];

  // Team
  inn.runs += r.total;
  inn.extras.wides += r.wides;
  inn.extras.noBalls += r.noBalls;
  inn.extras.byes += r.byes;
  inn.extras.legByes += r.legByes;
  if (legal) inn.legalBalls += 1;

  // Striker (a no-ball counts as a ball faced, a wide does not)
  if (ev.extra !== 'wide') striker.balls += 1;
  striker.runs += r.batter;
  if (ev.boundary && (ev.extra === null || ev.extra === 'noBall')) {
    if (ev.runs === 4) striker.fours += 1;
    if (ev.runs === 6) striker.sixes += 1;
  }

  // Bowler
  bowler.runsConceded += r.conceded;
  bowler.wides += r.wides;
  if (ev.extra === 'noBall') bowler.noBalls += 1;
  if (legal) {
    bowler.legalBalls += 1;
    if (r.conceded === 0) bowler.dots += 1;
  }

  // Partnership & over
  const p = currentPartnership(inn);
  if (p) {
    p.runs += r.total;
    if (legal) p.legalBalls += 1;
  }
  currentOver.runs += r.total;
  currentOver.balls.push({
    eventId: ev.id,
    runs: ev.runs,
    extra: ev.extra,
    boundary: !!ev.boundary,
    wicket: !!ev.wicket,
    legal,
    freeHit,
  });
  over.conceded += r.conceded;

  inn.freeHitNext = settings.freeHit && (ev.extra === 'noBall' || (freeHit && !legal));

  // Strike rotates on odd runs physically run
  if (ev.runs % 2 === 1) swapEnds(inn);

  // Wicket
  if (ev.wicket) {
    const out = batter(inn, ev.wicket.batterId);
    const credit = creditsBowler(ev.wicket.kind);
    out.dismissal = {
      kind: ev.wicket.kind,
      bowlerId: credit ? bowler.playerId : undefined,
      fielderId: ev.wicket.fielderId,
    };
    inn.wickets += 1;
    if (credit) bowler.wickets += 1;
    inn.fallOfWickets.push({
      wicketNumber: inn.wickets,
      score: inn.runs,
      legalBalls: inn.legalBalls,
      batterId: out.playerId,
    });
    vacate(inn, out.playerId);
    handleVacancy(inn, match);
  }

  // End of over
  const legalInOver = currentOver.balls.filter((b) => b.legal).length;
  if (legal && legalInOver === BALLS_PER_OVER) {
    if (over.conceded === 0 && !over.bowlerChanged) bowler.maidens += 1;
    inn.previousOverBowlerId = bowler.playerId;
    inn.bowlerId = null;
    swapEnds(inn);
  }

  // Tournament rule: after a catch the incoming batter takes strike,
  // whatever the runs or the end of the over did to the ends.
  if (
    ev.wicket?.kind === 'caught' &&
    settings.catchNewBatterOnStrike &&
    inn.strikerId !== null &&
    inn.nonStrikerId === null &&
    !inn.loneBatter
  ) {
    inn.nonStrikerId = inn.strikerId;
    inn.strikerId = null;
  }
}

function applyRetire(inn: InningsState, ev: RetireEvent, match: Match) {
  const b = batter(inn, ev.batterId);
  if (ev.kind === 'retiredHurt') {
    b.retiredHurt = true;
  } else {
    b.dismissal = { kind: 'retiredOut' };
    inn.wickets += 1;
    inn.fallOfWickets.push({
      wicketNumber: inn.wickets,
      score: inn.runs,
      legalBalls: inn.legalBalls,
      batterId: b.playerId,
    });
  }
  vacate(inn, b.playerId);
  handleVacancy(inn, match);
}

function checkInningsEnd(inn: InningsState, match: Match) {
  if (inn.ended) return;
  const team = match.teams[inn.battingTeam];
  const vacant = inn.strikerId === null || (inn.nonStrikerId === null && !inn.loneBatter);
  let reason: InningsState['endReason'] = null;

  if (inn.target !== null && inn.runs >= inn.target) reason = 'targetReached';
  else if (inn.wickets >= inn.wicketsLimit) reason = 'allOut';
  else if (vacant && availableBatters(inn, team).length === 0) reason = 'allOut';
  else if (inn.legalBalls >= inn.oversLimit * BALLS_PER_OVER) reason = 'oversComplete';

  if (reason) {
    inn.ended = true;
    inn.endReason = reason;
  }
}

function computePhase(innings: InningsState[], match: Match): Phase {
  const cur = innings[innings.length - 1];
  if (!cur) return 'needOpeners';
  if (cur.ended) {
    if (cur.index % 2 === 0) return 'inningsBreak';
    const tied = cur.runs === innings[cur.index - 1].runs;
    return tied && match.settings.superOver ? 'superOverBreak' : 'completed';
  }
  if (cur.strikerId === null || (cur.nonStrikerId === null && !cur.loneBatter)) return 'needBatter';
  if (cur.bowlerId === null) return 'needBowler';
  return 'inPlay';
}

/* -------------------------------- Validation ------------------------------- */

export type ValidationError =
  | 'wrongPhase'
  | 'samePlayer'
  | 'notInTeam'
  | 'invalidRuns'
  | 'invalidBoundary'
  | 'dismissalNotAllowed'
  | 'batterNotAtCrease'
  | 'batterNotAvailable'
  | 'bowlerNotEligible'
  | 'reviewsOff'
  | 'noReviewLeft';

/** Returns why `input` cannot be applied in `state`, or null if it can. */
export function validateEvent(
  match: Match,
  state: MatchState,
  input: MatchEventInput,
): ValidationError | null {
  const { phase, current: inn } = state;
  const inTeam = (team: number, id: string) => match.teams[team].players.some((p) => p.id === id);

  switch (input.type) {
    case 'inningsStart': {
      if (phase !== 'needOpeners' && phase !== 'inningsBreak' && phase !== 'superOverBreak') {
        return 'wrongPhase';
      }
      const bat = battingTeamFor(state.innings.length, match.toss, state.innings);
      if (input.strikerId === input.nonStrikerId) return 'samePlayer';
      if (!inTeam(bat, input.strikerId) || !inTeam(bat, input.nonStrikerId)) return 'notInTeam';
      if (!inTeam(1 - bat, input.bowlerId)) return 'notInTeam';
      return null;
    }
    case 'ball': {
      if (phase !== 'inPlay' || !inn) return 'wrongPhase';
      if (!Number.isInteger(input.runs) || input.runs < 0 || input.runs > 10) return 'invalidRuns';
      if (input.boundary && input.runs !== 4 && input.runs !== 6) return 'invalidBoundary';
      // With six out on, a six is not possible: it is recorded as a dismissal.
      if (match.settings.sixOut && input.boundary && input.runs === 6) return 'invalidBoundary';
      if (input.wicket) {
        const w = input.wicket;
        if (
          !allowedDismissals(input.extra, inn.freeHitNext, match.settings.sixOut).includes(w.kind)
        ) {
          return 'dismissalNotAllowed';
        }
        if (w.kind === 'sixOut' && input.runs !== 0) return 'invalidRuns';
        if (w.batterId !== inn.strikerId && w.batterId !== inn.nonStrikerId) {
          return 'batterNotAtCrease';
        }
        if (strikerOnly(w.kind) && w.batterId !== inn.strikerId) return 'batterNotAtCrease';
        if (w.fielderId && !inTeam(inn.bowlingTeam, w.fielderId)) return 'notInTeam';
      }
      return null;
    }
    case 'newBatter':
      if (phase !== 'needBatter' || !inn) return 'wrongPhase';
      if (!availableBatters(inn, match.teams[inn.battingTeam]).includes(input.batterId)) {
        return 'batterNotAvailable';
      }
      return null;
    case 'newBowler': {
      if ((phase !== 'needBowler' && phase !== 'inPlay') || !inn) return 'wrongPhase';
      if (input.bowlerId === inn.bowlerId) return 'bowlerNotEligible';
      const e = bowlerEligibility(inn, match.teams[inn.bowlingTeam], match.settings).find(
        (x) => x.playerId === input.bowlerId,
      );
      if (!e) return 'notInTeam';
      if (e.blocked) return 'bowlerNotEligible';
      return null;
    }
    case 'retire':
      if ((phase !== 'inPlay' && phase !== 'needBowler') || !inn) return 'wrongPhase';
      if (input.batterId !== inn.strikerId && input.batterId !== inn.nonStrikerId) {
        return 'batterNotAtCrease';
      }
      return null;
    case 'swapStrike':
      if ((phase !== 'inPlay' && phase !== 'needBowler') || !inn || inn.loneBatter) {
        return 'wrongPhase';
      }
      return null;
    case 'penalty':
      if (!duringInnings(phase) || !inn) return 'wrongPhase';
      if (!Number.isInteger(input.runs) || input.runs === 0 || Math.abs(input.runs) > 10) {
        return 'invalidRuns';
      }
      return null;
    case 'review': {
      if (!state.reviewsLeft) return 'reviewsOff';
      if (!duringInnings(phase) || !inn) return 'wrongPhase';
      if (input.team !== 0 && input.team !== 1) return 'notInTeam';
      if (state.reviewsLeft[input.team as TeamIndex] <= 0) return 'noReviewLeft';
      return null;
    }
    case 'endInnings':
      if (!duringInnings(phase)) return 'wrongPhase';
      return null;
  }
}

function duringInnings(phase: Phase): boolean {
  return phase === 'inPlay' || phase === 'needBowler' || phase === 'needBatter';
}

/** Appends an event if it is valid. Returns the new match or the error. */
export function addEvent(
  match: Match,
  input: MatchEventInput,
  meta: { id: string; at: number },
): { match: Match } | { error: ValidationError } {
  const error = validateEvent(match, deriveMatchState(match), input);
  if (error) return { error };
  const event = { ...input, ...meta } as MatchEvent;
  return { match: { ...match, events: [...match.events, event], updatedAt: meta.at } };
}

/** Removes the most recent event. */
export function undoLastEvent(match: Match, at: number): Match {
  if (match.events.length === 0) return match;
  return { ...match, events: match.events.slice(0, -1), updatedAt: at };
}
