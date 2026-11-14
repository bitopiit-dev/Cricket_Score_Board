/**
 * Tournament format (rule 3, official fixture): Group A and Group B, then the
 * Super Six (points start again), then semi-finals and the final.
 * The match list itself is in src/data/fixtures.ts.
 */

/** League points. Editable later by the admin. */
export const LEAGUE_POINTS = { win: 2, tie: 1, noResult: 1, loss: 0 } as const;

/** How many teams go through from each league stage. */
export const QUALIFIERS = { group: 3, superSix: 4 } as const;
