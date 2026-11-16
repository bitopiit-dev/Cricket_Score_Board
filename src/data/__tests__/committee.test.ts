import { describe, expect, it } from 'vitest';
import { COMMITTEE_MEMBERS } from '../committee';

/** Photo files that really exist, as 'committee/<file>'. */
const PHOTOS = new Set(
  Object.keys(import.meta.glob('/public/committee/*', { query: '?url' })).map((p) =>
    p.replace('/public/', ''),
  ),
);

describe('committee members', () => {
  it('has 9 named members with unique ids, all plain members', () => {
    expect(COMMITTEE_MEMBERS).toHaveLength(9);
    expect(new Set(COMMITTEE_MEMBERS.map((m) => m.id)).size).toBe(9);
    expect(COMMITTEE_MEMBERS.every((m) => m.role === 'member')).toBe(true);
  });

  it('has a non-empty name and an existing photo in public/committee/ for everyone', () => {
    for (const m of COMMITTEE_MEMBERS) {
      expect(m.name?.trim(), m.id).toBeTruthy();
      expect(m.photo, m.id).toBe(`committee/${m.id}.jpg`);
      expect(PHOTOS.has(m.photo!), m.photo).toBe(true);
    }
  });
});
