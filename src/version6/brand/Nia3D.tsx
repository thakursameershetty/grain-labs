// Nia in 3D (v6): the mascot (Nia.tsx / assets/nia-tile-inverted-v1.svg) built as a soft vinyl toy in three.js.
// The same parts as the 2D drawing: the blue front tile, the light back tile tilted 9° behind it, the pale screen
// face with its little slot underneath, and the face itself.
//
// Faces (Expr):  idle · focus (squints while working) · think (looks up, flat mouth) · wait (eyes off to a side)
//                surprised (big eyes, "o") · happy (^ ^, grin) · wink · love (heart eyes, blush)
// Talking: the mouth opens and closes in a speech rhythm while `talk` is on (any face).
// Alive: breathes, floats, blinks; eyes (and a gentle lean, about her visual centre) follow the cursor, or whatever
// `gaze` points at.
// Interactive (after GrassBuddy on cuedesign.space): hover → love and hearts; click → jelly squash, spin, ^ ^ and
// a burst of the logo's square dots; drag → spins her, springs back to face you.
// A scene can direct her through `api` (expr, talk, gaze, squash, hearts, dots). Falls back to the 2D Nia
// where WebGL isn't available.
// Colour: no tone mapping and a dimmed studio environment, so the blue stays the mascot's own #5874BD.
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import NiaPal from "@/version6/components/grain/NiaPal";
import type { NiaMood } from "@/version6/components/grain/Nia";
import "./nia3d.css";

export type Expr = "idle" | "focus" | "think" | "wait" | "surprised" | "happy" | "wink" | "love";
export type NiaApi = {
  /** set her face; with `ms`, only for that long (then back to the scene's face) */
  expr: (e: Expr, ms?: number) => void;
  talk: (on: boolean) => void;
  /** look at a point on screen (client px), or null to follow the cursor again */
  gaze: (p: { x: number; y: number } | null) => void;
  /** turn her whole body (radians, springy; 0 = facing you): for looking around */
  turn: (rad: number) => void;
  /** a jelly squash (1 = a landing) */
  squash: (k?: number) => void;
  hearts: (n?: number) => void;
  dots: (n?: number) => void;
};

const C = { body: "#5874BD", back: "#B5C5E6", face: "#E6ECF7", ink: "#405A96", mouth: "#2D3F70", tongue: "#E27A8A", heart: "#E27A5F", blush: "#F0A0A0" };
const LOGO = ["#C85636", "#E27A5F", "#F0BFA7"];
const MOOD_EXPR: Record<NiaMood, Expr> = { idle: "idle", work: "focus", happy: "happy", love: "love", wink: "wink" };

