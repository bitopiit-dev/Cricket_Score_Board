import { describe, expect, it } from 'vitest';
import { makeMatch } from '../../engine/__tests__/helpers';
import { playerName } from '../matchText';

describe('playerName', () => {
  it('uses the short name and adds (C) / (VC)', () => {
    const m = makeMatch(3);
    m.teams[0].players[0] = { id: 'x', name: 'Ajmir Hossen', shortName: 'Rashed', captain: true };
    m.teams[0].players[1] = { id: 'y', name: 'Atiq', viceCaptain: true };
    expect(playerName(m, 'x')).toBe('Rashed (C)');
    expect(playerName(m, 'y')).toBe('Atiq (VC)');
    expect(playerName(m, 'a3')).toBe('A3');
  });
});
