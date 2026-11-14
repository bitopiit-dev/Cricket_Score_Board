import 'fake-indexeddb/auto';
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
