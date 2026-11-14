import { describe, expect, it } from 'vitest';
import { makeFormatter, toBengaliDigits } from '../format';

describe('format', () => {
  it('converts digits to Bengali', () => {
    expect(toBengaliDigits('125/3 (15.2)')).toBe('১২৫/৩ (১৫.২)');
  });

  it('formats overs and decimals', () => {
    const en = makeFormatter(false);
    expect(en.overs(92)).toBe('15.2');
    expect(en.dec(7.456)).toBe('7.46');
    const bn = makeFormatter(true);
    expect(bn.overs(92)).toBe('১৫.২');
  });
});
