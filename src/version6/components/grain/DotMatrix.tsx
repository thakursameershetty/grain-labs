// Dot-matrix pixel animations for the Capabilities cards (matching the cards' dot marks and the site's dither).
// A 34×24 grid of square dots: unlit dots are faint, lit dots are ink, a few are accent. Each scene is a
// function of loop time t ∈ [0, 1) that lights cells; every dot eases toward its target, so motion leaves a
// short trail. Scenes loop; hovering restarts the loop. Pauses off-screen; still frame for reduced motion.
import { useEffect, useRef } from "react";

const COLS = 34, ROWS = 24;
const LOOP = 5.2;                      // seconds per loop
type Put = (x: number, y: number, v?: 1 | 2) => void;   // 1 = ink, 2 = accent

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => { const c = clamp(v); return c * c * (3 - 2 * c); };
const span = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const sprite = (put: Put, rows: string[], x: number, y: number, v: 1 | 2 = 1) =>
  rows.forEach((r, j) => r.split("").forEach((c, i) => { if (c === "1") put(Math.round(x) + i, Math.round(y) + j, v); }));
const rect = (put: Put, x: number, y: number, w: number, h: number, v: 1 | 2 = 1) => {
  for (let i = 0; i < w; i++) { put(x + i, y, v); put(x + i, y + h - 1, v); }
  for (let j = 1; j < h - 1; j++) { put(x, y + j, v); put(x + w - 1, y + j, v); }
};
const hline = (put: Put, x: number, y: number, w: number, v: 1 | 2 = 1) => { for (let i = 0; i < w; i++) put(x + i, y, v); };

const ENVELOPE = ["1111111", "1100011", "1011101", "1000001", "1111111"];
const FILE = ["11110", "10011", "10001", "10101", "10001", "11111"];
const CHECK = ["00001", "00010", "10100", "01000"];
const CROSS = ["101", "010", "101"];
const STAMP = ["0011100", "0011100", "0001000", "0001000", "1111111", "1111111"];
const SEAL = ["01110", "11111", "11011", "11111", "01110"];

/* 1 · takes in the work: items fall into a tray, become one stack, and get routed (tag) */
function intake(put: Put, t: number) {
  // tray
  for (let j = 13; j <= 21; j++) { put(6, j); put(25, j); }
  hline(put, 6, 21, 20);
  const items: [string[], number, number][] = [[ENVELOPE, 8, 0.04], [FILE, 15, 0.16], [ENVELOPE, 18, 0.28], [FILE, 10, 0.4]];
  let landed = 0;
  items.forEach(([s, x, at], i) => {
    const p = span(t, at, at + 0.18);
    if (p <= 0) return;
    if (p < 1) sprite(put, s, x, -7 + p * (14 + 2), 1);
    else landed = i + 1;
  });
  // the stack grows as items land, then is tagged
  for (let k = 0; k < landed; k++) hline(put, 9, 19 - k * 2, 14);
  if (t > 0.66) {
    const blink = t < 0.74 ? (Math.floor(t * 60) % 2 ? 2 : 1) : 2;
    rect(put, 27, 15, 5, 4, blink as 1 | 2);
    put(29, 16, 2); put(29, 17, 2);
    hline(put, 23, 16, 4, 1);
  }
}

/* 2 · does the work: a checklist ticks row by row; one row fails, retries, then passes */
function execution(put: Put, t: number) {
  const rows = [2, 7, 12, 17];
  rows.forEach((y, i) => {
    rect(put, 3, y, 6, 5);
    hline(put, 11, y + 1, 18 - (i % 2) * 5);
    hline(put, 11, y + 3, 11 + (i % 3) * 3);
    const at = 0.08 + i * 0.16;
    if (i === 2) {
      if (t > at && t < at + 0.14) sprite(put, CROSS, 4.5, y + 1, Math.floor(t * 40) % 2 ? 2 : 1);
      if (t >= at + 0.14 && t < at + 0.2) { put(5, y + 2, 2); put(6, y + 2, 2); }   // retrying…
      if (t >= at + 0.2) sprite(put, CHECK, 4, y + 1, 2);
    } else if (t > at + (i > 2 ? 0.12 : 0)) sprite(put, CHECK, 4, y + 1, 1);
  });
  // progress along the bottom edge
  hline(put, 3, 23, Math.round(28 * ease(t / 0.9)), 1);
}

