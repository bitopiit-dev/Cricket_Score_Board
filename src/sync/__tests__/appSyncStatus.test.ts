import { describe, expect, it } from 'vitest';
import { syncStatusFrom } from '../matchSync';

const base = { server: true, online: true, queued: 0, connected: true as boolean | null };

describe('header sync status', () => {
  it('says synced once scores have downloaded and nothing is waiting', () => {
    expect(syncStatusFrom(base)).toBe('synced');
  });

  it('says saved on this device when no server is set up', () => {
    expect(syncStatusFrom({ ...base, server: false, online: false, queued: 3 })).toBe('local');
  });

  it('says it is still connecting before the first download is back', () => {
    expect(syncStatusFrom({ ...base, connected: null })).toBe('connecting');
  });

  it('shows waiting uploads from this device before anything else', () => {
    expect(syncStatusFrom({ ...base, queued: 1 })).toBe('pending');
    expect(syncStatusFrom({ ...base, queued: 1, connected: null })).toBe('pending');
  });

  it('says offline with no connection or when the server cannot be reached', () => {
    expect(syncStatusFrom({ ...base, online: false, queued: 2 })).toBe('offline');
    expect(syncStatusFrom({ ...base, connected: false })).toBe('offline');
  });
});
