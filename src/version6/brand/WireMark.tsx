// v6 hero object: the Grain mark as a thin 3D wireframe that goes soft and foggy where the cursor is
// (after 21st.dev "GeometricBlurMesh": sharp hairlines far from the pointer, a wide Gaussian falloff near it).
//
// The mark is modelled as an extruded relief: each ring is the outline of its band (from the logo's stroke
// centreline, offset by half its width), plus the three dots and the core, all standing on one back plane at
// terraced heights (outer lowest, core highest). Every element gets a front outline, a back outline and the edges
// joining them. That is ~140 segments; each is drawn as one quad whose fragment shader computes the true distance
// to the segment (round caps), and the blur is per pixel from the cursor distance, so no subdivision is needed.
//
// Motion: a slow sway (never a full spin, so the mark always reads), leaning toward the cursor. It draws itself in
// when `start` flips true. Click or tap it: a ripple runs out from that point and each part (core, rings, dots) pops
// toward you and springs back, in the order the wave reaches it. `progress` (scroll) turns it, grows it and fogs every line before it fades.
import { useEffect, useRef, type RefObject } from "react";
import { CORE, RINGS } from "./grainMark";

type P2 = [number, number];
type P3 = [number, number, number];

// stroke centrelines with the rounded corners squared off (the wireframe reads cleaner with sharp corners)
const BANDS: { line: P2[]; w: number; h: number; ring: number }[] = [
  { line: [[305, 280], [305, 15], [15, 15], [15, 305], [280, 305]], w: 30, h: 30, ring: 0 },
  { line: [[260, 240], [260, 60], [60, 60], [60, 260], [240, 260]], w: 24, h: 40, ring: 1 },
  { line: [[219, 201], [219, 101], [101, 101], [101, 219], [201, 219]], w: 22, h: 50, ring: 2 },
];
const SQUARES = [
  ...RINGS.map((r, i) => ({ x: r.dot.x, y: r.dot.y, s: r.dot.s, h: [30, 40, 50][i], ring: i })),
  { x: CORE.x, y: CORE.y, s: CORE.s, h: 60, ring: 0 },
];
const BACK = -30;   // the back plane, in logo units (the mark is centred on z = 0)

/** outline of a band of width w around an axis-aligned polyline (mitred corners, butt ends) */
function bandOutline(line: P2[], w: number): P2[] {
  const h = w / 2, n = line.length;
  const nor = (i: number): P2 => {
    const [ax, ay] = line[i], [bx, by] = line[i + 1];
    const l = Math.hypot(bx - ax, by - ay);
    return [-(by - ay) / l, (bx - ax) / l];
  };
  const off = (s: number) => line.map(([x, y], i) => {
    const a = i > 0 ? nor(i - 1) : null, b = i < n - 1 ? nor(i) : null;
    const m: P2 = a && b ? [a[0] + b[0], a[1] + b[1]] : (a ?? b)!;
    return [x + m[0] * h * s, y + m[1] * h * s] as P2;
  });
  return [...off(1), ...off(-1).reverse()];
}

/** every edge of the relief, plus the parts it's made of (for the click ripple) */
type Comp = { poly: P2[]; cx: number; cy: number };
function buildEdges() {
  const edges: { a: P3; b: P3; ring: number; front: number; order: number; comp: number }[] = [];
  const comps: Comp[] = [];
  const to3 = ([x, y]: P2, z: number): P3 => [(x - 160) / 320, -(y - 160) / 320, z / 320];
  const solid = (poly: P2[], height: number, ring: number, order: number, center?: P2) => {
    const zf = BACK + height;
    const comp = comps.length;
    // rings swell about the mark's centre, squares about their own
    const [ccx, ccy] = center ?? [poly.reduce((a, q) => a + q[0], 0) / poly.length, poly.reduce((a, q) => a + q[1], 0) / poly.length];
    comps.push({ poly, cx: (ccx - 160) / 320, cy: -(ccy - 160) / 320 });
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const o = order + (i / poly.length) * 0.12;   // draw round the outline
      edges.push({ a: to3(p, zf), b: to3(q, zf), ring, front: 1, order: o, comp });
      edges.push({ a: to3(p, BACK), b: to3(q, BACK), ring, front: 0, order: o + 0.05, comp });
      edges.push({ a: to3(p, BACK), b: to3(p, zf), ring, front: 0.5, order: o + 0.08, comp });
    });
  };
  // core first, then the rings from the inside out, each dot just after its ring
  const core = SQUARES[3];
  solid([[core.x, core.y], [core.x + core.s, core.y], [core.x + core.s, core.y + core.s], [core.x, core.y + core.s]], core.h, 0, 0);
  [2, 1, 0].forEach((k, j) => {
    const b = BANDS[k];
    solid(bandOutline(b.line, b.w), b.h, b.ring, 0.12 + j * 0.16, [160, 160]);
    const d = SQUARES[k];
    solid([[d.x, d.y], [d.x + d.s, d.y], [d.x + d.s, d.y + d.s], [d.x, d.y + d.s]], d.h, d.ring, 0.2 + j * 0.16);
  });
  return { edges, comps };
}
const NCOMP = 7;

