import Dexie, { type EntityTable } from 'dexie';
import { migrateFixtureLink } from '../data/fixtures';
import { migrateTeamIds } from '../data/teams';
import type { Match } from '../engine/types';

/**
 * IndexedDB database. A match is stored as one row with its events inline:
 * a local match is a few hundred events at most, and saving the whole row
 * after each ball keeps writes atomic.
 */
export class ScoreBoardDB extends Dexie {
  matches!: EntityTable<Match, 'id'>;

  constructor(name = 'cricket-score-board') {
    super(name);
    this.version(1).stores({
      matches: 'id, updatedAt',
    });
    // v2: renamed teams (e.g. IE Warrior -> Engineer Warriors) get their new id and name.
    this.version(2)
      .stores({ matches: 'id, updatedAt' })
      .upgrade((tx) =>
        tx
          .table<Match, string>('matches')
          .toCollection()
          .modify((m) => {
            migrateTeamIds(m);
          }),
      );
    // v3: matches link to their fixture by a stable id instead of the match number.
    this.version(3)
      .stores({ matches: 'id, updatedAt' })
      .upgrade((tx) =>
        tx
          .table<Match, string>('matches')
          .toCollection()
          .modify((m) => {
            migrateFixtureLink(m as Match & { fixtureNo?: number });
          }),
      );
  }
}

export const db = new ScoreBoardDB();
