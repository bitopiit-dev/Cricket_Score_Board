import { BALLS_PER_OVER, ballRuns } from './rules';
import type { InningsState, MatchSettings } from './types';

export interface OverBar {
  /** 1-based over number. */
  over: number;
  runs: number;
  wickets: number;
}

/** Runs and wickets in each over of an innings, for the Manhattan chart. */
export function overBars(inn: InningsState): OverBar[] {
  return inn.overs.map((o) => ({
    over: o.number,
    runs: o.runs,
    wickets: o.balls.filter((b) => b.wicket).length,
  }));
}

export interface WormPoint {
  /** Overs bowled, as a fraction (3.3 overs = 3.5). */
  x: number;
  runs: number;
  /** A wicket fell on this ball. */
  wicket: boolean;
}

/**
 * The running total after every legal ball and every wicket, for the worm
 * chart. Starts at 0 runs, 0 overs. Wides and no-balls add to the total at
 * the point they happened.
 */
export function wormPoints(inn: InningsState, settings: MatchSettings): WormPoint[] {
  const pts: WormPoint[] = [{ x: 0, runs: 0, wicket: false }];
  let runs = 0;
  let legal = 0;
  for (const o of inn.overs) {
    for (const b of o.balls) {
      runs += ballRuns(b, settings).total;
      if (b.legal) legal += 1;
      const x = legal / BALLS_PER_OVER;
      // Join an extra onto the previous point instead of stacking points at one x
      const last = pts[pts.length - 1];
      if (last.x === x && !b.wicket && !last.wicket) last.runs = runs;
      else pts.push({ x, runs, wicket: b.wicket });
    }
  }
  // Penalty runs are not part of any ball: the last point carries the real total
  pts[pts.length - 1].runs = inn.runs;
  return pts;
}
