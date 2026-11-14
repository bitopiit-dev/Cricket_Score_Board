import { describe, expect, it } from 'vitest';
import bn from '../bn.json';
import en from '../en.json';

/** Flattens nested keys and folds English plural forms (_one/_other) into the base key. */
function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? keys(v, `${prefix}${k}.`)
      : [`${prefix}${k.replace(/_(one|other)$/, '')}`],
  );
}

describe('translations', () => {
  it('Bengali and English have the same keys', () => {
    expect([...new Set(keys(bn))].sort()).toEqual([...new Set(keys(en))].sort());
  });
});
