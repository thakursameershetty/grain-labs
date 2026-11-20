// v6 hero object (2026-11-20): the plain 2D Grain mark, crisp at rest, that turns to mist where the pointer is.
// Two references, merged: the Gemini / DeepMind glyph (the material thins and drifts like vapor, then gathers back)
// and the 21st.dev GeometricBlurMesh (sharp far from the cursor, Gaussian-soft near it). What it deliberately is NOT:
// a fluid sim. Swirling the logo's opaque colours marbled them into "latte art"; here nothing gets stirred. Each spot
// only blurs, wobbles and thins its own colours, so the mark goes soft and misty and comes back clean.
//   · a small "disturbance" field (one channel, ¼ res) remembers where the pointer has been: the trail lingers,
//     drifts a little upward and clears in about a second. Hovering keeps a soft patch round the cursor.
//   · the mark is drawn from it: blur radius, a gentle noise wobble and a fbm "mist" that thins the colour, all
//     scaled by how disturbed that spot is
//   · on load it resolves out of mist; a click puffs a patch; scrolling (`progress`) dissolves it upward
//   · tiny Grain marks drift and twinkle over the stage (the reference's floating 4s)
//   · no WebGL or reduced motion: the still mark
import { useEffect, useRef, type RefObject } from "react";
import { CORE, RINGS, rectPath } from "./grainMark";

