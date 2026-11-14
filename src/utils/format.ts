import { BALLS_PER_OVER } from '../engine/rules';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export interface Formatter {
  /** Integer or any string containing digits. */
  num: (n: number | string) => string;
  /** Fixed decimals, e.g. run rate. */
  dec: (n: number, digits?: number) => string;
  /** Legal balls -> "12.3". */
  overs: (legalBalls: number) => string;
}

export function makeFormatter(bengaliDigits: boolean): Formatter {
  const d = (s: string) => (bengaliDigits ? toBengaliDigits(s) : s);
  return {
    num: (n) => d(String(n)),
    dec: (n, digits = 2) => d(n.toFixed(digits)),
    overs: (b) => d(`${Math.floor(b / BALLS_PER_OVER)}.${b % BALLS_PER_OVER}`),
  };
}