const rr = (w: number, h: number, r: number) => {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
};
/** the screen: flat along the bottom, rounded at the top */
const screen = (w: number, h: number, r: number) => {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y);
  return s;
};
const heart = () => {
  const s = new THREE.Shape();
  s.moveTo(25, 25); s.bezierCurveTo(25, 25, 20, 0, 0, 0); s.bezierCurveTo(-30, 0, -30, 35, -30, 35);
  s.bezierCurveTo(-30, 55, -10, 77, 25, 95); s.bezierCurveTo(60, 77, 80, 55, 80, 35);
  s.bezierCurveTo(80, 35, 80, 0, 50, 0); s.bezierCurveTo(35, 0, 25, 25, 25, 25);
  const g = new THREE.ExtrudeGeometry(s, { depth: 8, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 3 });
  g.center(); g.rotateZ(Math.PI); g.scale(0.00085, 0.00085, 0.00085);
  return g;
};
const pillow = (shape: THREE.Shape, depth: number, bevel: number) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 8, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
};
const shadowTex = () => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(30,40,80,.42)"); g.addColorStop(.5, "rgba(30,40,80,.16)"); g.addColorStop(1, "rgba(30,40,80,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const tube = (pts: [number, number][], r = 0.014) => new THREE.TubeGeometry(
  new THREE.QuadraticBezierCurve3(new THREE.Vector3(pts[0][0], pts[0][1], 0), new THREE.Vector3(pts[1][0], pts[1][1], 0), new THREE.Vector3(pts[2][0], pts[2][1], 0)), 20, r, 8, false);

class Spring {
  x: number; v = 0; k: number; d: number;
  constructor(x = 0, k = 120, d = 14) { this.x = x; this.k = k; this.d = d; }
  step(to: number, dt: number) { this.v += ((to - this.x) * this.k - this.v * this.d) * dt; this.x += this.v * dt; return this.x; }
}

type Bit = { id: number; kind: "heart" | "dot"; dx: number; dy: number; c: string; s: number };
type Props = {
  size?: number; mood?: NiaMood; className?: string; label?: string;
  /** the scene's handle on her */
  api?: MutableRefObject<NiaApi | null>;
  /** hover / click / drag reactions (on by default) */
  interactive?: boolean;
};

export default function Nia3D({ size = 220, mood = "idle", className = "", label = "Nia, Grain's agent", api, interactive = true }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const moodRef = useRef<NiaMood>(mood);
  useEffect(() => { moodRef.current = mood; }, [mood]);
  const [fallback, setFallback] = useState(false);
  const [bits, setBits] = useState<Bit[]>([]);
  const bitId = useRef(0);
  const burstRef = useRef<(kind: "heart" | "dot", n: number) => void>(() => {});
  burstRef.current = (kind, n) => {
    const add = Array.from({ length: n }, (_, k): Bit => {
      const a = kind === "heart" ? -Math.PI / 2 + (k - (n - 1) / 2) * 0.45 : (k / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = size * (kind === "heart" ? 0.42 : 0.5);
      return { id: ++bitId.current, kind, dx: Math.cos(a) * r, dy: Math.sin(a) * r - (kind === "heart" ? size * 0.12 : 0), c: kind === "heart" ? C.heart : LOGO[k % 3], s: kind === "heart" ? 12 + Math.random() * 6 : 6 + Math.random() * 4 };
    });
    setBits((b) => [...b, ...add]);
    window.setTimeout(() => setBits((b) => b.filter((x) => !add.includes(x))), 1300);
  };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFallback(true); return; }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(size, size);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;   // keeps the brand blue (ACES washed it out)
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 0.05, 4.6);
    const key = new THREE.DirectionalLight("#ffffff", 1.1); key.position.set(-2, 3, 4); scene.add(key);
    const fill = new THREE.DirectionalLight("#dfe7ff", 0.35); fill.position.set(3, -1, 2); scene.add(fill);
    scene.add(new THREE.AmbientLight("#ffffff", 0.25));

    const soft = (color: string) => new THREE.MeshPhysicalMaterial({
      color, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.45, sheen: 0.25, sheenRoughness: 0.7, sheenColor: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.12),
    });
    const mats = {
      body: soft(C.body), back: soft(C.back),
      face: new THREE.MeshPhysicalMaterial({ color: C.face, roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: new THREE.Color("#c9d4ef"), emissiveIntensity: 0.12 }),
      ink: new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.35 }),
      mouth: new THREE.MeshBasicMaterial({ color: C.mouth }),
      tongue: new THREE.MeshBasicMaterial({ color: C.tongue }),
      heart: new THREE.MeshStandardMaterial({ color: C.heart, roughness: 0.35, emissive: new THREE.Color(C.heart), emissiveIntensity: 0.12 }),
      blush: new THREE.MeshBasicMaterial({ color: C.blush, transparent: true, opacity: 0 }),
    };

    // the toy: rig (lean, spin) → squash (jelly scale) → body parts
    const rig = new THREE.Group(), squash = new THREE.Group();
    rig.add(squash); scene.add(rig);
    // turn about her visual centre (the back tile sits low-left), so leaning never makes her drift off her spot
    const PIV = { x: -0.09, y: -0.1 };
    squash.position.set(-PIV.x, -PIV.y, 0); rig.position.set(PIV.x, PIV.y, 0);
    const front = new THREE.Mesh(pillow(rr(1.3, 1.2, 0.3), 0.2, 0.07), mats.body);
    const back = new THREE.Mesh(pillow(rr(1.2, 1.2, 0.3), 0.16, 0.06), mats.back);
    back.position.set(-0.18, -0.2, -0.24); back.rotation.z = -9 * Math.PI / 180;
    const face = new THREE.Mesh(pillow(screen(0.96, 0.82, 0.25), 0.02, 0.018), mats.face);
    face.position.set(0, 0.03, 0.18);
    const slot = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.15, 4, 12), mats.back);
    slot.rotation.z = Math.PI / 2; slot.position.set(0, -0.48, 0.165);
    squash.add(back, front, face, slot);

    // the face
    const faceG = new THREE.Group(); faceG.position.set(0, 0.03, 0.215); squash.add(faceG);
    const EX = 0.155;
    const eyeGeo = new THREE.SphereGeometry(1, 24, 16);
    const eyes = [-EX, EX].map((x) => { const m = new THREE.Mesh(eyeGeo, mats.ink); m.position.set(x, 0.05, 0); faceG.add(m); return m; });
    const arcGeo = new THREE.TorusGeometry(0.045, 0.013, 10, 28, Math.PI);
    const arcs = [-EX, EX].map((x) => { const m = new THREE.Mesh(arcGeo, mats.ink); m.position.set(x, 0.035, 0); faceG.add(m); return m; });
    const heartGeo = heart();
    const hearts = [-EX, EX].map((x) => { const m = new THREE.Mesh(heartGeo, mats.heart); m.position.set(x, 0.05, 0.01); faceG.add(m); return m; });
    const blushGeo = new THREE.CircleGeometry(1, 24);
    [-0.25, 0.25].forEach((x) => { const m = new THREE.Mesh(blushGeo, mats.blush); m.scale.set(0.06, 0.034, 1); m.position.set(x, -0.08, -0.002); faceG.add(m); });
    const mSmile = new THREE.Mesh(tube([[-0.07, -0.1], [0, -0.17], [0.07, -0.1]]), mats.ink);
    const mGrin = new THREE.Mesh(tube([[-0.1, -0.095], [0, -0.2], [0.1, -0.095]], 0.015), mats.ink);
    const mFlat = new THREE.Mesh(tube([[-0.045, -0.13], [0, -0.135], [0.045, -0.13]], 0.013), mats.ink);
    faceG.add(mSmile, mGrin, mFlat);
    // the open mouth: a dark oval with a tongue, its height animated (talking, "o")
    const openG = new THREE.Group(); openG.position.set(0, -0.135, 0.004); faceG.add(openG);
    const discGeo = new THREE.CircleGeometry(1, 32);
    const mOpen = new THREE.Mesh(discGeo, mats.mouth); openG.add(mOpen);
    const mTongue = new THREE.Mesh(discGeo, mats.tongue); mTongue.position.z = 0.002; openG.add(mTongue);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.98; scene.add(shadow);

    // state
    const lean = { x: new Spring(0, 60, 11), y: new Spring(0, 60, 11) };
    const look = { x: new Spring(0, 90, 13), y: new Spring(0, 90, 13) };
    const sq = { x: new Spring(1, 170, 7), y: new Spring(1, 170, 7) };   // underdamped: jelly
    const spinS = new Spring(0, 40, 9);
    const turnS = new Spring(0, 70, 11);
    let turnTo = 0;
    const open = new Spring(0, 260, 18);
    let spinTo = 0, drag = 0, dragging = false, downX = 0, moved = false;
    let px = 0, py = 0, inside = false, lastLove = 0;
    let gazeAt: { x: number; y: number } | null = null;
    let sceneExpr: Expr | null = null, temp: Expr | null = null, tempUntil = 0, talking = false;
    let nextBlink = performance.now() + 1800, blinkAt = 0, raf = 0, visible = true, last = 0;
    const setTemp = (e: Expr, ms: number) => { temp = e; tempUntil = performance.now() + ms; };

    const poke = () => {
      sq.y.v -= 5.5; sq.x.v += 3.8;              // squash, then wobble back
      spinTo += Math.PI * 2;
      setTemp("happy", 1400);
      burstRef.current("dot", 10);
    };
    if (api) api.current = {
      expr: (e, ms) => { if (ms) setTemp(e, ms); else { sceneExpr = e; temp = null; } },
      talk: (on) => { talking = on; },
      gaze: (p) => { gazeAt = p; },
      turn: (rad) => { turnTo = rad; },
      squash: (k = 1) => { sq.y.v -= 4.2 * k; sq.x.v += 3 * k; },
      hearts: (n = 4) => burstRef.current("heart", n),
      dots: (n = 10) => burstRef.current("dot", n),
    };

    const rel = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      return [Math.max(-1.6, Math.min(1.6, (cx - (r.left + r.width / 2)) / (r.width / 2))), Math.max(-1.6, Math.min(1.6, (cy - (r.top + r.height / 2)) / (r.height / 2)))];
    };
    const onMove = (e: PointerEvent) => {
      [px, py] = rel(e.clientX, e.clientY);
      const was = inside;
      inside = Math.abs(px) < 0.75 && Math.abs(py) < 0.8;
      if (interactive && inside && !was && performance.now() - lastLove > 1600) { lastLove = performance.now(); setTemp("love", 1400); burstRef.current("heart", 4); }
      if (dragging) { const dx = e.clientX - downX; if (Math.abs(dx) > 4) moved = true; drag = dx * 0.012; }
    };
    const onDown = (e: PointerEvent) => { if (!interactive) return; dragging = true; moved = false; downX = e.clientX; };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (!moved) poke();
      else { spinS.x += drag; spinTo = Math.round(spinS.x / (Math.PI * 2)) * Math.PI * 2; } // settle on a whole turn
      drag = 0;
    };
    const onKey = (e: KeyboardEvent) => { if (interactive && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); poke(); } };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 1 / 60; last = now;
      const t = now / 1000;
      if (temp && now > tempUntil) temp = null;
      const ex: Expr = temp ?? sceneExpr ?? MOOD_EXPR[moodRef.current];

      // where she's looking: the scene's target, else the cursor
      const [gx, gy] = gazeAt ? rel(gazeAt.x, gazeAt.y) : [px, py];
      // a gentle lean toward the cursor, softened so a far cursor doesn't swing her (she stays put; eyes do the rest)
      const soften = (v: number) => Math.tanh(v * 0.9);
      rig.rotation.y = lean.y.step(reduce ? 0 : soften(gx) * 0.15, dt) + spinS.step(spinTo, dt) + turnS.step(reduce ? 0 : turnTo, dt) + drag;
      rig.rotation.x = lean.x.step(reduce ? 0 : soften(gy) * 0.09, dt);
      const scan = ex === "focus" ? Math.sin(t * 3.2) * 0.05 : 0;
      const up = ex === "think" ? 0.03 : 0, side = ex === "think" ? 0.025 : 0;
      // eyes travel further when the scene points them at something (so a look reads even when she's small)
      const reach = gazeAt ? 0.06 : 0.035;
      const lx = look.x.step(Math.max(-1, Math.min(1, gx)) * reach + scan + side, dt);
      const ly = look.y.step(-Math.max(-1, Math.min(1, gy)) * reach * 0.7 + up, dt);
      // breathe and float
      const breathe = reduce ? 0 : Math.sin(t * 1.7) * 0.012, bob = reduce ? 0 : Math.sin(t * 1.15) * 0.035 + (ex === "focus" ? Math.abs(Math.sin(t * 6.4)) * 0.015 : 0);
      squash.scale.set(sq.x.step(1, dt), sq.y.step(1, dt) + breathe, 1);
      rig.position.y = PIV.y + bob;
      shadow.scale.setScalar(1 - bob * 2.2); (shadow.material as THREE.MeshBasicMaterial).opacity = 0.9 - bob * 3;

      // blink (not while love / happy / wink faces show)
      if (now > nextBlink) { blinkAt = now; nextBlink = now + 2400 + Math.random() * 2800; }
      const b = blinkAt ? Math.min(1, (now - blinkAt) / 150) : 1;
      const lid = b < 1 ? Math.abs(1 - b * 2) : 1;

      // eyes
      const normal = ex !== "happy" && ex !== "love";
      const ey = ex === "focus" ? 0.55 : ex === "surprised" ? 1.3 : 1;
      const ew = ex === "surprised" ? 1.2 : 1;
      eyes.forEach((e, i) => {
        e.visible = normal && !(ex === "wink" && i === 1);
        e.scale.set(0.042 * ew, 0.065 * ey * Math.max(0.1, lid), 0.03);
        e.position.set((i ? EX : -EX) + lx, 0.05 + ly, 0);
      });
      arcs.forEach((e, i) => { e.visible = ex === "happy" || (ex === "wink" && i === 1); e.position.x = (i ? EX : -EX) + lx * 0.5; });
      hearts.forEach((e, i) => { e.visible = ex === "love"; e.scale.setScalar(1 + Math.sin(t * 8) * 0.08); e.position.x = (i ? EX : -EX) + lx * 0.5; });

      // mouth: talking opens it in a speech rhythm; otherwise the face's own mouth
      const syll = Math.abs(Math.sin(t * 13.5)) * (0.55 + 0.45 * Math.abs(Math.sin(t * 4.1 + 1)));
      const openTo = talking ? 0.25 + syll * 0.75 : ex === "surprised" ? 0.85 : 0;
      const o = Math.max(0, open.step(openTo, dt));
      const shut = o < 0.06;
      mSmile.visible = shut && (ex === "idle" || ex === "wait");
      mGrin.visible = shut && (ex === "happy" || ex === "love" || ex === "wink");
      mFlat.visible = shut && (ex === "focus" || ex === "think");
      openG.visible = !shut || ex === "surprised";
      const ow = ex === "surprised" && !talking ? 0.04 : 0.06;
      mOpen.scale.set(ow, 0.012 + o * 0.05, 1);
      mTongue.scale.set(ow * 0.6, 0.012 + o * 0.022, 1);
      mTongue.position.y = -(0.012 + o * 0.05) * 0.45;
      mTongue.visible = o > 0.35;
      mats.blush.opacity += ((ex === "love" ? 0.7 : ex === "happy" || ex === "wink" ? 0.35 : 0) - mats.blush.opacity) * Math.min(1, dt * 8);

      renderer.render(scene, camera);
      if (visible) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("keydown", onKey);
    kick();

    return () => {
      cancelAnimationFrame(raf); io.disconnect();
      if (api) api.current = null;
      window.removeEventListener("pointermove", onMove); el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp); el.removeEventListener("keydown", onKey);
      scene.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
      Object.values(mats).forEach((mm) => mm.dispose());
      env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [size, api, interactive]);

  if (fallback) return <NiaPal size={Math.round(size * 0.55)} mood={mood} label={label} className={className} />;
  return (
    <div className={`nia3d ${className}`} ref={host} style={{ width: size, height: size }} role="button" tabIndex={interactive ? 0 : -1} aria-label={label}>
      {bits.map((b) => (
        <i key={b.id} className={`n3-bit ${b.kind}`} style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px`, "--c": b.c, "--s": `${b.s}px` } as React.CSSProperties} aria-hidden="true" />
      ))}
    </div>
  );
}
