import { addEvent, deriveMatchState, undoLastEvent } from '../scoring';
import { DEFAULT_SETTINGS } from '../rules';
import type { BallEvent, Match, MatchEventInput, MatchSettings, Wicket } from '../types';

/**
 * Test harness: team A players a1..aN, team B players b1..bN.
 * Toss: A wins and bats, so A bats first.
 */
export function makeMatch(players = 11, settings: Partial<MatchSettings> = {}): Match {
  const team = (prefix: string, name: string) => ({
    name,
    players: Array.from({ length: players }, (_, i) => ({
      id: `${prefix}${i + 1}`,
      name: `${prefix.toUpperCase()}${i + 1}`,
    })),
  });
  return {
    id: 'm1',
    createdAt: 0,
    updatedAt: 0,
    teams: [team('a', 'Team A'), team('b', 'Team B')],
    settings: { ...DEFAULT_SETTINGS, ...settings },
    toss: { winner: 0, decision: 'bat' },
    events: [],
  };
}

export class Game {
  match: Match;
  private seq = 0;

  constructor(match: Match) {
    this.match = match;
  }

  get state() {
    return deriveMatchState(this.match);
  }

  get inn() {
    return this.state.current!;
  }

  /** Applies an event and throws if it is rejected. */
  do(input: MatchEventInput): this {
    const res = addEvent(this.match, input, { id: `e${++this.seq}`, at: this.seq });
    if ('error' in res) throw new Error(`${input.type} rejected: ${res.error}`);
    this.match = res.match;
    return this;
  }

  /** Returns the validation error for an event without applying it. */
  tryDo(input: MatchEventInput): string | null {
    const res = addEvent(this.match, input, { id: `e${++this.seq}`, at: this.seq });
    if ('error' in res) return res.error;
    this.match = res.match;
    return null;
  }

  start(striker: string, nonStriker: string, bowler: string) {
    return this.do({
      type: 'inningsStart',
      strikerId: striker,
      nonStrikerId: nonStriker,
      bowlerId: bowler,
    });
  }

  ball(runs: number, opts: Partial<Omit<BallEvent, 'id' | 'at' | 'type' | 'runs'>> = {}) {
    return this.do({ type: 'ball', runs, extra: null, ...opts });
  }

  /** Several plain deliveries. */
  balls(...runs: number[]) {
    runs.forEach((r) => this.ball(r, r === 4 || r === 6 ? { boundary: true } : {}));
    return this;
  }

  wide(runs = 0) {
    return this.ball(runs, { extra: 'wide' });
  }

  noBall(runs = 0) {
    return this.ball(runs, { extra: 'noBall' });
  }

  out(kind: Wicket['kind'], batterId?: string, runs = 0) {
    return this.ball(runs, { wicket: { kind, batterId: batterId ?? this.inn.strikerId! } });
  }

  batter(id: string) {
    return this.do({ type: 'newBatter', batterId: id });
  }

  bowler(id: string) {
    return this.do({ type: 'newBowler', bowlerId: id });
  }

  undo() {
    this.match = undoLastEvent(this.match, ++this.seq);
    return this;
  }
}
