import { describe, expect, it } from 'vitest';
import { COMMITTEE_MEMBERS, type CommitteeMember } from '../committee';
import { addMember, committeeProblems, memberId, moveMember, removeMember } from '../committeeEdit';
import { isValidDoc } from '../../sync/remoteData';

const LIST: CommitteeMember[] = [
  { id: 'a', name: 'Mr. A', role: 'member' },
  { id: 'b', name: 'Mr. B', role: 'convener', title: 'GM, HR' },
  { id: 'c', name: 'Mr. C', role: 'member', photo: 'https://x/c.jpg' },
];

describe('editing the committee', () => {
  it('makes a clean, unique id from a name', () => {
    expect(memberId('Mr. Rahim Uddin', [])).toBe('rahim-uddin');
    expect(memberId('Md Karim', [])).toBe('karim');
    expect(memberId('Mr. K A Rahman', ['k-a-rahman'])).toBe('k-a-rahman-2');
    expect(memberId('রহিম', [])).toBe('member');
  });

  it('adds a plain member at the end, without a photo', () => {
    const next = addMember(LIST, '  Mr. Rahim Uddin ');
    expect(next).toHaveLength(4);
    expect(next[3]).toEqual({ id: 'rahim-uddin', name: 'Mr. Rahim Uddin', role: 'member' });
    expect(LIST).toHaveLength(3);
  });

  it('removes and reorders', () => {
    expect(removeMember(LIST, 1).map((m) => m.id)).toEqual(['a', 'c']);
    expect(moveMember(LIST, 2, -1).map((m) => m.id)).toEqual(['a', 'c', 'b']);
    expect(moveMember(LIST, 0, -1).map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('says what must be fixed before saving', () => {
    expect(committeeProblems(LIST)).toEqual([]);
    expect(committeeProblems([])).toEqual(['অন্তত একজন সদস্য লাগবে']);
    expect(committeeProblems([...LIST, { id: 'd', name: ' ', role: 'member' }])).toEqual([
      '1 জনের নাম খালি',
    ]);
    expect(committeeProblems([...LIST, { id: 'd', name: 'mr. a', role: 'member' }])).toEqual([
      'একই নাম দুবার আছে',
    ]);
  });
});

describe('a saved committee list', () => {
  it('is accepted when every member has an id, a name and a known role', () => {
    expect(isValidDoc('committee', LIST)).toBe(true);
    expect(isValidDoc('committee', [...COMMITTEE_MEMBERS])).toBe(true);
  });

  it('is refused when broken, so phones keep the last good list', () => {
    expect(isValidDoc('committee', [])).toBe(false);
    expect(isValidDoc('committee', [{ id: 'a', name: '', role: 'member' }])).toBe(false);
    expect(isValidDoc('committee', [{ id: 'a', name: 'A', role: 'boss' }])).toBe(false);
    expect(isValidDoc('committee', [LIST[0], { ...LIST[1], id: 'a' }])).toBe(false);
    // A team list is not a committee list
    expect(isValidDoc('committee', [{ id: 'x', name: 'X', players: [] }])).toBe(false);
  });
});
