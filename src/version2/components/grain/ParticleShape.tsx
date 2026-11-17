// Antigravity-style particle shapes for the Capabilities cards.
// A light field of faint dots, plus ~220 particles coloured by a slowly turning Siri mesh (cyan, raspberry and
// violet lobes over indigo), so colour pools and drifts rather than running in a stripe.
// Loose, they drift through the field; "gathered", they flow onto the outline of a simple, recognisable shape:
// an envelope, a checklist, a circle with a check, a folder. Pauses off-screen; still for reduced motion.
import { useEffect, useRef } from "react";

type Seg = [number, number][];            // a polyline in a 100 × 70 box
const circle = (cx: number, cy: number, r: number, n = 48): Seg =>
  Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);
const SHAPES: Seg[][] = [
  // envelope
  [[[22, 14], [78, 14], [78, 56], [22, 56], [22, 14]], [[22, 14], [50, 38], [78, 14]]],
  // checklist on a clipboard
  [[[31, 8], [69, 8], [69, 62], [31, 62], [31, 8]], [[43, 6], [57, 6]],
   [[36, 21], [39, 24], [44, 17]], [[48, 21], [63, 21]],
   [[36, 35], [39, 38], [44, 31]], [[48, 35], [63, 35]],
   [[36, 49], [39, 52], [44, 45]], [[48, 49], [60, 49]]],
  // approved: a circle with a check
  [circle(50, 35, 23), [[39, 35], [47, 43], [62, 27]]],
  // folder (packet)
  [[[18, 20], [37, 20], [42, 25], [82, 25], [82, 58], [18, 58], [18, 20]], [[18, 31], [82, 31]]],
];
const N = 220;
// Siri lobes: each has a colour and a centre that orbits the frame; a particle takes the weighted mix
const LOBES: { c: [number, number, number]; ox: number; oy: number; r: number; w: number; ph: number }[] = [
  { c: [14, 165, 196], ox: 30, oy: 30, r: 18, w: 0.35, ph: 0 },      // cyan (deepened to read on white)
  { c: [214, 31, 105], ox: 62, oy: 46, r: 16, w: -0.28, ph: 2.1 },   // raspberry
  { c: [139, 92, 246], ox: 72, oy: 22, r: 14, w: 0.22, ph: 4.2 },    // violet
];
const INDIGO: [number, number, number] = [55, 48, 163];
function siriAt(x: number, y: number, t: number, lift = 0) {
  let r = INDIGO[0] * 0.35, g = INDIGO[1] * 0.35, b = INDIGO[2] * 0.35, sum = 0.35;
  for (const L of LOBES) {
    const cx = L.ox + Math.cos(t * L.w + L.ph) * L.r, cy = L.oy + Math.sin(t * L.w * 1.3 + L.ph) * L.r * 0.6;
    const k = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / 520);
    r += L.c[0] * k; g += L.c[1] * k; b += L.c[2] * k; sum += k;
  }
  const up = (v: number) => Math.round(v / sum + (255 - v / sum) * lift);   // lighter on black
  return `rgb(${up(r)},${up(g)},${up(b)})`;
}
// N points spread evenly (by length) along every segment of a shape
function sample(shape: Seg[]): [number, number][] {
  const pieces: { a: [number, number]; b: [number, number]; len: number }[] = [];
  shape.forEach((seg) => { for (let i = 1; i < seg.length; i++) pieces.push({ a: seg[i - 1], b: seg[i], len: Math.hypot(seg[i][0] - seg[i - 1][0], seg[i][1] - seg[i - 1][1]) }); });
  const total = pieces.reduce((s, p) => s + p.len, 0);
  const out: [number, number][] = [];
  for (let k = 0; k < N; k++) {
    let d = ((k + 0.5) / N) * total;
    for (const p of pieces) {
      if (d <= p.len) { const t = d / p.len; out.push([p.a[0] + (p.b[0] - p.a[0]) * t, p.a[1] + (p.b[1] - p.a[1]) * t]); break; }
      d -= p.len;
    }
  }
  return out;
}

export default function ParticleShape({ shape, gathered, label }: { shape: number; gathered: boolean; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const want = useRef(gathered);
  want.current = gathered;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seed = shape * 9301 + 49297;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const targets = sample(SHAPES[shape]);
    // shuffle so particles don't all travel in order
    for (let i = targets.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [targets[i], targets[j]] = [targets[j], targets[i]]; }
    const parts = targets.map((t) => ({ hx: 6 + rnd() * 88, hy: 5 + rnd() * 60, x: 0, y: 0, tx: t[0], ty: t[1], ph: rnd() * 6.28, sp: 0.4 + rnd() * 0.6 }));
    parts.forEach((p) => { p.x = p.hx; p.y = p.hy; });
    const field = Array.from({ length: 260 }, () => [4 + rnd() * 92, 3 + rnd() * 64]);
    let raf = 0, visible = false, last = 0, time = 0, g = reduce ? 1 : 0, ink = "#0a0a0a", lift = 0;
    const fit = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    };
    const draw = () => {
      const W = cv.width, H = cv.height, s = Math.min(W / 100, H / 70), ox = (W - 100 * s) / 2, oy = (H - 70 * s) / 2;
      const dot = Math.max(1, s * 0.62);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = ink; ctx.globalAlpha = 0.16;
      for (const [x, y] of field) ctx.fillRect(ox + x * s, oy + y * s, dot * 0.8, dot * 0.8);
      ctx.globalAlpha = 1;
      for (const p of parts) {
        const loose = 1 - g;
        const wx = Math.sin(time * p.sp + p.ph) * 2.2 * loose + Math.sin(time * 1.6 + p.ph) * 0.25;
        const wy = Math.cos(time * p.sp * 0.8 + p.ph) * 2.2 * loose + Math.cos(time * 1.4 + p.ph) * 0.25;
        ctx.fillStyle = siriAt(p.x, p.y, time, lift);
        ctx.globalAlpha = 0.55 + 0.45 * g;
        ctx.beginPath(); ctx.arc(ox + (p.x + wx) * s, oy + (p.y + wy) * s, dot * (0.85 + 0.25 * g), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now; time += dt;
      ink = getComputedStyle(cv).getPropertyValue("--ink").trim() || ink;
      lift = cv.closest('[data-theme="dark"]') ? 0.3 : 0;
      g += ((want.current ? 1 : 0) - g) * (1 - Math.exp(-dt / 0.35));
      for (const p of parts) {
        // each particle eases toward its target with its own lag, so the shape assembles organically
        const tx = want.current ? p.tx : p.hx, ty = want.current ? p.ty : p.hy;
        const k = 1 - Math.exp(-dt / (0.25 + p.sp * 0.4));
        p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
      }
      draw();
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    const ro = new ResizeObserver(() => { fit(); draw(); });
    ro.observe(cv);
    fit();
    if (reduce) { parts.forEach((p) => { p.x = p.tx; p.y = p.ty; }); draw(); return () => ro.disconnect(); }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = 0; raf = requestAnimationFrame(tick); } });
    io.observe(cv);
    draw();
    return () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [shape]);

  return <canvas ref={ref} className="ps" role="img" aria-label={label} />;
}