/** distance (logo units) from a point to a part: 0 inside it, else to its nearest edge */
function distToPoly(x: number, y: number, poly: P2[]) {
  let inside = false, best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i];
    if ((by > y) !== (ay > y) && x < ((ax - bx) * (y - by)) / (ay - by) + bx) inside = !inside;
    const dx = ax - bx, dy = ay - by, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - bx) * dx + (y - by) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - (bx + dx * t), y - (by + dy * t)));
  }
  return inside ? 0 : best;
}
/** a spring's ring-down: up, back, a smaller overshoot, settle */
const bounceAt = (t: number) => (t <= 0 ? 0 : Math.sin(t * 13.5) * Math.exp(-t * 4.4));

const VERT = `
attribute vec3 aA;
attribute vec3 aB;
attribute vec2 aCorner;   // x: along 0|1, y: side -1|1
attribute vec4 aMeta;     // ring index, front weight, draw order, part index
uniform mat3 uRot;
uniform vec2 uRes, uCenter, uMouse;
uniform float uScale, uReach, uMaxBlur, uTh, uDraw, uFog, uHover;
uniform vec4 uVeil;   // text block (device px): lines behind it fog over
uniform float uVeilK; // how present the text is (it fades on scroll)
uniform vec3 uC0, uC1, uC2;
uniform float uLift[7], uPop[7];   // click ripple: per part, toward the viewer / swell
uniform vec2 uCC[7];               // each part's centre (it swells about this)
varying vec2 vLocal, vPos;
varying float vLen, vAlpha, vBounce;
varying vec3 vColor;

vec3 bounce(vec3 p) {
  int c = int(aMeta.w + 0.5);
  vec2 cc = uCC[c];
  p.xy = cc + (p.xy - cc) * (1.0 + uPop[c]);
  p.z += uLift[c];
  return p;
}
vec2 proj(vec3 p) {
  p = uRot * p;
  float persp = 3.0 / (3.0 - p.z);
  return uCenter + vec2(p.x, -p.y) * persp * uScale;
}
void main() {
  float k = clamp((uDraw - aMeta.z) / 0.28, 0.0, 1.0);
  vec2 a = proj(bounce(aA));
  vec2 b = proj(bounce(mix(aA, aB, k)));
  vBounce = clamp(abs(uLift[int(aMeta.w + 0.5)]) / 0.13, 0.0, 1.0);
  vec2 d = b - a;
  float L = length(d);
  vec2 u = L > 1e-4 ? d / L : vec2(1.0, 0.0);
  vec2 n = vec2(-u.y, u.x);
  // how blurry this segment can get: from its closest point to the cursor
  float t = clamp(dot(uMouse - a, u) / max(L, 1e-4), 0.0, 1.0);
  float infl = (1.0 - smoothstep(0.0, uReach, distance(uMouse, a + u * t * L))) * uHover;
  // does this segment pass behind the text block? then it may blur there too
  vec2 lo = min(a, b), hi = max(a, b);
  float veil = step(uVeil.x - uMaxBlur, hi.x) * step(lo.x, uVeil.z + uMaxBlur) * step(uVeil.y - uMaxBlur, hi.y) * step(lo.y, uVeil.w + uMaxBlur) * 0.25 * uVeilK;
  float hw = uTh * 1.6 + max(max(infl, uFog * 1.4), max(veil, vBounce * 0.35)) * uMaxBlur + 2.0;
  vec2 pos = a + u * (aCorner.x * L + (aCorner.x * 2.0 - 1.0) * hw) + n * aCorner.y * hw;
  vLocal = vec2(dot(pos - a, u), dot(pos - a, n));
  vLen = L;
  vPos = pos;
  vColor = aMeta.x < 0.5 ? uC0 : aMeta.x < 1.5 ? uC1 : uC2;
  vAlpha = mix(0.3, 1.0, aMeta.y) * step(0.001, k);
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform vec2 uMouse;
uniform float uReach, uMaxBlur, uTh, uFog, uHover, uAlpha;
uniform vec4 uVeil;
uniform float uVeilK;
varying vec2 vLocal, vPos;
varying float vLen, vAlpha, vBounce;
varying vec3 vColor;
void main() {
  float d = length(vec2(max(0.0, max(-vLocal.x, vLocal.x - vLen)), vLocal.y));
  float infl = (1.0 - smoothstep(0.0, uReach, distance(vPos, uMouse))) * uHover;
  // behind the text: frosted (soft, fainter), easing in over a margin round the block
  vec2 q = max(uVeil.xy - vPos, vPos - uVeil.zw);
  float veil = (1.0 - smoothstep(0.0, uMaxBlur * 0.9, length(max(q, 0.0)))) * step(1.0, uVeil.z - uVeil.x) * uVeilK;
  // a bouncing part goes a little soft, like the cursor fog
  float blur = max(max(infl, uFog * 1.4), max(veil * 0.22, vBounce * 0.3)) * uMaxBlur + 0.7;
  float th = uTh * mix(1.0, 1.5, infl);
  float a = 1.0 - smoothstep(th - blur, th + blur, d);
  a *= (1.0 - infl * 0.3) * (1.0 - veil * 0.82) * vAlpha * uAlpha;
  gl_FragColor = vec4(vColor * a, a);
}`;

