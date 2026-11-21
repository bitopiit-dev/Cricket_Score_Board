import { describe, expect, it } from 'vitest';
import {
  createShow,
  FIREWORK_COLORS,
  launch,
  liveCount,
  MAX_SPARKS,
  rocketAt,
  salvo,
  step,
} from '../fireworks';

/** A repeatable "random" so the show is the same every run. */
function seeded(seed = 7) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const LOGO = { x: 28, y: 12, w: 100, h: 60 };
const newShow = () => createShow(156, 80, LOGO);
const run = (seconds: number, r = seeded()) => {
  const s = newShow();
  for (let t = 0; t < seconds; t += 1 / 60) step(s, 1 / 60, r);
  return s;
};

describe('logo fireworks', () => {
  it('each rocket rises behind the logo, goes over its top and bursts in front of it', () => {
    const s = newShow();
    const r = seeded(3);
    for (let i = 0; i < 100; i++) launch(s, r);
    for (const k of s.rockets) {
      const start = rocketAt(k, 0);
      const top = Math.min(...Array.from({ length: 21 }, (_, i) => rocketAt(k, i / 20).y));
      const end = rocketAt(k, 1);
      // Starts low down, behind the logo
      expect(start.behind).toBe(true);
      expect(start.y).toBeGreaterThan(LOGO.y + LOGO.h / 2);
      // Climbs above the logo's top edge, still on screen
      expect(top).toBeLessThan(LOGO.y + 2);
      expect(top).toBeGreaterThan(-6);
      // Comes down in front, onto the logo
      expect(end.behind).toBe(false);
      expect(end.y).toBeGreaterThan(LOGO.y);
      expect(end.y).toBeLessThan(LOGO.y + LOGO.h);
      expect(end.x).toBeGreaterThanOrEqual(LOGO.x - 8);
      expect(end.x).toBeLessThanOrEqual(LOGO.x + LOGO.w + 8);
    }
  });

  it('keeps about 10 to 15 fireworks going at once', () => {
    const r = seeded(11);
    const s = run(5, r);
    const counts: number[] = [];
    for (let t = 0; t < 20; t += 1 / 60) {
      step(s, 1 / 60, r);
      counts.push(liveCount(s));
    }
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(avg).toBeGreaterThanOrEqual(10);
    expect(avg).toBeLessThanOrEqual(17);
    expect(s.sparks.every((p) => FIREWORK_COLORS.includes(p.color))).toBe(true);
  });

  it('does not pile up over a long time', () => {
    const s = run(120);
    expect(s.sparks.length).toBeLessThanOrEqual(MAX_SPARKS);
    expect(s.rockets.length).toBeLessThan(20);
  });

  it('a long pause (app in the background) does not fire a backlog at once', () => {
    const s = newShow();
    step(s, 120, seeded());
    expect(s.rockets.length).toBeLessThanOrEqual(2);
  });

  it('tapping the logo sets off several big bursts', () => {
    const s = newShow();
    salvo(s, seeded());
    expect(s.sparks.length).toBe(5 * 40);
    expect(liveCount(s)).toBe(5);
  });
});
