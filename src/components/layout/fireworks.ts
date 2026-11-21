/**
 * A fireworks show on the BPL logo: each rocket rises from behind the logo,
 * arcs over its top edge, comes down in front of it and bursts over the logo.
 * About 10–15 are going at any moment. Pure physics with no drawing, so it
 * can be tested; LogoFireworks draws the "behind" part on a canvas under the
 * logo and the "in front" part on a canvas over it. Sizes are CSS pixels and
 * times are seconds.
 */

/** The logo's own colours: crimson, gold, green, white, plus the app's cyan. */
export const FIREWORK_COLORS = ['#e11d48', '#f59e0b', '#10b981', '#fde68a', '#ffffff', '#06b6d4'];

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds left; it fades out as this runs down. */
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

/** A rocket flies a curve: start (behind) -> over the top -> burst point (in front). */
export interface Rocket {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  /** 0 at launch, 1 when it bursts. */
  t: number;
  /** Flight time in seconds. */
  dur: number;
  color: string;
}

export interface Show {
  w: number;
  h: number;
  /** The logo's box inside the canvas. */
  logo: { x: number; y: number; w: number; h: number };
  rockets: Rocket[];
  sparks: Spark[];
  /** Seconds each recent burst keeps glowing (to count how many are going). */
  glowing: number[];
  /** Seconds until the next rocket. */
  nextIn: number;
}

const GRAVITY = 45;
const DRAG = 0.95;
export const MAX_SPARKS = 700;
/** Seconds between rockets: with ~1 s flights and ~1 s bursts, 10–15 at once. */
export const LAUNCH_EVERY = 0.14;

type Rand = () => number;
const pick = <T>(list: readonly T[], r: Rand) => list[Math.floor(r() * list.length) % list.length];

export function createShow(w: number, h: number, logo: Show['logo']): Show {
  return { w, h, logo, rockets: [], sparks: [], glowing: [], nextIn: 0 };
}

/** Where a rocket is now. Behind the logo on the way up, in front on the way down. */
export function rocketAt(k: Rocket, t = k.t): { x: number; y: number; behind: boolean } {
  const u = 1 - t;
  return {
    x: u * u * k.x0 + 2 * u * t * k.cx + t * t * k.x1,
    y: u * u * k.y0 + 2 * u * t * k.cy + t * t * k.y1,
    behind: t < 0.5,
  };
}

/** Sends one rocket up from behind the logo, over its top, to burst on its face. */
export function launch(show: Show, r: Rand): void {
  const { logo } = show;
  const x0 = logo.x + logo.w * (0.15 + r() * 0.7);
  const y0 = logo.y + logo.h * (0.75 + r() * 0.25);
  // Burst somewhere over the logo (a little past its edges is fine)
  const x1 = logo.x - 8 + r() * (logo.w + 16);
  const y1 = logo.y + logo.h * (0.15 + r() * 0.7);
  // The curve's peak sits above the logo's top edge, inside the canvas
  const cy = Math.max(2, logo.y - 2 - r() * 10) * 2 - (y0 + y1) / 2;
  show.rockets.push({
    x0,
    y0,
    cx: (x0 + x1) / 2 + (r() - 0.5) * 30,
    cy,
    x1,
    y1,
    t: 0,
    dur: 0.8 + r() * 0.4,
    color: pick(FIREWORK_COLORS, r),
  });
}

/** A ring of sparks in one or two colours. */
export function burst(show: Show, x: number, y: number, color: string, r: Rand, big = false): void {
  const n = big ? 40 : 16 + Math.floor(r() * 8);
  const speed = big ? 80 : 38 + r() * 18;
  const second = pick(FIREWORK_COLORS, r);
  let longest = 0;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.2;
    const s = speed * (0.6 + r() * 0.4);
    const life = 0.6 + r() * 0.4;
    longest = Math.max(longest, life);
    show.sparks.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life,
      maxLife: life,
      color: i % 3 === 0 ? second : color,
      size: big ? 1.7 : 1.1 + r() * 0.5,
    });
  }
  show.glowing.push(longest);
  // Oldest sparks go first if a lot is going on
  if (show.sparks.length > MAX_SPARKS) show.sparks.splice(0, show.sparks.length - MAX_SPARKS);
}

/** A celebration: several big bursts over the logo at once (when it is tapped). */
export function salvo(show: Show, r: Rand): void {
  const { logo } = show;
  for (let i = 0; i < 5; i++) {
    burst(show, logo.x + r() * logo.w, logo.y + r() * logo.h, pick(FIREWORK_COLORS, r), r, true);
  }
}

/** Fireworks going at once: rockets in the air plus bursts still glowing. */
export function liveCount(show: Show): number {
  return show.rockets.length + show.glowing.length;
}

/**
 * Moves everything on by `dt` seconds and launches new rockets every
 * `every` seconds on average. Rockets that finish their curve burst.
 */
export function step(show: Show, dt: number, r: Rand, every = LAUNCH_EVERY): void {
  // A long pause (tab in the background) must not fire a backlog of rockets
  dt = Math.min(dt, 0.05);
  show.nextIn -= dt;
  while (show.nextIn <= 0) {
    launch(show, r);
    show.nextIn += every * (0.5 + r());
  }

  const landed: Rocket[] = [];
  for (const k of show.rockets) {
    k.t += dt / k.dur;
    if (k.t >= 1) landed.push(k);
  }
  for (const k of landed) burst(show, k.x1, k.y1, k.color, r);
  if (landed.length > 0) show.rockets = show.rockets.filter((k) => k.t < 1);

  const drag = Math.pow(DRAG, dt * 60);
  for (const s of show.sparks) {
    s.vx *= drag;
    s.vy = s.vy * drag + GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
  show.sparks = show.sparks.filter((s) => s.life > 0);
  show.glowing = show.glowing.map((g) => g - dt).filter((g) => g > 0);
}
