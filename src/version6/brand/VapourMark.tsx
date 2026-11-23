// v6 hero object (2026-11-20): the Grain mark as volumetric vapour, ported from the "dry-ice vapour" WebGL2 demo
// Thakur shared (the DeepMind "4" look), with our logo in its own colours instead of a white glyph.
//   · the mark is a soft vapour body: a blurred mask of the logo (plus a faint halo), breathing with drifting noise
//   · ~110 "anchor" smoke puffs sit inside it, slowly turning and breathing around home spots, for volume
//   · sweeping the pointer across it: a small disturbance field (erosion · haze · bend) thins and parts the body
//     where you swept and pulls it along the stroke; wake puffs peel off, bloom, spin, ride a curling air current and
//     fade over ~2s; nearby anchor puffs are shoved and spring back. The field decays, so the mark re-condenses.
//   · smoke takes the colour of the ring it came off (rust smoke off rust, peach off peach)
//   · procedural puff atlas (four cloud shapes with baked normals), so no external texture; transparent canvas
//     over our own stage, so it works on paper and in dark mode
//   · on load it condenses in; a click blows a burst; scrolling (`progress`) evaporates it into rising smoke
//   · tiny Grain marks drift and twinkle across the stage (the demo's micro-glyphs)
//   · no WebGL2, or reduced motion: the still mark
import { useEffect, useRef, type RefObject } from "react";
import { CORE, RINGS, rectPath } from "./grainMark";

type Props = {
  className?: string;
  /** scroll progress 0 → 1: the mark evaporates into rising smoke and fades */
  progress?: RefObject<number>;
  /** when it flips true the mark condenses in */
  start?: boolean;
  /** mark size as a share of the stage's short side (× --mark-scale from CSS) */
  scale?: number;
};

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function drawMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha = 1) {
  const k = size / 320;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(k, k);
  for (const r of RINGS) {
    ctx.strokeStyle = r.color; ctx.lineWidth = r.stroke.width; ctx.lineJoin = r.stroke.join; ctx.lineCap = "butt";
    ctx.stroke(new Path2D(r.stroke.d));
    ctx.fillStyle = r.color; ctx.fill(new Path2D(r.fillets));
    ctx.fillStyle = r.dot.color; ctx.fill(new Path2D(rectPath(r.dot)));
  }
  ctx.fillStyle = CORE.color; ctx.fill(new Path2D(rectPath(CORE)));
  ctx.restore();
}

