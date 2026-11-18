// The hero's background: a grid of small squares (the logo's dots) that answers the cursor. Around the pointer the
// squares wake up: they grow, warm to the palette's rust and lean away a little, in a soft square-shaped halo
// (square like the mark's rings). Moving leaves a short trail that fades. Nothing pulses on its own; with the
// cursor still or away, the grid is calm. Colours come from the palette tokens (--soft, --o3-deep / --o3).
import { useEffect, useRef } from "react";

const GRID = 26;          // px between squares
const DOT = 2.4;          // resting square size
const REACH = 150;        // halo radius around the cursor
const TRAIL = 10;         // remembered pointer positions

type Props = { className?: string; start?: boolean; anchor?: () => Element | null };

export default function HeroField({ className = "hero-field", start = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(start);
  useEffect(() => { startRef.current = start; }, [start]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true;
    let grid = "#ab9d94", lit = "#b4482b";
    // pointer + a short trail of where it has been; each point fades over ~0.6s
    const trail: { x: number; y: number; t: number }[] = [];
    let px = -9999, py = -9999, inside = false;
    let energy = 0;   // eased 0..1: how awake the grid is (fades in on enter, out on leave)

    const read = () => {
      const cs = getComputedStyle(cv);
      grid = cs.getPropertyValue("--soft").trim() || grid;
      lit = cs.getPropertyValue(cv.closest('[data-theme="dark"]') ? "--o3" : "--o3-deep").trim() || lit;
    };
    const fit = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      energy += ((inside && startRef.current ? 1 : 0) - energy) * 0.12;
      while (trail.length && now - trail[0].t > 600) trail.shift();

      for (let y = GRID / 2; y < H; y += GRID) {
        // calmer toward the top, where the headline sits
        const fy = Math.min(1, Math.max(0, (y / H - 0.18) / 0.32));
        for (let x = GRID / 2; x < W; x += GRID) {
          const fx = 1 - Math.pow(Math.abs(x - W / 2) / (W * 0.6), 2);
          const base = 0.32 * fy * Math.max(0, fx);
          // halo: strongest from the live pointer, weaker from the trail; square (Chebyshev) falloff, eased
          let k = 0, ax = 0, ay = 0;
          if (energy > 0.01) {
            const sample = (qx: number, qy: number, w: number) => {
              const d = Math.max(Math.abs(x - qx), Math.abs(y - qy));
              if (d >= REACH) return;
              const f = 1 - d / REACH, e = f * f * (3 - 2 * f) * w;
              if (e > k) { k = e; const len = Math.hypot(x - qx, y - qy) || 1; ax = (x - qx) / len; ay = (y - qy) / len; }
            };
            sample(px, py, 1);
            for (const p of trail) sample(p.x, p.y, 0.55 * (1 - (now - p.t) / 600));
            k *= energy;
          }
          if (k < 0.02 && base < 0.02) continue;
          if (k < 0.02) {
            ctx.globalAlpha = base; ctx.fillStyle = grid;
            ctx.fillRect(x - DOT / 2, y - DOT / 2, DOT, DOT);
            continue;
          }
          // awake: grows, warms to rust, leans away from the cursor
          const s = DOT + k * 4.2, push = k * 7;
          const cx = x + ax * push, cy = y + ay * push;
          ctx.globalAlpha = Math.min(1, base + k * 0.85);
          ctx.fillStyle = k > 0.18 ? lit : grid;
          ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = 0;
      draw(now);
      // keep animating only while something is easing (halo fading in/out or a trail fading)
      const settling = Math.abs((inside ? 1 : 0) - energy) > 0.01 || trail.length > 0;
      if (visible && settling && !reduce) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
      inside = px >= 0 && py >= 0 && px <= r.width && py <= r.height;
      if (inside) {
        const last = trail[trail.length - 1], now = performance.now();
        if (!last || Math.hypot(last.x - px, last.y - py) > 14) { trail.push({ x: px, y: py, t: now }); if (trail.length > TRAIL) trail.shift(); }
      }
      kick();
    };
    const onLeave = () => { inside = false; kick(); };

    fit(); read(); kick();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    const ro = new ResizeObserver(() => { fit(); kick(); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(cv);
    const mo = new MutationObserver(() => { read(); kick(); });
    const root = cv.closest(".grain-hero");
    if (root) mo.observe(root, { attributes: true, attributeFilter: ["data-palette", "data-theme"] });
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
