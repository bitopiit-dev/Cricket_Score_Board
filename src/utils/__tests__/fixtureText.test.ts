import { describe, expect, it } from 'vitest';
import { makeFormatter } from '../format';
import { formatDate, formatTime } from '../fixtureText';

describe('fixture text', () => {
  const bn = makeFormatter(true);
  const en = makeFormatter(false);

  it('formats times in Bengali with the part of the day, and in English with AM/PM', () => {
    expect(formatTime('12:00', 'bn', bn)).toBe('দুপুর ১২:০০');
    expect(formatTime('13:00', 'bn', bn)).toBe('দুপুর ১:০০');
    expect(formatTime('15:30', 'bn', bn)).toBe('বিকাল ৩:৩০');
    expect(formatTime('09:05', 'bn', en)).toBe('সকাল 9:05');
    expect(formatTime('13:00', 'en', en)).toBe('1:00 PM');
    expect(formatTime('00:15', 'en', en)).toBe('12:15 AM');
  });

  it('formats the date on the right calendar day', () => {
    expect(formatDate('2026-11-16', 'en', false)).toBe('Monday 16 November');
    expect(formatDate('2026-11-16', 'bn', true)).toContain('১৬');
    expect(formatDate('2026-11-16', 'bn', false)).toContain('16');
  });
});