/* 3 · waits for you: a document pulses "pending", a stamp comes down and leaves an approval mark */
function approval(put: Put, t: number) {
  rect(put, 5, 2, 17, 21);
  for (let j = 0; j < 5; j++) hline(put, 8, 5 + j * 2, 11 - (j === 4 ? 4 : 0));
  hline(put, 8, 19, 7);                       // signature line
  const down = span(t, 0.3, 0.44) - span(t, 0.56, 0.7);
  const marked = t > 0.47;
  if (!marked && Math.floor(t * 6) % 2) put(19, 19, 2);   // pending pulse
  if (marked) { rect(put, 9, 14, 9, 5, 2); sprite(put, CHECK, 11, 14.6, 2); }
  sprite(put, STAMP, 10, -8 + down * 16, 1);
  // the person's cursor arriving to approve
  const cx = 30 - span(t, 0.08, 0.3) * 6, cy = 22 - span(t, 0.08, 0.3) * 8;
  sprite(put, ["1000", "1100", "1110", "1111", "0110"], cx, cy, 1);
}

/* 4 · hands back a packet: scattered pages slide into a folder, which closes and is sealed */
function packet(put: Put, t: number) {
  // folder back + tab
  hline(put, 8, 9, 6); rect(put, 8, 10, 19, 12);
  const pages: [number, number][] = [[1, 1], [27, 2], [2, 15], [28, 15]];
  pages.forEach(([sx, sy], i) => {
    const p = span(t, 0.08 + i * 0.08, 0.3 + i * 0.08);
    const x = sx + (14 - i - sx) * p, y = sy + (12 - sy) * p;
    if (p < 1) sprite(put, FILE, x, y, 1);
  });
  const shut = span(t, 0.6, 0.7);
  if (t > 0.5) for (let k = 0; k < 3; k++) hline(put, 11, 13 + k * 2, 13);   // the pages inside
  if (shut > 0) { const rows = Math.round(shut * 5); for (let k = 0; k < rows; k++) hline(put, 9, 20 - k, 17); }
  if (t > 0.74) sprite(put, SEAL, 22, 15, 2);
}

const SCENES = [intake, execution, approval, packet];

export default function DotMatrix({ scene, active, label }: { scene: number; active: boolean; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const restart = useRef(0);
  useEffect(() => { if (active) restart.current++; }, [active]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const val = new Float32Array(COLS * ROWS), tone = new Uint8Array(COLS * ROWS);
    const target = new Float32Array(COLS * ROWS), ttone = new Uint8Array(COLS * ROWS);
    let raf = 0, visible = false, last = 0, t = 0, seen = restart.current, frame = 0;
    let ink = "#0a0a0a", acc = "#16a34a", off = "rgba(0,0,0,.08)";
    const read = () => {
      const cs = getComputedStyle(cv);
      ink = cs.getPropertyValue("--ink").trim() || ink;
      acc = cs.getPropertyValue("--dm-accent").trim() || acc;
      off = cs.getPropertyValue("--dm-off").trim() || off;
    };
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    };
    const put: Put = (x, y, v = 1) => {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
      const k = y * COLS + x;
      target[k] = 1; ttone[k] = Math.max(ttone[k], v);
    };
    const paint = (calm: boolean) => {
      target.fill(0); ttone.fill(0);
      SCENES[scene](put, t);
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      const cell = Math.min(W / COLS, H / ROWS), dot = Math.max(1, Math.floor(cell * 0.62));
      const ox = (W - cell * COLS) / 2, oy = (H - cell * ROWS) / 2;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const k = y * COLS + x;
        if (target[k]) tone[k] = ttone[k];
        val[k] = calm ? target[k] : val[k] + (target[k] - val[k]) * (target[k] > val[k] ? 0.55 : 0.18);
        const px = Math.round(ox + x * cell + (cell - dot) / 2), py = Math.round(oy + y * cell + (cell - dot) / 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = off;
        ctx.fillRect(px, py, dot, dot);
        if (val[k] > 0.02) {
          ctx.globalAlpha = val[k];
          ctx.fillStyle = tone[k] === 2 ? acc : ink;
          ctx.fillRect(px, py, dot, dot);
        }
      }
      ctx.globalAlpha = 1;
    };
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      if (restart.current !== seen) { seen = restart.current; t = 0; }
      t = (t + dt / LOOP) % 1;
      if (++frame % 30 === 1) read();
      paint(false);
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    const ro = new ResizeObserver(() => { fit(); if (!raf) paint(true); });
    ro.observe(cv);
    fit(); read();
    if (reduce) { t = 0.95; paint(true); return () => ro.disconnect(); }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    });
    io.observe(cv);
    t = 0.95; paint(true);
    return () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [scene]);

  return <canvas ref={ref} className="dm" role="img" aria-label={label} />;
}
