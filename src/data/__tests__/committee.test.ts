import { describe, expect, it } from 'vitest';
import { COMMITTEE_MEMBERS } from '../committee';

describe('committee members', () => {
  it('has 10 members with unique ids, one convener and one member secretary', () => {
    expect(COMMITTEE_MEMBERS).toHaveLength(10);
    expect(new Set(COMMITTEE_MEMBERS.map((m) => m.id)).size).toBe(10);
    expect(COMMITTEE_MEMBERS.filter((m) => m.role === 'convener')).toHaveLength(1);
    expect(COMMITTEE_MEMBERS.filter((m) => m.role === 'memberSecretary')).toHaveLength(1);
  });

  it('keeps photos in public/committee/ and names non-empty when set', () => {
    for (const m of COMMITTEE_MEMBERS) {
      if (m.photo) expect(m.photo.startsWith('committee/'), m.photo).toBe(true);
      if (m.name !== undefined) expect(m.name.trim(), m.id).not.toBe('');
    }
  });
});
