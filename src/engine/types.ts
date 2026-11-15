/**
 * Core domain types for the scoring engine.
 *
 * The match is event-sourced: `Match.events` is the single source of truth.
 * Every score, over count and statistic is derived from it (see scoring.ts),
 * so undo is simply "drop the last event".
 */

export type TeamIndex = 0 | 1;

export interface Player {
  id: string;
  name: string;
  /** Short name / nickname used where space is tight. */
  shortName?: string;
  captain?: boolean;
  viceCaptain?: boolean;
}

export interface Team {
  /** Tournament team id (src/data/teams.ts) when picked from the list. */
  teamId?: string;
  name: string;
  players: Player[];
}

export interface MatchSettings {
  /** Overs per innings. */
  overs: number;
  /** Allow the last batter to continue alone after n-1 wickets. */
  lastManStands: boolean;
  /** The delivery after a no-ball is a free hit. */
  freeHit: boolean;
  /** Penalty runs for a wide. */
  wideRuns: number;
  /** Penalty runs for a no-ball. */
  noBallRuns: number;
  /** Max overs a single bowler may bowl; null = no limit. */
  maxOversPerBowler: number | null;
  /**
   * "Six out": a ball hit over the boundary on the full dismisses the striker.
   * No runs, legal delivery, credited to the bowler. Replaces the six.
   */
  sixOut?: boolean;
  /** Played on a short pitch (informational only, no effect on scoring). */
  shortPitch?: boolean;
  /** After a catch, the incoming batter always takes strike (even at the end of an over). */
  catchNewBatterOnStrike?: boolean;
  /** Reviews per team for the whole match; 0 / missing = no reviews. */
  reviewsPerTeam?: number;
  /** A tie is decided by a one-over super over (repeated while tied). */
  superOver?: boolean;
}

export interface Toss {
  winner: TeamIndex;
  decision: 'bat' | 'bowl';
}

export type ExtraType = 'wide' | 'noBall' | 'bye' | 'legBye';

export type DismissalKind =
  'bowled' | 'caught' | 'lbw' | 'runOut' | 'stumped' | 'hitWicket' | 'sixOut' | 'retiredOut';

export type RetireKind = 'retiredHurt' | 'retiredOut';

export interface Wicket {
  kind: Exclude<DismissalKind, 'retiredOut'>;
  /** The batter who is out (striker, or either batter for a run out). */
  batterId: string;
  /** Catcher / thrower / keeper, optional. */
  fielderId?: string;
}

/* ---------------------------------- Events --------------------------------- */

interface EventBase {
  id: string;
  at: number;
}

/** Opens an innings with the two openers and the first bowler. */
export interface InningsStartEvent extends EventBase {
  type: 'inningsStart';
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}

/**
 * One delivery.
 * - `runs` are the runs physically run (or the boundary value).
 *   For no extra / no-ball they go to the batter; for bye / leg-bye they are
 *   byes / leg-byes; for a wide they are extra wides on top of the penalty.
 * - Penalty runs for wide / no-ball come from MatchSettings.
 */
export interface BallEvent extends EventBase {
  type: 'ball';
  runs: number;
  extra: ExtraType | null;
  /** True when `runs` was a boundary (counts as a 4 / 6 for the batter). */
  boundary?: boolean;
  wicket?: Wicket;
}

/** A batter walks in to fill an empty slot. */
export interface NewBatterEvent extends EventBase {
  type: 'newBatter';
  batterId: string;
}

/** A bowler takes over (start of an over, or mid-over replacement). */
export interface NewBowlerEvent extends EventBase {
  type: 'newBowler';
  bowlerId: string;
}

export interface RetireEvent extends EventBase {
  type: 'retire';
  batterId: string;
  kind: RetireKind;
}

/** Manual correction of who is on strike. */
export interface SwapStrikeEvent extends EventBase {
  type: 'swapStrike';
}

/**
 * Runs added to (positive) or taken from (negative) the batting team's
 * total, e.g. -4 when a batter deliberately kicks the ball. Not a delivery.
 */
export interface PenaltyEvent extends EventBase {
  type: 'penalty';
  runs: number;
}

/** A team used a review. A failed review is lost; a successful one is kept. */
export interface ReviewEvent extends EventBase {
  type: 'review';
  team: TeamIndex;
  successful: boolean;
}

