import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { ScoreBoardDB } from '../database';
import { createLocalRepository } from '../repository';
import { makeMatch } from '../../engine/__tests__/helpers';

let n = 0;
const fresh = () => new ScoreBoardDB(`test-${++n}`);

describe('local repository', () => {
  let db: ScoreBoardDB;
  afterEach(() => db.delete());

  it('saves, lists newest first, and deletes matches', async () => {
    db = fresh();
    const repo = createLocalRepository(db);
    await repo.save({ ...makeMatch(), id: 'old', updatedAt: 1 });
    await repo.save({ ...makeMatch(), id: 'new', updatedAt: 2 });
    expect((await repo.list()).map((m) => m.id)).toEqual(['new', 'old']);

    await repo.remove('old');
    expect((await repo.list()).map((m) => m.id)).toEqual(['new']);
  });

  it('round-trips events', async () => {
    db = fresh();
    const repo = createLocalRepository(db);
    const m = makeMatch();
    m.events.push({ id: 'e1', at: 1, type: 'ball', runs: 4, extra: null, boundary: true });
    await repo.save(m);
    expect((await repo.get(m.id))?.events).toEqual(m.events);
  });
});

describe('upgrade to v2: renamed teams', () => {
  it('moves saved matches from old team ids to the new id and name', async () => {
    const name = `test-upgrade-${++n}`;
    // A v1 database with a match saved under the old id
    const v1 = new Dexie(name);
    v1.version(1).stores({ matches: 'id, updatedAt' });
    const old = makeMatch();
    old.teams[0] = { ...old.teams[0], teamId: 'ie-warrior', name: 'IE Warrior' };
    old.teams[1] = { ...old.teams[1], teamId: 'ddc', name: 'DDC' };
    await v1.table('matches').put(old);
    v1.close();

    const db2 = new ScoreBoardDB(name);
    const m = await createLocalRepository(db2).get(old.id);
    expect(m?.teams[0]).toMatchObject({ teamId: 'engineer-warriors', name: 'Engineer Warrior' });
    expect(m?.teams[1]).toMatchObject({ teamId: 'ddc', name: 'DDC' });
    expect(m?.teams[0].players).toEqual(old.teams[0].players);
    await db2.delete();
  });
});

describe('upgrade to v3: fixture links', () => {
  it('turns a saved fixture number into the fixture id', async () => {
    const name = `test-upgrade-${++n}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({ matches: 'id, updatedAt' });
    await v1.table('matches').put({ ...makeMatch(), id: 'm1', fixtureNo: 12 });
    await v1.table('matches').put({ ...makeMatch(), id: 'm2' });
    v1.close();

    const db3 = new ScoreBoardDB(name);
    const repo = createLocalRepository(db3);
    const m1 = (await repo.get('m1')) as unknown as Record<string, unknown>;
    expect(m1.fixtureId).toBe('f12');
    expect('fixtureNo' in m1).toBe(false);
    expect((await repo.get('m2'))?.fixtureId).toBeUndefined();
    await db3.delete();
  });
});
