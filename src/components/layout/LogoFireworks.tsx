import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createShow, rocketAt, salvo, step, type Show } from './fireworks';

/** How far the sky reaches past the logo, in CSS pixels (left/right, top, bottom). */
const PAD = { x: 28, top: 12, bottom: 8 };

/**
 * Wraps the header logo in an endless fireworks show: rockets rise from behind
 * the logo, arc over its top and burst in front of it, 10–15 at a time. The
 * logo image itself is untouched; one canvas sits under it and one over it.
 * Tapping the logo sets off a bigger burst. Nothing is drawn for people who ask for reduced
 * motion, and the show pauses while the header is scrolled away or the app is
 * in the background, so it costs no battery then.
 */
export function LogoFireworks({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const show = useRef<Show | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const box = wrap.current;
    const cvs = [back.current, front.current];
    const behind = cvs[0]?.getContext('2d');
    const ahead = cvs[1]?.getContext('2d');
    if (reduced || !box || !behind || !ahead) return;

    const fit = () => {
      const w = box.offsetWidth + PAD.x * 2;
      const h = box.offsetHeight + PAD.top + PAD.bottom;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const [cv, ctx] of [
        [cvs[0]!, behind],
        [cvs[1]!, ahead],
      ] as const) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const logo = { x: PAD.x, y: PAD.top, w: box.offsetWidth, h: box.offsetHeight };
      if (show.current) Object.assign(show.current, { w, h, logo });
      else show.current = createShow(w, h, logo);
    };
    fit();
    const resized = new ResizeObserver(fit);
    resized.observe(box);

    let frame = 0;
    let last = 0;
    let onScreen = true;
    const tick = (now: number) => {
      const s = show.current!;
      step(s, last ? (now - last) / 1000 : 0, Math.random);
      last = now;
      draw(behind, ahead, s);
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || !onScreen || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const seen = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    seen.observe(box);
    const visibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', visibility);
    start();

    return () => {
      stop();
      resized.disconnect();
      seen.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [reduced]);

  return (
    <div
      ref={wrap}
      className="relative max-w-full shrink-0"
      onPointerDown={() => show.current && salvo(show.current, Math.random)}
    >
      {!reduced && <canvas ref={back} aria-hidden className={SKY} style={SKY_STYLE} />}
      {/* The logo sits between the two skies */}
      <div className="relative z-10">{children}</div>
      {!reduced && <canvas ref={front} aria-hidden className={`${SKY} z-20`} style={SKY_STYLE} />}
    </div>
  );
}

const SKY = 'pointer-events-none absolute';
const SKY_STYLE = {
  left: -PAD.x,
  top: -PAD.top,
  width: `calc(100% + ${PAD.x * 2}px)`,
  height: `calc(100% + ${PAD.top + PAD.bottom}px)`,
};

/**
 * Rockets as short glowing streaks: on the back canvas while they rise behind
 * the logo, on the front one once they come over it. Sparks are all in front.
 */
function draw(behind: CanvasRenderingContext2D, ctx: CanvasRenderingContext2D, s: Show) {
  for (const c of [behind, ctx]) {
    c.clearRect(0, 0, s.w, s.h);
    c.globalCompositeOperation = 'lighter';
  }
  for (const k of s.rockets) {
    const now = rocketAt(k);
    const tail = rocketAt(k, Math.max(0, k.t - 0.08));
    const c = now.behind ? behind : ctx;
    c.strokeStyle = k.color;
    c.lineWidth = 1.6;
    c.globalAlpha = 0.95;
    c.beginPath();
    c.moveTo(tail.x, tail.y);
    c.lineTo(now.x, now.y);
    c.stroke();
  }
  behind.globalAlpha = 1;
  behind.globalCompositeOperation = 'source-over';
  for (const p of s.sparks) {
    const fade = p.life / p.maxLife;
    ctx.globalAlpha = fade;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + fade * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia(query);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
