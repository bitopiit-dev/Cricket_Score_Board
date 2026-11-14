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
  overs: 20,
  lastManStands: false,
  freeHit: true,
  wideRuns: 1,
  noBallRuns: 1,
  maxOversPerBowler: defaultMaxOversPerBowler(20),
};

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

/** Which ways of getting out are possible on this kind of delivery. */
export function allowedDismissals(extra: ExtraType | null, freeHit: boolean): Wicket['kind'][] {
  if (extra === 'noBall' || freeHit) return ['runOut'];
  if (extra === 'wide') return ['runOut', 'stumped'];
  if (extra === 'bye' || extra === 'legBye') return ['runOut'];
  return ['bowled', 'caught', 'lbw', 'runOut', 'stumped', 'hitWicket'];
}

/** Dismissals where only the striker can be out. */
export function strikerOnly(kind: Wicket['kind']): boolean {
  return kind !== 'runOut';
}

export function battingTeamFor(inningsIndex: 0 | 1, toss: Toss): TeamIndex {
  const firstBatting: TeamIndex =
    toss.decision === 'bat' ? toss.winner : ((1 - toss.winner) as TeamIndex);
  return inningsIndex === 0 ? firstBatting : ((1 - firstBatting) as TeamIndex);
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

/** For each bowling-team player, why they can't bowl the next over (or null). */
export function bowlerEligibility(
  innings: InningsState,
  team: Team,
  settings: MatchSettings,
): { playerId: string; blocked: BowlerBlockReason | null }[] {
  return team.players.map((p) => {
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
