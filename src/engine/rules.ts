import type {
  BallEvent,
  DismissalKind,
  ExtraType,
  InningsState,
  MatchSettings,
  Team,
  TeamIndex,
  Toss,
  Wicket,
} from './types';

export const BALLS_PER_OVER = 6;

export const DEFAULT_SETTINGS: MatchSettings = {
  overs: 12,
  lastManStands: false,
  freeHit: false,
  wideRuns: 1,
  noBallRuns: 1,
  maxOversPerBowler: defaultMaxOversPerBowler(12),
  sixOut: false,
  shortPitch: false,
};

export const DEFAULT_PLAYERS_PER_SIDE = 11;

/** Super over: one over, ends after two wickets. */
export const SUPER_OVER = { overs: 1, wickets: 2 } as const;

/** Runs deducted when a batter deliberately kicks the ball (rule 25). */
export const KICK_PENALTY_RUNS = 4;

/**
 * The user's tournament rules. Each one can be switched on/off separately
 * in match setup; when on, the matching setting is fixed to this value.
 */
export const TOURNAMENT_RULES = {
  overs: 12,
  playersPerSide: 11, // 10 wickets
  shortPitch: true,
  sixOut: true,
  /** No free hit after a no-ball. */
  noFreeHit: true,
  maxOversPerBowler: 3,
  catchNewBatterOnStrike: true,
  reviewsPerTeam: 1,
  superOver: true,
} as const;

export type TournamentRule = keyof typeof TOURNAMENT_RULES;

/** Default bowling quota: one fifth of the overs, rounded up. */
export function defaultMaxOversPerBowler(overs: number): number {
  return Math.max(1, Math.ceil(overs / 5));
}

/** Wides and no-balls are not legal deliveries. */
export function isLegal(extra: ExtraType | null): boolean {
  return extra !== 'wide' && extra !== 'noBall';
}

/** Dismissals that credit the bowler with a wicket. */
export function creditsBowler(kind: DismissalKind): boolean {
  return kind !== 'runOut' && kind !== 'retiredOut';
}

/**
 * Which ways of getting out are possible on this kind of delivery.
 * Six out (when enabled) applies to every legal delivery, free hit included:
 * the tournament rule says a ball over the boundary is always out.
 */
export function allowedDismissals(
  extra: ExtraType | null,
  freeHit: boolean,
  sixOut = false,
): Wicket['kind'][] {
  const six: Wicket['kind'][] = sixOut && extra === null ? ['sixOut'] : [];
  if (extra === 'noBall') return ['runOut'];
  if (freeHit) return ['runOut', ...six];
  if (extra === 'wide') return ['runOut', 'stumped'];
  if (extra === 'bye' || extra === 'legBye') return ['runOut'];
  return ['bowled', 'caught', 'lbw', 'runOut', 'stumped', 'hitWicket', ...six];
}

/** Dismissals where only the striker can be out. */
export function strikerOnly(kind: Wicket['kind']): boolean {
  return kind !== 'runOut';
}

/**
 * Which team bats in innings `index`. Main innings follow the toss. In a
 * super over the team that batted second in the previous pair bats first.
 */
export function battingTeamFor(
  index: number,
  toss: Toss,
  previous: readonly { battingTeam: TeamIndex }[] = [],
): TeamIndex {
  const firstBatting: TeamIndex =
    toss.decision === 'bat' ? toss.winner : ((1 - toss.winner) as TeamIndex);
  if (index === 0) return firstBatting;
  if (index === 1) return (1 - firstBatting) as TeamIndex;
  const prev = previous[index - 1]?.battingTeam ?? ((1 - firstBatting) as TeamIndex);
  return index % 2 === 0 ? prev : ((1 - prev) as TeamIndex);
}

/** Wickets that end the innings. */
export function maxWickets(team: Team, settings: MatchSettings): number {
  const n = team.players.length;
  return settings.lastManStands ? n : n - 1;
}

export interface BallRuns {
  /** Added to the team total. */
  total: number;
  /** Credited to the striker. */
  batter: number;
  /** Charged to the bowler. */
  conceded: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
}

export function ballRuns(
  ball: Pick<BallEvent, 'runs' | 'extra'>,
  settings: MatchSettings,
): BallRuns {
  const r: BallRuns = {
    total: 0,
    batter: 0,
    conceded: 0,
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
  };
  switch (ball.extra) {
    case null:
      r.batter = ball.runs;
      r.conceded = ball.runs;
      break;
    case 'wide':
      r.wides = settings.wideRuns + ball.runs;
      r.conceded = r.wides;
      break;
    case 'noBall':
      r.noBalls = settings.noBallRuns;
      r.batter = ball.runs;
      r.conceded = settings.noBallRuns + ball.runs;
      break;
    case 'bye':
      r.byes = ball.runs;
      break;
    case 'legBye':
      r.legByes = ball.runs;
      break;
  }
  r.total = r.batter + r.wides + r.noBalls + r.byes + r.legByes;
  return r;
}

/** Batters of the batting team who can still come in. */
export function availableBatters(innings: InningsState, team: Team): string[] {
  const atCrease = new Set([innings.strikerId, innings.nonStrikerId]);
  return team.players
    .map((p) => p.id)
    .filter((id) => {
      if (atCrease.has(id)) return false;
      const b = innings.batters.find((x) => x.playerId === id);
      if (!b) return true; // yet to bat
      return b.dismissal === null && b.retiredHurt; // retired hurt may return
    });
}

export type BowlerBlockReason = 'previousOver' | 'quotaUsed';

/**
 * For each bowling-team player, why they can't bowl the next over (or null).
 * If the quota would leave nobody able to bowl (small local teams), the quota
 * is lifted so the match can go on.
 */
export function bowlerEligibility(
  innings: InningsState,
  team: Team,
  settings: MatchSettings,
): { playerId: string; blocked: BowlerBlockReason | null }[] {
  const result = team.players.map((p): { playerId: string; blocked: BowlerBlockReason | null } => {
    if (p.id === innings.previousOverBowlerId) return { playerId: p.id, blocked: 'previousOver' };
    const stats = innings.bowlers.find((b) => b.playerId === p.id);
    if (
      settings.maxOversPerBowler !== null &&
      stats &&
      Math.floor(stats.legalBalls / BALLS_PER_OVER) >= settings.maxOversPerBowler
    ) {
      return { playerId: p.id, blocked: 'quotaUsed' };
    }
    return { playerId: p.id, blocked: null };
  });
  if (result.every((r) => r.blocked !== null)) {
    return result.map((r) => (r.blocked === 'quotaUsed' ? { ...r, blocked: null } : r));
  }
  return result;
}

/** 75 legal balls -> "12.3" */
export function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / BALLS_PER_OVER)}.${legalBalls % BALLS_PER_OVER}`;
}

/** Runs per over; 0 when no balls bowled. */
export function runRate(runs: number, legalBalls: number): number {
  return legalBalls === 0 ? 0 : (runs * BALLS_PER_OVER) / legalBalls;
}

export function strikeRate(runs: number, balls: number): number {
  return balls === 0 ? 0 : (runs * 100) / balls;
}
