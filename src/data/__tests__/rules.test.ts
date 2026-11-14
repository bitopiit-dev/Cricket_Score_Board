import { describe, expect, it } from 'vitest';
import { RULE_SECTIONS, normalizeForSearch, searchRules } from '../rules';

const all = RULE_SECTIONS.flatMap((s) => s.rules);

describe('tournament rules data', () => {
  it('has 34 rules numbered 1 to 34 in 6 sections', () => {
    expect(RULE_SECTIONS).toHaveLength(6);
    expect(all.map((r) => r.n)).toEqual(Array.from({ length: 34 }, (_, i) => i + 1));
  });

  it('every rule and section has both languages', () => {
    for (const s of RULE_SECTIONS) {
      expect(s.title.bn && s.title.en).toBeTruthy();
      for (const r of s.rules)
        expect(r.text.bn.length * r.text.en.length, `rule ${r.n}`).toBeGreaterThan(0);
    }
  });
});

describe('rule search', () => {
  it('finds by English or Bengali words, in any UI language', () => {
    expect(searchRules('super over').flatMap((s) => s.rules.map((r) => r.n))).toEqual([4]);
    expect(searchRules('রিভিউ').flatMap((s) => s.rules.map((r) => r.n))).toEqual([26]);
    expect(searchRules('NO-BALL').flatMap((s) => s.rules.map((r) => r.n))).toEqual([
      16, 17, 18, 19,
    ]);
  });

  it('finds by rule number in either digit set', () => {
    expect(searchRules('22').flatMap((s) => s.rules.map((r) => r.n))).toEqual([22]);
    expect(searchRules('২২').flatMap((s) => s.rules.map((r) => r.n))).toEqual([22]);
  });

  it('returns everything for an empty query and nothing for nonsense', () => {
    expect(searchRules('  ')).toBe(RULE_SECTIONS);
    expect(searchRules('zzzz')).toEqual([]);
  });

  it('normalises Bengali digits and case', () => {
    expect(normalizeForSearch(' ১২ Overs ')).toBe('12 overs');
  });
});