type Props = {
  className?: string;
  /** scroll progress 0 → 1: the mark mists over, drifts up and fades */
  progress?: RefObject<number>;
  /** when it flips true the mark resolves in */
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

const VS = `attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }`;
const NOISE = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= .5; } return s; }
`;
// the disturbance field: last frame's, faded, plus a soft stroke along the pointer's path
const FS_DIST = `precision highp float; varying vec2 vUv;
uniform sampler2D uPrev; uniform vec2 uA, uB; uniform float uR, uK, uDecay, uAspect;
${NOISE}
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0., 1.); return length(pa - ba * h); }
void main() {
  // the trail stays where it was drawn and only fades: any per-frame shift acts like a steady current and
  // stretches it into streaks (the mist's movement comes from the drifting noise when it's drawn)
  float d = texture2D(uPrev, vUv).r * uDecay;
  vec2 p = vec2(vUv.x * uAspect, vUv.y), a = vec2(uA.x * uAspect, uA.y), b = vec2(uB.x * uAspect, uB.y);
  float s = seg(p, a, b);
  d = max(d, uK * exp(-s * s / (uR * uR)));
  gl_FragColor = vec4(min(d, 1.), 0., 0., 1.);
}`;
// the mark, drawn from the field: blur + wobble + mist, scaled by how disturbed each spot is
const FS_SHOW = `precision highp float; varying vec2 vUv;
uniform sampler2D uMark, uDist; uniform vec2 uRes, uMouse; uniform float uHover, uHoverR, uExtra, uAlpha, uT, uLift, uDpr;
${NOISE}
void main() {
  vec2 px = vUv * uRes;
  vec2 dm = (px - uMouse) / uHoverR;
  float d = texture2D(uDist, vUv).r + uHover * .42 * exp(-dot(dm, dm)) + uExtra;
  d = clamp(d, 0., 1.);
  if (d < .004) { gl_FragColor = texture2D(uMark, vUv) * uAlpha; return; }
  // faint leftovers count for nothing, so the mark snaps back fully crisp; strong spots get the full effect
  float e = smoothstep(.06, 1., d);
  vec2 q = vUv * uRes / (220. * uDpr);   // noise in screen space: round, cloudy patches, never stretched
  float mist = fbm(q * 2.2 + vec2(0., -uT * .3));
  vec2 n = vec2(fbm(q * 1.4 + uT * .1), fbm(q * 1.4 + 7.3 - uT * .08)) - .5;
  vec2 uv = vUv + n * e * (18. * uDpr) / uRes;
  uv.y -= uLift * (.5 + mist) * .07;
  float rad = e * 30. * uDpr;
  vec4 acc = vec4(0.);
  for (int i = 0; i < 16; i++) {
    float fi = float(i), r = sqrt((fi + .5) / 16.) * rad, a = fi * 2.39996;
    acc += texture2D(uMark, uv + vec2(cos(a), sin(a)) * r / uRes);
  }
  acc /= 16.;
  float thin = 1. - e * .9 * smoothstep(.22, .68, mist);
  gl_FragColor = acc * thin * uAlpha;
}`;

export default function MistMark({ className = "mist-mark", progress, start = true, scale = 0.62 }: Props) {
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
    let W = 0, H = 0, dpr = 1, markY = 0.4, markScale = 1, raf = 0, visible = true, alive = true;
    const markGeom = () => { const s = Math.min(W, H) * scale * markScale; return { cx: W / 2, cy: H * markY, s }; };

    // ── tiny marks drifting over the stage
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    drawMark(sprite.getContext("2d")!, 32, 32, 60);
    type Mote = { x: number; y: number; vx: number; vy: number; s: number; a: number; ph: number };
    let motes: Mote[] = [];
    const seedMotes = () => {
      const n = Math.round(Math.min(44, Math.max(12, (W * H) / 38000)));
      motes = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 4,
        s: 9 + Math.random() * 5, a: 0.18 + Math.random() * 0.28, ph: Math.random() * Math.PI * 2,
      }));
    };

    // ── pointer
    let px = -1e4, py = -1e4, lpx = -1, lpy = -1, over = false, hover = 0;
    const hero = host.closest(".hero") as HTMLElement | null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      over = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      px = x; py = y;
      const g = markGeom();
      hero?.classList.toggle("mark-hot", over && Math.abs(x - g.cx) < g.s * 0.55 && Math.abs(y - g.cy) < g.s * 0.55);
    };
    const clicks: { x: number; y: number }[] = [];
    const onDown = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, g = markGeom();
      if (Math.abs(x - g.cx) < g.s * 0.6 && Math.abs(y - g.cy) < g.s * 0.6) clicks.push({ x, y });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    const gl = reduce ? null : cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    const live = !!gl;

    const fit = () => {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const cs = getComputedStyle(host);
      markY = parseFloat(cs.getPropertyValue("--mark-y")) || 0.4;
      markScale = parseFloat(cs.getPropertyValue("--mark-scale")) || 1;
      for (const c of [cv, mc]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      seedMotes();
    };

    let rebuild = () => {};
    let draw: (dt: number, now: number) => void = () => {};
    let cleanupGl = () => {};

    if (gl) {
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
        return s;
      };
      const vs = compile(gl.VERTEX_SHADER, VS);
      const prog = (fs: string) => {
        const p = gl.createProgram()!;
        gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
        gl.bindAttribLocation(p, 0, "aPos"); gl.linkProgram(p);
        const u: Record<string, WebGLUniformLocation | null> = {};
        const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
        for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i)!; u[a.name] = gl.getUniformLocation(p, a.name); }
        return { p, u };
      };
      const PD = prog(FS_DIST), PS = prog(FS_SHOW);
      const quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      const mkTex = (w: number, h: number) => {
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        return t;
      };
      type Target = { t: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };
      const target = (w: number, h: number): Target => {
        const t = mkTex(w, h), fb = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
        return { t, fb, w, h };
      };
      let A: Target | null = null, B: Target | null = null;
      const markTex = gl.createTexture()!;
      const markCanvas = document.createElement("canvas");

      rebuild = () => {
        for (const x of [A, B]) if (x) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.fb); }
        A = target(Math.max(8, Math.round(W / 4)), Math.max(8, Math.round(H / 4)));
        B = target(A.w, A.h);
        markCanvas.width = cv.width; markCanvas.height = cv.height;
        const g = markCanvas.getContext("2d")!, m = markGeom();
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        drawMark(g, m.cx, m.cy, m.s);
        gl.bindTexture(gl.TEXTURE_2D, markTex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, markCanvas);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      };

      let t0 = 0;
      draw = (dt, now) => {
        if (!A || !B) return;
        const p = progress?.current ?? 0;
        if (startRef.current && !t0) t0 = now;
        const intro = t0 ? smooth(0, 1.5, (now - t0) / 1000) : 0;
        const t = now / 1000;

        // the pointer's stroke since last frame (and any click puff)
        let a = [-9, -9], b = [-9, -9], k = 0, rr = 70;
        if (over && lpx >= 0) {
          const dx = px - lpx, dy = py - lpy, len = Math.hypot(dx, dy);
          if (len > 0.5) { a = [lpx / W, 1 - lpy / H]; b = [px / W, 1 - py / H]; k = Math.min(0.85, 0.18 + len / 50); }
        }
        if (clicks.length) { const c = clicks.shift()!; a = b = [c.x / W, 1 - c.y / H]; k = 1; rr = 120; }
        lpx = over ? px : -1; lpy = over ? py : -1;
        hover += ((over ? 1 : 0) - hover) * Math.min(1, dt * 5);

        gl.useProgram(PD.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(PD.u.uPrev, 0);
        gl.uniform2f(PD.u.uA, a[0], a[1]); gl.uniform2f(PD.u.uB, b[0], b[1]);
        gl.uniform1f(PD.u.uR, rr / H); gl.uniform1f(PD.u.uK, k);
        gl.uniform1f(PD.u.uDecay, Math.exp(-dt * 1.5)); gl.uniform1f(PD.u.uAspect, W / H);
        gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb); gl.viewport(0, 0, B.w, B.h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        [A, B] = [B, A];

        const ev = smooth(0.02, 0.3, p);
        gl.useProgram(PS.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, markTex); gl.uniform1i(PS.u.uMark, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(PS.u.uDist, 1);
        gl.uniform2f(PS.u.uRes, cv.width, cv.height);
        gl.uniform2f(PS.u.uMouse, px * dpr, (H - py) * dpr);
        gl.uniform1f(PS.u.uHover, hover); gl.uniform1f(PS.u.uHoverR, 90 * dpr);
        gl.uniform1f(PS.u.uExtra, (1 - intro) * 0.9 + ev * 0.9);
        gl.uniform1f(PS.u.uAlpha, intro * (1 - smooth(0.22, 0.4, p)));
        gl.uniform1f(PS.u.uT, t); gl.uniform1f(PS.u.uLift, ev); gl.uniform1f(PS.u.uDpr, dpr);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      cleanupGl = () => {
        for (const x of [A, B]) if (x) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.fb); }
        gl.deleteTexture(markTex); gl.deleteBuffer(quad); gl.deleteProgram(PD.p); gl.deleteProgram(PS.p);
      };
    }

    const drawStill = () => {
      const m = markGeom(), p = progress?.current ?? 0;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, W, H);
      if (startRef.current) drawMark(mctx, m.cx, m.cy, m.s, 1 - smooth(0.22, 0.4, p));
    };

    let motesLast = { x: -1, y: -1 };
    const drawMotes = (dt: number, now: number) => {
      const p = progress?.current ?? 0;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, W, H);
      const fade = (startRef.current ? 1 : 0) * (1 - smooth(0.22, 0.4, p));
      if (fade <= 0) return;
      const mvx = over && motesLast.x >= 0 ? (px - motesLast.x) / Math.max(dt, 0.001) : 0;
      const mvy = over && motesLast.y >= 0 ? (py - motesLast.y) / Math.max(dt, 0.001) : 0;
      motesLast = over ? { x: px, y: py } : { x: -1, y: -1 };
      for (const m of motes) {
        if (over) {
          const dx = m.x - px, dy = m.y - py, d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) { const f = (1 - Math.sqrt(d2) / 120) * 0.3 * dt; m.vx += mvx * f; m.vy += mvy * f; }
        }
        m.vx += ((m.vx > 0 ? 1 : -1) * 1.5 - m.vx) * Math.min(1, 1.2 * dt);
        m.vy += (-3 - m.vy) * Math.min(1, 1.2 * dt);
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.y < -12) { m.y = H + 12; m.x = Math.random() * W; }
        if (m.x < -12) m.x = W + 12; else if (m.x > W + 12) m.x = -12;
        mctx.globalAlpha = m.a * (0.65 + 0.35 * Math.sin(now / 900 + m.ph)) * fade;
        mctx.drawImage(sprite, m.x - m.s / 2, m.y - m.s / 2, m.s, m.s);
      }
      mctx.globalAlpha = 1;
    };

    let last = 0;
    const frame = (now: number) => {
      raf = 0;
      if (!alive) return;
      const dt = last ? Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000)) : 1 / 60;
      last = now;
      if (live) { draw(dt, now); drawMotes(dt, now); } else drawStill();
      if (visible && live) raf = requestAnimationFrame(frame);
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
    const onScroll = () => { if (!live) kick(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    const poll = !live ? window.setInterval(kick, 400) : 0;

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
      <canvas ref={motesRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