/** Manually close the current innings (e.g. abandoned / conceded). */
export interface EndInningsEvent extends EventBase {
  type: 'endInnings';
}

export type MatchEvent =
  | InningsStartEvent
  | BallEvent
  | NewBatterEvent
  | NewBowlerEvent
  | RetireEvent
  | SwapStrikeEvent
  | PenaltyEvent
  | ReviewEvent
  | EndInningsEvent;

/** Distributive Omit so each union member keeps its own fields. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An event before it gets an id / timestamp. */
export type MatchEventInput = DistributiveOmit<MatchEvent, 'id' | 'at'>;

export interface Match {
  id: string;
  createdAt: number;
  updatedAt: number;
  teams: [Team, Team];
  settings: MatchSettings;
  toss: Toss;
  events: MatchEvent[];
  /** Fixture id (src/data/fixtures.ts) when the match was started from the fixture. */
  fixtureId?: string;
}

/* ------------------------------- Derived state ------------------------------ */

export interface Dismissal {
  kind: DismissalKind;
  bowlerId?: string;
  fielderId?: string;
}

export interface BatterStats {
  playerId: string;
  /** Order in which the batter came in (0-based). */
  order: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal: Dismissal | null;
  retiredHurt: boolean;
}

export interface BowlerStats {
  playerId: string;
  /** Order in which the bowler first bowled (0-based). */
  order: number;
  legalBalls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  dots: number;
  /** Wide runs conceded (penalty + extra wides). */
  wides: number;
  /** Number of no-balls. */
  noBalls: number;
}

export interface Extras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  legalBalls: number;
  batterId: string;
}

export interface Partnership {
  batterIds: string[];
  runs: number;
  legalBalls: number;
  /** False while the partnership is still at the crease. */
  ended: boolean;
}

/** Short summary of a delivery for the "this over" strip. */
export interface BallSummary {
  eventId: string;
  runs: number;
  extra: ExtraType | null;
  boundary: boolean;
  wicket: boolean;
  legal: boolean;
  freeHit: boolean;
}

export interface OverSummary {
  number: number; // 1-based
  bowlerId: string;
  balls: BallSummary[];
  runs: number;
}

export type InningsEndReason = 'allOut' | 'oversComplete' | 'targetReached' | 'manual';

export interface InningsState {
  /** 0 and 1 are the main innings; 2+ are super overs (in pairs). */
  index: number;
  superOver: boolean;
  /** Overs available in this innings (1 in a super over). */
  oversLimit: number;
  /** Wickets that end this innings (2 in a super over). */
  wicketsLimit: number;
  /** Net penalty runs included in `runs` (negative for deductions). */
  penaltyRuns: number;
  battingTeam: TeamIndex;
  bowlingTeam: TeamIndex;
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: Extras;
  batters: BatterStats[];
  bowlers: BowlerStats[];
  fallOfWickets: FallOfWicket[];
  partnerships: Partnership[];
  overs: OverSummary[];
  strikerId: string | null;
  nonStrikerId: string | null;
  /** Last batter batting alone (last-man-stands). */
  loneBatter: boolean;
  bowlerId: string | null;
  /** Bowler of the last completed over (cannot bowl the next one). */
  previousOverBowlerId: string | null;
  freeHitNext: boolean;
  target: number | null;
  ended: boolean;
  endReason: InningsEndReason | null;
}

export type Phase =
  | 'needOpeners'
  | 'needBatter'
  | 'needBowler'
  | 'inPlay'
  | 'inningsBreak'
  /** Scores level after a pair of innings: a super over is next. */
  | 'superOverBreak'
  | 'completed';

export type MatchResult =
  | { kind: 'won'; winner: TeamIndex; by: 'runs' | 'wickets'; margin: number }
  /** Decided by a super over; margin is 0. */
  | { kind: 'won'; winner: TeamIndex; by: 'superOver'; margin: 0 }
  | { kind: 'tie' };

export interface ReviewRecord {
  team: TeamIndex;
  successful: boolean;
  inningsIndex: number;
  legalBalls: number;
}

export interface MatchState {
  innings: InningsState[];
  current: InningsState | null;
  phase: Phase;
  result: MatchResult | null;
  /** Reviews left per team, or null when reviews are off. */
  reviewsLeft: [number, number] | null;
  reviews: ReviewRecord[];
}