type Props = {
  className?: string;
  /** 0–1 scroll through the pinned hero */
  progress?: RefObject<number>;
  /** flips true when the page is ready: the wireframe draws itself in from then */
  start?: boolean;
  /** mark size as a fraction of min(width, height) */
  scale?: number;
  /** selector (within the canvas's parent) of the text block the lines should fog behind */
  veil?: string;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function hexToRgb(v: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(v.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function WireMark({ className = "wire-mark", progress, start = true, scale = 0.62, veil }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(start);
  useEffect(() => { startRef.current = start; }, [start]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!gl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);

    // geometry: 4 vertices per edge, 2 triangles
    const { edges, comps } = buildEdges();
    const STRIDE = 12;   // aA 3, aB 3, aCorner 2, aMeta 4
    const data = new Float32Array(edges.length * 4 * STRIDE);
    const idx = new Uint16Array(edges.length * 6);
    const corners: P2[] = [[0, -1], [0, 1], [1, -1], [1, 1]];
    edges.forEach((e, i) => {
      corners.forEach((c, j) => {
        data.set([...e.a, ...e.b, ...c, e.ring, e.front, e.order, e.comp], (i * 4 + j) * STRIDE);
      });
      idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    });
    const vbo = gl.createBuffer(), ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, offset * 4);
    };
    attr("aA", 3, 0); attr("aB", 3, 3); attr("aCorner", 2, 6); attr("aMeta", 4, 8);
    const U = Object.fromEntries(
      ["uRot", "uRes", "uCenter", "uMouse", "uScale", "uReach", "uMaxBlur", "uTh", "uDraw", "uFog", "uHover", "uAlpha", "uVeil", "uVeilK", "uC0", "uC1", "uC2", "uLift", "uPop", "uCC"]
        .map((n) => [n, gl.getUniformLocation(prog, n)]),
    );

    // overlapping lines take the brighter one instead of adding up (joints and crossings stay even)
    const minmax = gl.getExtension("EXT_blend_minmax");
    gl.enable(gl.BLEND);
    if (minmax) { gl.blendEquation(minmax.MAX_EXT); gl.blendFunc(gl.ONE, gl.ONE); }
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2fv(U.uCC, comps.flatMap((c) => [c.cx, c.cy]));

    let W = 0, H = 0, dpr = 1, raf = 0, visible = true, t0 = 0, drawAt = 0;
    let markY = 0.5, markScale = 1;   // from CSS: --mark-y (0–1 of the height), --mark-scale
    let mx = -1e4, my = -1e4, dmx = -1e4, dmy = -1e4, over = false, hover = 0, last = 0;
    // the lean toward the cursor, on a critically damped spring (position + velocity per axis)
    let lx = 0, ly = 0, vlx = 0, vly = 0;
    // the current pose, kept for mapping a click onto the mark
    let R = [1, 0, 0, 0, 1, 0, 0, 0, 1], sNow = 1, cxNow = 0, cyNow = 0, pNow = 0;
    // click ripples: when, and how far (logo units) the click was from each part
    let ripples: { at: number; d: number[] }[] = [];
    const lift = new Float32Array(NCOMP), pop = new Float32Array(NCOMP);

    const readColors = () => {
      const cs = getComputedStyle(cv);
      // a little lift toward white: the logo's rust is dark on the near-black stage (--mark-lift: 0 on a light stage)
      const lk = parseFloat(cs.getPropertyValue("--mark-lift"));
      const amt = Number.isFinite(lk) ? lk : 1;
      const lift = (c: [number, number, number], k: number) => c.map((v) => v + (1 - v) * k * amt) as [number, number, number];
      gl.uniform3fv(U.uC0, lift(hexToRgb(cs.getPropertyValue("--lg-a"), [0.78, 0.34, 0.21]), 0.12));
      gl.uniform3fv(U.uC1, lift(hexToRgb(cs.getPropertyValue("--lg-b"), [0.89, 0.48, 0.37]), 0.06));
      gl.uniform3fv(U.uC2, lift(hexToRgb(cs.getPropertyValue("--lg-c"), [0.94, 0.75, 0.65]), 0));
    };
    const fit = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      const cs = getComputedStyle(cv);
      markY = parseFloat(cs.getPropertyValue("--mark-y")) || 0.5;
      markScale = parseFloat(cs.getPropertyValue("--mark-scale")) || 1;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!t0) t0 = now;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      if (!drawAt && startRef.current) drawAt = now;
      const draw = reduce ? 1.2 : drawAt ? (now - drawAt) / 2000 * 1.2 : 0;   // 0 → 1.2 covers every edge's order + its run
      const p = progress?.current ?? 0;
      const t = reduce ? 0 : (now - t0) / 1000;

      // damped cursor (as in the reference), and how present it is
      dmx += (mx - dmx) * Math.min(1, 8 * dt); dmy += (my - dmy) * Math.min(1, 8 * dt);
      hover += ((over && !reduce ? 1 : 0) - hover) * Math.min(1, 2.5 * dt);

      const s = Math.min(W, H) * scale * markScale;
      const cx = W / 2, cy = H * markY;
      // lean toward the cursor. People look at the core, so the middle is calm: the offset is measured against the
      // mark's own size (not the window) and eased in (x·|x|), so small moves around the centre barely tilt it and the
      // lean only builds as the pointer moves out. It rides a critically damped spring, so it eases in and settles.
      const ease = (v: number) => { const c = Math.max(-1, Math.min(1, v)); return c * Math.abs(c); };
      // vertical: measured from the middle of the screen, not the mark. The mark sits high and the cursor mostly lives
      // on the text and pills below it, so measuring from the mark kept it tipped down.
      const tx = ease((dmx - cx) / (s * 1.5)) * hover, ty = ease((dmy - H * 0.5) / (s * 1.5)) * hover;
      const K = 34, C = 2 * Math.sqrt(K);
      vlx += (K * (tx - lx) - C * vlx) * dt; lx += vlx * dt;
      vly += (K * (ty - ly) - C * vly) * dt; ly += vly * dt;
      // while you're on it, its own sway quiets down so it settles and faces you
      const sway = 1 - hover * 0.6;
      const intro = 1 - smooth(0, 1, Math.min(1, draw / 1.2));
      const ry = Math.sin(t * 0.22) * 0.5 * sway + lx * 0.3 + intro * 0.9 + p * 1.4;
      const rx = 0.02 + Math.sin(t * 0.17) * 0.12 * sway + ly * 0.14 - intro * 0.35 + p * 0.25;   // faces you: no built-in downward pitch
      const rz = Math.sin(t * 0.1) * 0.04;
      const [sx, cxr, sy, cyr, sz, czr] = [Math.sin(rx), Math.cos(rx), Math.sin(ry), Math.cos(ry), Math.sin(rz), Math.cos(rz)];
      // R = Ry * Rx * Rz, column-major for GLSL
      const Rx = [1, 0, 0, 0, cxr, sx, 0, -sx, cxr];
      const Ry = [cyr, 0, -sy, 0, 1, 0, sy, 0, cyr];
      const Rz = [czr, sz, 0, -sz, czr, 0, 0, 0, 1];
      const mul = (a: number[], b: number[]) => {
        const o = new Array(9).fill(0);
        for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) o[c * 3 + r] += a[k * 3 + r] * b[c * 3 + k];
        return o;
      };
      R = mul(mul(Ry, Rx), Rz);
      gl.uniformMatrix3fv(U.uRot, false, R);

      // ripple: the wave travels ~560 logo units/s; each part springs when it arrives
      ripples = ripples.filter((r) => now - r.at < 3000);
      lift.fill(0); pop.fill(0);
      let squash = 0;
      for (const r of ripples) {
        const tt = (now - r.at) / 1000;
        squash += bounceAt(tt) * 0.035;
        for (let c = 0; c < NCOMP; c++) {
          const b = bounceAt(tt - r.d[c] / 560);
          lift[c] += b * 0.13; pop[c] += b * 0.08;
        }
      }
      gl.uniform1fv(U.uLift, lift);
      gl.uniform1fv(U.uPop, pop);

      const m = Math.min(W, H) * dpr;
      gl.uniform2f(U.uRes, cv.width, cv.height);
      gl.uniform2f(U.uCenter, cx * dpr, cy * dpr);
      gl.uniform2f(U.uMouse, dmx * dpr, dmy * dpr);
      gl.uniform1f(U.uScale, s * dpr * (1 + p * 0.5) * (1 - squash));
      sNow = s * (1 + p * 0.5); cxNow = cx; cyNow = cy; pNow = p;
      gl.uniform1f(U.uReach, m * 0.3);
      gl.uniform1f(U.uMaxBlur, m * 0.045);
      gl.uniform1f(U.uTh, 0.75 * dpr);
      gl.uniform1f(U.uDraw, draw);
      gl.uniform1f(U.uFog, smooth(0.06, 0.42, p));
      gl.uniform1f(U.uHover, hover);
      gl.uniform1f(U.uAlpha, 1 - smooth(0.3, 0.52, p));
      // the text block, measured live (it moves as the hero UI lifts away on scroll)
      gl.uniform1f(U.uVeilK, 1 - smooth(0, 0.28, p));
      const vb = veil ? cv.parentElement?.querySelector(veil) : null;
      if (vb) {
        const r = vb.getBoundingClientRect(), c = cv.getBoundingClientRect();
        gl.uniform4f(U.uVeil, (r.left - c.left) * dpr, (r.top - c.top) * dpr, (r.right - c.left) * dpr, (r.bottom - c.top) * dpr);
      } else gl.uniform4f(U.uVeil, 0, 0, 0, 0);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (startRef.current || reduce) gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);

      // keeps swaying while on screen; with reduced motion it only redraws when something changes
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = cv.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      if (dmx < -1e3) { dmx = mx; dmy = my; }
      over = mx >= 0 && my >= 0 && mx <= r.width && my <= r.height;
    };
    const onLeave = () => { over = false; cv.parentElement?.classList.remove("mark-hot"); };

    /** a point on screen (css px, canvas space) → logo units on the mark's middle plane, through the current pose */
    const toLogo = (px: number, py: number): P2 => {
      const qx = (px - cxNow) / sNow, qy = -(py - cyNow) / sNow;
      // camera at z = 3 looking down -z; the mark's plane has normal n = R·(0,0,1)
      const nx = R[6], ny = R[7], nz = R[8];
      const a = (nx * qx + ny * qy) / 3;
      const z = -3 * a / (nz - a || 1e-6);
      const P = [qx * (3 - z) / 3, qy * (3 - z) / 3, z];
      const lx = R[0] * P[0] + R[1] * P[1] + R[2] * P[2], ly = R[3] * P[0] + R[4] * P[1] + R[5] * P[2];
      return [lx * 320 + 160, 160 - ly * 320];
    };
    const onMark = ([x, y]: P2) => x > -12 && x < 332 && y > -12 && y < 332;
    const onHover = (e: PointerEvent) => {
      if (e.pointerType === "touch" || pNow > 0.2) return;
      const r = cv.getBoundingClientRect();
      const hot = onMark(toLogo(e.clientX - r.left, e.clientY - r.top)) && !(e.target as Element).closest?.("a, button, input, label");
      cv.parentElement?.classList.toggle("mark-hot", hot);
    };
    const onDown = (e: PointerEvent) => {
      if (reduce || pNow > 0.2 || e.button > 0) return;
      if ((e.target as Element).closest?.("a, button, input, textarea, select, label, .site-header")) return;
      const r = cv.getBoundingClientRect();
      const [x, y] = toLogo(e.clientX - r.left, e.clientY - r.top);
      if (!onMark([x, y])) return;
      ripples.push({ at: performance.now(), d: comps.map((c) => distToPoly(x, y, c.poly)) });
      if (ripples.length > 6) ripples.shift();
      kick();
    };

    readColors(); fit(); kick();
    const ro = new ResizeObserver(() => { fit(); kick(); });
    ro.observe(cv);
    const host = cv.closest(".grain-hero");
    const mo = new MutationObserver(() => { readColors(); kick(); });
    if (host) mo.observe(host, { attributes: true, attributeFilter: ["data-theme", "data-palette"] });
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = 0; kick(); });
    io.observe(cv);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointermove", onHover, { passive: true });
    window.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", kick, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect(); io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointermove", onHover);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", kick);
      gl.deleteBuffer(vbo); gl.deleteBuffer(ibo);
      gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, [progress, scale, veil]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
