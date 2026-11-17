import { describe, expect, it } from 'vitest';
import { FRESH_FOR_MS, shouldCelebrate } from '../WinnerCelebration';

const now = 1_800_000_000_000;
const base = { hasWinner: true, seen: false, endedWhileOpen: false, finishedAt: now - 60_000, now };

describe('winner trophy', () => {
  it('shows for a match that just ended', () => {
    expect(shouldCelebrate(base)).toBe(true);
  });

  it('shows when the last ball is watched live, however the clock looks', () => {
    expect(shouldCelebrate({ ...base, endedWhileOpen: true, finishedAt: null })).toBe(true);
  });

  it('shows only once on a device', () => {
    expect(shouldCelebrate({ ...base, seen: true })).toBe(false);
    expect(shouldCelebrate({ ...base, seen: true, endedWhileOpen: true })).toBe(false);
  });

  it('does not show for a tie', () => {
    expect(shouldCelebrate({ ...base, hasWinner: false, endedWhileOpen: true })).toBe(false);
  });

  it('does not show when opening an old match', () => {
    expect(shouldCelebrate({ ...base, finishedAt: now - FRESH_FOR_MS - 1 })).toBe(false);
  });
});