/* ── procedural 2×2 smoke-puff atlas: density in A, baked surface normals in G/B (from the demo) ── */
let atlasCache: HTMLCanvasElement | null = null;
function puffAtlas() {
  if (atlasCache) return atlasCache;
  const TILE = 160, SIZE = TILE * 2;
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(SIZE, SIZE), data = img.data;
  const hash = (x: number, y: number, s: number) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453123; return n - Math.floor(n); };
  const vn = (x: number, y: number, s: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), cc = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * ux + (cc - a) * uy + (a - b - cc + d) * ux * uy;
  };
  const fbm = (x: number, y: number, s: number) => {
    let v = 0, amp = 0.52, f = 1;
    for (let i = 0; i < 5; i++) { v += amp * vn(x * f, y * f, s + i * 19.3); const nx = x * 0.8 - y * 0.6, ny = x * 0.6 + y * 0.8; x = nx; y = ny; f *= 2.04; amp *= 0.5; }
    return v;
  };
  const ss = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const lobes = [
    [[0, 0, 0.64, 0.85], [-0.22, -0.1, 0.48, 0.55], [0.24, 0.12, 0.46, 0.52], [-0.06, 0.24, 0.42, 0.46]],
    [[0.02, -0.02, 0.6, 0.8], [0.22, -0.18, 0.45, 0.56], [-0.2, 0.14, 0.5, 0.54], [0.08, 0.22, 0.4, 0.42]],
    [[-0.03, 0.03, 0.62, 0.82], [-0.25, -0.14, 0.44, 0.5], [0.18, -0.2, 0.46, 0.48], [0.2, 0.16, 0.44, 0.52]],
    [[0, 0.02, 0.58, 0.78], [-0.18, 0.2, 0.46, 0.52], [0.24, -0.06, 0.48, 0.56], [-0.16, -0.2, 0.42, 0.48]],
  ];
  const A = new Float32Array(TILE * TILE);
  for (let q = 0; q < 4; q++) {
    const qx = q % 2, qy = Math.floor(q / 2), seed = 11.7 + q * 37.3;
    for (let y = 0; y < TILE; y++) {
      const ny = (y / (TILE - 1)) * 2 - 1;
      for (let x = 0; x < TILE; x++) {
        const nx = (x / (TILE - 1)) * 2 - 1;
        const wx = (fbm(nx * 1.9 + 2.3, ny * 1.9 + 1.1, seed) - 0.5) * 0.46, wy = (fbm(nx * 1.9 - 1.7, ny * 1.9 + 3.4, seed + 7.1) - 0.5) * 0.46;
        let sum = 0;
        for (const [lx, ly, lr, lw] of lobes[q]) {
          const d = Math.hypot(nx + wx * 0.55 - lx, ny + wy * 0.55 - ly) / lr;
          if (d < 1) { const f = 1 - d * d; sum += f * f * lw; }
        }
        const outer = 1 - ss(0.46, 0.95, Math.hypot(nx, ny));
        const cloud = ss(0.18, 0.88, fbm((nx + wx) * 2.4 + 4, (ny + wy) * 2.4 + 4, seed + 13.5) * 0.72 + fbm(nx * 5.2 - wy * 1.1, ny * 5.2 + wx * 1.1, seed + 29.2) * 0.28);
        A[y * TILE + x] = Math.max(0, Math.min(1, Math.min(1, sum * 0.78) * outer * (0.42 + 0.88 * cloud)));
      }
    }
    for (let y = 0; y < TILE; y++) {
      const y0 = Math.max(0, y - 2), y1 = Math.min(TILE - 1, y + 2);
      for (let x = 0; x < TILE; x++) {
        const x0 = Math.max(0, x - 2), x1 = Math.min(TILE - 1, x + 2), cv = A[y * TILE + x];
        const gx = (A[y * TILE + x1] - A[y * TILE + x0]) * 2.6, gy = (A[y1 * TILE + x] - A[y0 * TILE + x]) * 2.6;
        const i = ((qy * TILE + y) * SIZE + (qx * TILE + x)) * 4;
        data[i] = Math.round(Math.min(1, cv * 1.15) * 255);
        data[i + 1] = Math.round(Math.max(0, Math.min(1, 0.5 - gx * 0.5)) * 255);
        data[i + 2] = Math.round(Math.max(0, Math.min(1, 0.5 + gy * 0.5)) * 255);
        data[i + 3] = Math.round(cv * 255);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  atlasCache = c;
  return c;
}

/* ── shaders (GLSL ES 3.00) ── */
const QUAD_VS = `#version 300 es
layout(location = 0) in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }`;

// R = erosion, G = lingering haze, BA = a gentle bend along the stroke (from the demo)
const DISTURB_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uPrev; uniform vec2 uTexel, uAspect, uPoint, uDelta;
uniform float uSpeed, uRadius, uDt, uRecondense, uHasStroke;
void main() {
  float dt60 = uDt * 60.;
  vec4 cur = texture(uPrev, vUv);
  vec2 off = (cur.ba - .5) * 2.;
  vec2 tr = clamp(vUv - (off * .010 * dt60) / uAspect, vec2(.002), vec2(.998));
  vec4 c = texture(uPrev, tr), l = texture(uPrev, tr - vec2(uTexel.x * 1.4, 0.)), r = texture(uPrev, tr + vec2(uTexel.x * 1.4, 0.));
  vec4 t = texture(uPrev, tr + vec2(0., uTexel.y * 1.4)), b = texture(uPrev, tr - vec2(0., uTexel.y * 1.4));
  vec4 d = (c * 4. + l + r + t + b) / 8.;
  float erosion = d.r * pow(1. - clamp(uRecondense * 1.15, .004, .08), dt60);
  float haze = d.g * pow(1. - clamp(uRecondense * .78, .003, .06), dt60);
  vec2 bend = (d.ba - .5) * 2. * pow(.945, dt60);
  if (uHasStroke > .5) {
    vec2 q = (vUv - uPoint) * uAspect;
    float r2 = max(uRadius * uRadius, 1e-5), brush = exp(-dot(q, q) / r2), wide = exp(-dot(q, q) / (r2 * 2.8));
    float imp = clamp(uSpeed * 12., 0., 1.);
    erosion = clamp(erosion + brush * imp * .62, 0., 1.);
    haze = clamp(haze + wide * imp * .34, 0., 1.);
    bend = clamp(bend + uDelta * wide * 14., vec2(-1.), vec2(1.));
  }
  o = vec4(erosion, haze, bend * .5 + .5);
}`;

// the vapour body: the logo's soft mask, parted, hazed and bent by the field, breathing with noise. Transparent
// (premultiplied) over our own stage, no backdrop.
const BASE_FS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uMask, uDisturb; uniform vec2 uAspect; uniform vec4 uRect; uniform float uTime, uErosion, uAlpha, uEvap;
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1., 0.)), u.x), mix(h12(i + vec2(0., 1.)), h12(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p) { float v = 0., a = .5; mat2 R = mat2(.8, .6, -.6, .8); for (int i = 0; i < 4; i++) { v += a * vn(p); p = R * p * 2.04 + vec2(13.2, 7.8); a *= .5; } return v; }
vec4 mask(vec2 uv) { vec2 m = (uv - uRect.xy) / uRect.zw; if (m.x < 0. || m.x > 1. || m.y < 0. || m.y > 1.) return vec4(0.); return texture(uMask, m); }
void main() {
  vec4 dd = texture(uDisturb, vUv);
  float erosion = clamp(dd.r + uEvap, 0., 1.), haze = clamp(dd.g + uEvap * .6, 0., 1.);
  vec2 bend = (dd.ba - .5) * 2.;
  float cloud = fbm(vUv * uAspect * 6. + vec2(uTime * .035, -uTime * .028));
  vec2 w = vUv - (bend * .026) / uAspect;
  w.y -= uEvap * (.4 + cloud) * .06;
  vec4 core = mask(w);
  float k = .012 * uRect.w / .5;
  vec4 wide = (mask(w + vec2(k, 0.) / uAspect) + mask(w - vec2(k, 0.) / uAspect) + mask(w + vec2(0., k) / uAspect) + mask(w - vec2(0., k) / uAspect)) * .25;
  vec4 col = mix(core, max(core, wide * .92), clamp(haze * 1.2, 0., .85));
  col *= 1. - clamp(erosion * uErosion, 0., .85);
  col *= mix(.96 + cloud * .08, .62 + cloud * .72, clamp(erosion * 1.1, 0., 1.));
  o = col * uAlpha;
}`;

// instanced rotating smoke puffs (one draw call), lit softly from the upper left, in the colour they peeled off
const PUFF_VS = `#version 300 es
layout(location = 0) in vec2 aCorner; layout(location = 1) in vec4 aA; layout(location = 2) in vec4 aB; layout(location = 3) in vec4 aC;
uniform vec2 uAspect;
out vec2 vTile; out float vAlpha, vRot, vLit, vSoft; out vec3 vCol;
void main() {
  float c = cos(aA.w), s = sin(aA.w);
  vec2 uv = aA.xy + (mat2(c, -s, s, c) * aCorner * aA.z) / uAspect;
  gl_Position = vec4(uv * 2. - 1., 0., 1.);
  float tile = floor(aB.y + .5);
  vTile = vec2(mod(tile, 2.), floor(tile * .5)) * .5 + (aCorner + .5) * .5;
  vAlpha = aB.x; vRot = aA.w; vLit = aB.z; vSoft = aB.w; vCol = aC.rgb;
}`;
const PUFF_FS = `#version 300 es
precision highp float;
in vec2 vTile; in float vAlpha, vRot, vLit, vSoft; in vec3 vCol; uniform sampler2D uAtlas; uniform float uDark; out vec4 o;
void main() {
  vec4 t = texture(uAtlas, vTile);
  if (t.a < .004 || vAlpha < .002) discard;
  float a = pow(t.a, mix(.88, 1.25, vSoft)) * vAlpha;
  vec2 n = (t.gb - .5) * 2.; float c = cos(vRot), s = sin(vRot); n = mat2(c, -s, s, c) * n;
  float ndl = clamp(dot(n, normalize(vec2(-.55, .85))) * .85 + .5, 0., 1.);
  // shadow side a touch deeper, lit side lifted toward white: reads as volume on paper and on dark
  vec3 col = mix(vCol * mix(.82, .92, uDark), mix(vCol, vec3(1.), .38), clamp(ndl * .8 + vLit * .25, 0., 1.));
  a = clamp(a, 0., .6);
  o = vec4(col * a, a);
}`;

export default function VapourMark({ className = "vapour-mark", progress, start = true, scale = 0.5 }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const motesRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(start);
  useEffect(() => { startRef.current = start; }, [start]);

  useEffect(() => {
    const host = root.current, cv = glRef.current, mc = motesRef.current;
    if (!host || !cv || !mc) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mctx = mc.getContext("2d")!;
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true, alive = true;
    let aspect: [number, number] = [1, 1];
    let rect: [number, number, number, number] = [0, 0, 1, 1];    // the mask square in canvas uv (x, y bottom-up, w, h)
    let ks = 1;                                                     // size of things relative to the demo's full-screen glyph
    const PAD = 0.72;                                               // the logo fills 72% of the mask square (room for the halo)
    const markPx = () => {
      const cs = getComputedStyle(host);
      const my = parseFloat(cs.getPropertyValue("--mark-y")) || 0.4, ms = parseFloat(cs.getPropertyValue("--mark-scale")) || 1;
      const s = Math.min(W, H) * scale * ms;
      return { cx: W / 2, cy: H * my, s };
    };

    // ── tiny drifting marks
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    drawMark(sprite.getContext("2d")!, 32, 32, 60);
    type Mote = { x: number; y: number; vx: number; vy: number; s: number; a: number; ph: number };
    let motes: Mote[] = [];
    const seedMotes = () => {
      const n = Math.round(Math.min(46, Math.max(12, (W * H) / 36000)));
      motes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.35) * 5, vy: -(4 + Math.random() * 9), s: 8 + Math.random() * 4, a: 0.16 + Math.random() * 0.3, ph: Math.random() * 6.28 }));
    };

    const fit = () => {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      mc.width = Math.round(W * dpr); mc.height = Math.round(H * dpr);
      const a = W / H;
      aspect = a >= 1 ? [a, 1] : [1, 1 / a];
      const m = markPx(), sq = m.s / PAD;
      rect = [(m.cx - sq / 2) / W, 1 - (m.cy + sq / 2) / H, sq / W, sq / H];
      ks = (sq / H) * (aspect[1]) / 0.9;
      seedMotes();
    };

    const drawStill = () => {
      const m = markPx(), p = progress?.current ?? 0;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, W, H);
      if (startRef.current) drawMark(mctx, m.cx, m.cy, m.s, 1 - smooth(0.22, 0.4, p));
    };

    const gl = reduce ? null : cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    let cleanupGl = () => {};
    let rebuild = () => {};
    let frameGl: (dt: number, now: number) => void = () => {};
    let onPointer: (u: number, v: number, start: boolean) => void = () => {};
    let onClick: (u: number, v: number) => void = () => {};

    if (gl) {
      const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
      const prog = (vs: string, fs: string) => {
        const p = gl.createProgram()!;
        gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
        const u: Record<string, WebGLUniformLocation | null> = {};
        const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
        for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i)!; u[a.name] = gl.getUniformLocation(p, a.name); }
        return { p, u };
      };
      const PD = prog(QUAD_VS, DISTURB_FS), PB = prog(QUAD_VS, BASE_FS), PP = prog(PUFF_VS, PUFF_FS);

      const tex2d = (filter: number = gl.LINEAR) => {
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
      };
      // the puff atlas
      const atlas = tex2d(gl.LINEAR_MIPMAP_LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, puffAtlas());
      gl.generateMipmap(gl.TEXTURE_2D);

      // the disturbance field (256², RGBA8 ping-pong)
      const D = 256;
      const target = () => {
        const t = tex2d();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, D, D, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fb = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        gl.viewport(0, 0, D, D); gl.clearColor(0, 0, 0.5, 0.5); gl.clear(gl.COLOR_BUFFER_BIT);
        return { t, fb };
      };
      let FA = target(), FB = target();

      // the logo mask (colour, premultiplied) + a CPU grid of its density and colour, for spawning smoke
      const MS = 768, G = 128;
      const maskCanvas = document.createElement("canvas"); maskCanvas.width = maskCanvas.height = MS;
      const mctx2 = maskCanvas.getContext("2d")!;
      const small = document.createElement("canvas"); small.width = small.height = G;
      const sctx = small.getContext("2d", { willReadFrequently: true })!;
      const gridA = new Float32Array(G * G), gridC = new Float32Array(G * G * 3);
      const maskTex = tex2d();
      const buildMask = () => {
        mctx2.clearRect(0, 0, MS, MS);
        const s = MS * PAD;
        mctx2.filter = "blur(20px)"; drawMark(mctx2, MS / 2, MS / 2, s, 0.32);   // the faint halo
        mctx2.filter = "blur(3px)"; drawMark(mctx2, MS / 2, MS / 2, s, 0.96);    // the soft body
        mctx2.filter = "none";
        gl.bindTexture(gl.TEXTURE_2D, maskTex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        sctx.clearRect(0, 0, G, G); sctx.drawImage(maskCanvas, 0, 0, G, G);
        const px = sctx.getImageData(0, 0, G, G).data;
        for (let i = 0; i < G * G; i++) { gridA[i] = px[i * 4 + 3] / 255; gridC[i * 3] = px[i * 4] / 255; gridC[i * 3 + 1] = px[i * 4 + 1] / 255; gridC[i * 3 + 2] = px[i * 4 + 2] / 255; }
      };
      buildMask();
      const cell = (u: number, v: number) => {
        const mx = (u - rect[0]) / rect[2], my = (v - rect[1]) / rect[3];
        if (mx < 0 || mx >= 1 || my < 0 || my >= 1) return -1;
        return Math.min(G - 1, Math.floor((1 - my) * G)) * G + Math.min(G - 1, Math.floor(mx * G));
      };
      const density = (u: number, v: number) => { const i = cell(u, v); return i < 0 ? 0 : gridA[i]; };
      const colourAt = (u: number, v: number): [number, number, number] => { const i = cell(u, v); return i < 0 ? [0.8, 0.4, 0.3] : [gridC[i * 3], gridC[i * 3 + 1], gridC[i * 3 + 2]]; };

      // ── puffs
      const MAX = 560, FL = 12;
      const inst = new Float32Array(MAX * FL);
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const corners = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, corners);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const ibuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
      gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
      for (let k = 0; k < 3; k++) { gl.enableVertexAttribArray(1 + k); gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, FL * 4, k * 16); gl.vertexAttribDivisor(1 + k, 1); }
      gl.bindVertexArray(null);
      const quad = gl.createVertexArray()!;
      gl.bindVertexArray(quad);
      const qb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, qb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      type Anchor = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; rot: number; spin0: number; spin: number; size: number; boost: number; a: number; ex: number; tile: number; ph: number; c: [number, number, number] };
      type Wake = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; age: number; life: number; s0: number; s1: number; a: number; tile: number; seed: number; c: [number, number, number] };
      const anchors: Anchor[] = [], wakes: Wake[] = [];
      const seedAnchors = () => {
        anchors.length = 0;
        const cells: [number, number, number][] = [];
        for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) { const v = gridA[gy * G + gx]; if (v > 0.3) cells.push([(gx + 0.5) / G, 1 - (gy + 0.5) / G, v]); }
        for (let i = 0; i < 110 && cells.length; i++) {
          const [mx, my, v] = cells[Math.floor(Math.random() * cells.length)];
          const hx = mx + (Math.random() - 0.5) * 0.018, hy = my + (Math.random() - 0.5) * 0.018;
          const ci = Math.min(G - 1, Math.floor((1 - hy) * G)) * G + Math.min(G - 1, Math.floor(hx * G));
          anchors.push({ hx, hy, x: 0, y: 0, vx: 0, vy: 0, rot: Math.random() * 6.28, spin0: (Math.random() - 0.5) * 0.22, spin: 0, size: 0.07 + Math.random() * 0.07, boost: 0, a: (0.08 + Math.random() * 0.06) * Math.min(1, v * 1.15), ex: 0, tile: Math.floor(Math.random() * 4), ph: Math.random() * 6.28, c: [gridC[ci * 3], gridC[ci * 3 + 1], gridC[ci * 3 + 2]] });
        }
        for (const p of anchors) { p.x = rect[0] + p.hx * rect[2]; p.y = rect[1] + p.hy * rect[3]; }
      };
      seedAnchors();

      const air = (x: number, y: number, t: number) => {
        const a = Math.sin(x * 7.3 + t * 0.55) * Math.cos(y * 6.8 - t * 0.42), b = Math.cos(x * 6.1 - t * 0.48) * Math.sin(y * 7.9 + t * 0.38);
        return [(a - b * 0.6) * 0.045, 0.022 + (b + a * 0.5) * 0.042];
      };
      const spawnWake = (u: number, v: number, dx: number, dy: number, speed: number, m: number, lifeK = 1) => {
        const n = Math.min(5, Math.max(1, Math.round((1.4 + speed * 42) * m)));
        const dirX = dx / Math.max(speed, 1e-4), dirY = dy / Math.max(speed, 1e-4);
        for (let i = 0; i < n; i++) {
          if (wakes.length >= MAX - anchors.length - 8) wakes.shift();
          const ang = Math.random() * 6.28, rr = Math.random() * 0.036 * ks;
          const px = u + (Math.cos(ang) * rr) / aspect[0], py = v + (Math.sin(ang) * rr) / aspect[1];
          const fan = (Math.random() - 0.5) * 0.85, mag = (0.12 + Math.min(speed * 11.5, 0.55) * (0.65 + Math.random() * 0.7)) * ks;
          const s0 = (0.068 + Math.random() * 0.052) * ks;
          wakes.push({
            x: px, y: py, vx: (dirX - dirY * fan * 0.55) * mag, vy: (dirY + dirX * fan * 0.55) * mag + 0.015 * ks,
            rot: Math.random() * 6.28, spin: (Math.random() < 0.5 ? -1 : 1) * (0.24 + Math.random() * 0.44) * 0.85,
            age: 0, life: 2.15 * (0.72 + Math.random() * 0.58) * lifeK, s0, s1: s0 * (2.35 + Math.random() * 1.15) * 1.05,
            a: (0.16 + Math.random() * 0.1) * Math.min(1, m * 1.35), tile: Math.floor(Math.random() * 4), seed: Math.random() * 10, c: colourAt(u, v),
          });
        }
      };
      const shove = (u: number, v: number, dx: number, dy: number, speed: number) => {
        const R = 0.145 * ks, r2 = R * R, push = Math.min(1.35, 0.35 + speed * 18);
        for (const p of anchors) {
          const ox = (p.x - u) * aspect[0], oy = (p.y - v) * aspect[1], d2 = ox * ox + oy * oy;
          if (d2 < r2) {
            const w = Math.exp(-d2 / (r2 * 0.38)), inv = 1 / (Math.sqrt(d2) + 0.02);
            p.vx += (dx * 16 + ox * inv * 0.06) * w * push; p.vy += (dy * 16 + oy * inv * 0.06) * w * push;
            p.spin += (ox * dy - oy * dx) * 28 * w * 0.85;
            p.ex = Math.min(1, p.ex + w * 0.65); p.boost = Math.min(1, p.boost + w * 0.55);
          }
        }
      };
      const strokes: { x: number; y: number; dx: number; dy: number; s: number }[] = [];
      const segment = (x0: number, y0: number, x1: number, y1: number, k = 1) => {
        const dx = (x1 - x0) * aspect[0], dy = (y1 - y0) * aspect[1], dist = Math.hypot(dx, dy);
        if (dist < 0.0012) return;
        const steps = Math.min(8, Math.max(1, Math.ceil(dist / 0.016)));
        const sx = (dx / steps) * k, sy = (dy / steps) * k, sp = Math.hypot(sx, sy);
        for (let i = 1; i <= steps; i++) {
          const f = i / steps, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, m = density(x, y);
          if (m > 0.05) { spawnWake(x, y, sx, sy, sp, m); shove(x, y, sx, sy, sp); strokes.push({ x, y, dx: sx, dy: sy, s: sp * m }); }
          else shove(x, y, sx, sy, sp * 0.65);
        }
      };
      let ptr: [number, number] | null = null;
      onPointer = (u, v, startStroke) => { if (!ptr || startStroke) { ptr = [u, v]; return; } segment(ptr[0], ptr[1], u, v); ptr = [u, v]; };
      onClick = (u, v) => {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * 6.28, r = 0.03 * ks, x = u + (Math.cos(a) * r) / aspect[0], y = v + (Math.sin(a) * r) / aspect[1];
          const m = Math.max(0.35, density(x, y));
          spawnWake(x, y, Math.cos(a) * 0.02, Math.sin(a) * 0.02, 0.03, m);
          strokes.push({ x, y, dx: Math.cos(a) * 0.01, dy: Math.sin(a) * 0.01, s: 0.06 * m });
        }
      };

      rebuild = () => { for (const p of anchors) { p.x = rect[0] + p.hx * rect[2]; p.y = rect[1] + p.hy * rect[3]; p.vx = p.vy = 0; } };

      let t0 = 0, lastP = 0;
      frameGl = (dt, now) => {
        const p = progress?.current ?? 0;
        if (startRef.current && !t0) t0 = now;
        const intro = t0 ? smooth(0, 1.8, (now - t0) / 1000) : 0;
        const ev = smooth(0.02, 0.3, p);
        const time = now / 1000, dt60 = dt * 60;
        const dark = !!host.closest('[data-theme="dark"]');

        // scrolling away: the mark evaporates, smoke rising off it
        if (p > lastP + 0.0005 && ev > 0 && ev < 1) {
          const n = Math.min(6, Math.ceil((p - lastP) * 400));
          for (let i = 0; i < n; i++) {
            const u = rect[0] + rect[2] * (0.14 + Math.random() * 0.72), v = rect[1] + rect[3] * (0.14 + Math.random() * 0.72), m = density(u, v);
            if (m > 0.2) spawnWake(u, v, (Math.random() - 0.5) * 0.004, 0.012, 0.012, m, 0.8);
          }
        }
        lastP = p;

        // ── pass 1: the disturbance field
        gl.disable(gl.BLEND);
        gl.bindVertexArray(quad);
        gl.useProgram(PD.p);
        gl.uniform2f(PD.u.uTexel, 1 / D, 1 / D); gl.uniform2f(PD.u.uAspect, aspect[0], aspect[1]);
        gl.uniform1f(PD.u.uRadius, 0.068 * ks); gl.uniform1f(PD.u.uRecondense, 0.018); gl.uniform1i(PD.u.uPrev, 0);
        const steps = Math.max(1, Math.min(strokes.length, 8));
        for (let i = 0; i < steps; i++) {
          const s = strokes[i];
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FA.t);
          gl.uniform1f(PD.u.uDt, dt / steps);
          gl.uniform1f(PD.u.uHasStroke, s ? 1 : 0);
          gl.uniform2f(PD.u.uPoint, s ? s.x : -10, s ? s.y : -10); gl.uniform2f(PD.u.uDelta, s ? s.dx : 0, s ? s.dy : 0); gl.uniform1f(PD.u.uSpeed, s ? s.s : 0);
          gl.bindFramebuffer(gl.FRAMEBUFFER, FB.fb); gl.viewport(0, 0, D, D);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          [FA, FB] = [FB, FA];
        }
        strokes.length = 0;

        // ── pass 2: the vapour body
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(PB.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(PB.u.uMask, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, FA.t); gl.uniform1i(PB.u.uDisturb, 1);
        gl.uniform2f(PB.u.uAspect, aspect[0], aspect[1]); gl.uniform4f(PB.u.uRect, rect[0], rect[1], rect[2], rect[3]);
        gl.uniform1f(PB.u.uTime, time); gl.uniform1f(PB.u.uErosion, 0.95); gl.uniform1f(PB.u.uEvap, ev);
        const fade = 1 - smooth(0.22, 0.42, p);
        gl.uniform1f(PB.u.uAlpha, intro * fade);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // ── pass 3: the puffs
        let n = 0;
        const springK = 0.016 + 0.018 * 1.4, damp = Math.pow(0.925, dt60), exDecay = Math.pow(1 - 0.018 * 1.1, dt60);
        for (const q of anchors) {
          if (n >= MAX) break;
          const hx = rect[0] + q.hx * rect[2], hy = rect[1] + q.hy * rect[3];
          const bx = (Math.sin(time * 0.42 + q.ph) * 0.008 * ks) / aspect[0], by = (Math.cos(time * 0.36 + q.ph * 1.3) * 0.008 * ks) / aspect[1];
          q.vx += (hx + bx - q.x) * aspect[0] * springK * dt60 * 0.14;
          q.vy += (hy + by - q.y) * aspect[1] * springK * dt60 * 0.14;
          const [ax, ay] = air(q.x * aspect[0], q.y * aspect[1], time);
          q.vx += ax * q.ex * 0.25 * 0.85 * dt; q.vy += ay * q.ex * 0.25 * 0.85 * dt;
          q.vx *= damp; q.vy *= damp;
          q.x += (q.vx * dt) / aspect[0]; q.y += (q.vy * dt) / aspect[1];
          q.spin *= Math.pow(0.95, dt60); q.rot += (q.spin0 * 0.85 + q.spin) * dt;
          q.ex *= exDecay; q.boost *= Math.pow(0.965, dt60);
          const o = n * FL;
          inst[o] = q.x; inst[o + 1] = q.y; inst[o + 2] = q.size * ks * (1 + q.boost * 0.95); inst[o + 3] = q.rot;
          inst[o + 4] = q.a * (0.95 + q.ex * 0.85) * intro * fade * (1 - ev * 0.6); inst[o + 5] = q.tile; inst[o + 6] = q.ex * 0.55; inst[o + 7] = 0.25 + q.boost * 0.45;
          inst[o + 8] = q.c[0]; inst[o + 9] = q.c[1]; inst[o + 10] = q.c[2]; inst[o + 11] = 0;
          n++;
        }
        const drag = Math.pow(0.956, dt60);
        for (let i = wakes.length - 1; i >= 0; i--) {
          const w = wakes[i];
          w.age += dt;
          if (w.age >= w.life) { wakes.splice(i, 1); continue; }
          const t = w.age / w.life;
          const [ax, ay] = air(w.x * aspect[0] + w.seed * 0.1, w.y * aspect[1], time);
          w.vx = w.vx * drag + ax * 0.85 * dt * 1.45 * ks; w.vy = w.vy * drag + ay * 0.85 * dt * 1.45 * ks;
          w.x += (w.vx * dt) / aspect[0]; w.y += (w.vy * dt) / aspect[1];
          w.rot += w.spin * (1 - t * 0.35) * dt;
          const size = w.s0 + (w.s1 - w.s0) * (1 - Math.pow(1 - t, 2.2));
          const a = w.a * Math.min(1, t / 0.14) * Math.pow(1 - Math.max(0, (t - 0.14) / 0.86), 1.85) * fade;
          if (n < MAX && a > 0.002) {
            const o = n * FL;
            inst[o] = w.x; inst[o + 1] = w.y; inst[o + 2] = size; inst[o + 3] = w.rot;
            inst[o + 4] = a; inst[o + 5] = w.tile; inst[o + 6] = (1 - t) * 0.65; inst[o + 7] = 0.2 + t * 0.8;
            inst[o + 8] = w.c[0]; inst[o + 9] = w.c[1]; inst[o + 10] = w.c[2]; inst[o + 11] = 0;
            n++;
          }
        }
        if (n > 0) {
          gl.useProgram(PP.p);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas); gl.uniform1i(PP.u.uAtlas, 0);
          gl.uniform2f(PP.u.uAspect, aspect[0], aspect[1]); gl.uniform1f(PP.u.uDark, dark ? 1 : 0);
          gl.bindVertexArray(vao);
          gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst.subarray(0, n * FL));
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
          gl.bindVertexArray(null);
        }
        gl.disable(gl.BLEND);
      };
      cleanupGl = () => {
        for (const f of [FA, FB]) { gl.deleteTexture(f.t); gl.deleteFramebuffer(f.fb); }
        for (const t of [atlas, maskTex]) gl.deleteTexture(t);
        for (const b of [corners, ibuf, qb]) gl.deleteBuffer(b);
        gl.deleteVertexArray(vao); gl.deleteVertexArray(quad);
        for (const p of [PD, PB, PP]) gl.deleteProgram(p.p);
      };
    }

    const drawMotes = (dt: number, now: number) => {
      const p = progress?.current ?? 0;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, W, H);
      const fade = (startRef.current ? 1 : 0) * (1 - smooth(0.22, 0.42, p));
      if (fade <= 0) return;
      for (const m of motes) {
        m.x += (m.vx + Math.sin(now / 1000 * 0.3 + m.ph) * 3) * dt; m.y += m.vy * dt;
        if (m.y < -14) { m.y = H + 14; m.x = Math.random() * W; }
        if (m.x < -14) m.x = W + 14; else if (m.x > W + 14) m.x = -14;
        mctx.globalAlpha = m.a * (0.78 + 0.22 * Math.sin(now / 1000 * 0.6 + m.ph)) * fade;
        mctx.drawImage(sprite, m.x - m.s / 2, m.y - m.s / 2, m.s, m.s);
      }
      mctx.globalAlpha = 1;
    };

    // pointer → canvas uv (bottom-up)
    const hero = host.closest(".hero") as HTMLElement | null;
    const toUv = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, e.clientX - r.left, e.clientY - r.top]; };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const [u, v] = toUv(e);
      const inside = u >= 0 && u <= 1 && v >= 0 && v <= 1;
      if (inside) onPointer(u, v, false); else onPointer(-1, -1, true);
      const m = markPx(), [, , x, y] = toUv(e);
      hero?.classList.toggle("mark-hot", inside && Math.abs(x - m.cx) < m.s * 0.55 && Math.abs(y - m.cy) < m.s * 0.55);
    };
    const onDown = (e: PointerEvent) => {
      const [u, v, x, y] = toUv(e), m = markPx();
      if (Math.abs(x - m.cx) < m.s * 0.6 && Math.abs(y - m.cy) < m.s * 0.6) onClick(u, v);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    let last = 0;
    const frame = (now: number) => {
      raf = 0;
      if (!alive) return;
      const dt = last ? Math.min(0.033, Math.max(0.004, (now - last) / 1000)) : 1 / 60;
      last = now;
      if (gl) { frameGl(dt, now); drawMotes(dt, now); } else drawStill();
      if (visible && gl) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && alive) { last = 0; raf = requestAnimationFrame(frame); } };
    const resize = () => { fit(); rebuild(); kick(); };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; if (visible) kick(); });
    io.observe(host);
    const onVis = () => { visible = !document.hidden; if (visible) kick(); };
    document.addEventListener("visibilitychange", onVis);
    const onScroll = () => { if (!gl) kick(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    const poll = !gl ? window.setInterval(kick, 400) : 0;

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      if (poll) clearInterval(poll);
      hero?.classList.remove("mark-hot");
      cleanupGl();
    };
  }, [progress, scale]);

  return (
    <div ref={root} className={className} aria-hidden="true">
      <canvas ref={glRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <canvas ref={motesRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }} />
    </div>
  );
}
