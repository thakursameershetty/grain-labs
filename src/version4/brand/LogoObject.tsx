// The Grain mark as one solid relief in glazed enamel: every ring, dot and the core stand on the same back plane
// (no backing tile), stepped like terraces (outer ring lowest, core highest), so from any angle it reads as one
// carved piece. Weight comes from real shadows (the terraces shade each other), a soft contact shadow underneath
// and spring physics on every motion.
// Faces the cursor, drag to spin (springs back), floats, and `progress` (scroll) turns it edge-on.
// When `start` flips true it builds: the flat mark lands, then the rings extrude up out of it core → outer, each
// dot after its ring. No idle pulsing.
// (A gyroscope version, with each ring on its own gimbal axis, was tried on 2026-11-18 and reverted at the user's call.)
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CORE, RINGS, rectPath } from "./grainMark";

const SIZE = 320;                 // logo grid
const HEIGHT = [30, 40, 50];      // ring depths from the back plane: outer, middle, inner
const CORE_H = 60;
const BEVEL = { bevelEnabled: true, bevelThickness: 2.4, bevelSize: 1.8, bevelSegments: 5, curveSegments: 28 };

function shapesOf(d: string) {
  return SVGLoader.createShapes(new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths[0]);
}
/** a logo-grid path extruded `depth` up from z = 0, centred on the logo's middle, y flipped (SVG is y-down) */
function extrude(d: string, depth: number) {
  const g = new THREE.ExtrudeGeometry(shapesOf(d), { depth, ...BEVEL });
  g.translate(-SIZE / 2, -SIZE / 2, 0);
  g.scale(1, -1, 1);
  g.computeVertexNormals();
  return g;
}
/** a square centred on its own middle (so it can press and scale from there), plus where that middle sits */
function extrudeSquare(q: { x: number; y: number; s: number; r: number }, depth: number) {
  const g = extrude(rectPath({ x: SIZE / 2 - q.s / 2, y: SIZE / 2 - q.s / 2, s: q.s, r: q.r }), depth);
  return { geo: g, cx: q.x + q.s / 2 - SIZE / 2, cy: -(q.y + q.s / 2 - SIZE / 2) };
}
/** soft round shadow texture for the contact shadow */
function shadowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(40,20,12,.55)"); g.addColorStop(.45, "rgba(40,20,12,.22)"); g.addColorStop(1, "rgba(40,20,12,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const outBack = (t: number, c = 1.7) => { t = clamp01(t) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };

/** a damped spring: lags behind its target, overshoots a touch, settles. Feels like mass. */
class Spring {
  x = 0; v = 0;
  k: number; damp: number;
  constructor(k = 0.035, damp = 0.82) { this.k = k; this.damp = damp; }
  step(target: number) { this.v = (this.v + (target - this.x) * this.k) * this.damp; this.x += this.v; return this.x; }
  get still() { return Math.abs(this.v) < 1e-5; }
}

type Props = {
  className?: string;
  /** 0–1: 0 faces the viewer, 1 is edge-on */
  progress?: RefObject<number>;
  /** flips true when the page is ready: the build plays from then */
  start?: boolean;
  /** camera distance: larger = smaller object */
  distance?: number;
};

export default function LogoObject({ className = "logo-object", progress, start = true, distance = 1750 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const startRef = useRef(start);
  useEffect(() => { startRef.current = start; }, [start]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.NeutralToneMapping;      // keeps the logo colours true
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;

    const camera = new THREE.PerspectiveCamera(24, 1, 10, 6000);
    camera.position.set(0, 0, distance);

    // ── materials: glazed enamel
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const enamel = new Map<string, THREE.MeshPhysicalMaterial>();
    const glaze = (hex: string) => {
      if (!enamel.has(hex)) {
        const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.1, specularIntensity: 0.6 });
        enamel.set(hex, m); mats.push(m);
      }
      return enamel.get(hex)!;
    };
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      geos.push(geo);
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
      return m;
    };

    // ── the object: everything hangs off `obj`, which is centred on the whole piece's middle (depth included)
    const obj = new THREE.Group();
    scene.add(obj);
    const top = 0;                                    // the shared back plane every piece stands on
    const centreZ = CORE_H / 2;
    const piece = new THREE.Group(); piece.position.z = -centreZ; obj.add(piece);

    // rings stand on the back plane and grow in z from there
    const rings = RINGS.map((ring, i) => {
      const g = new THREE.Group(); g.position.z = top;
      g.add(mesh(extrude(ring.fill, HEIGHT[i]), glaze(ring.color)));
      piece.add(g);
      return { g, order: RINGS.length - i };          // build order: inner (1) → outer (3)
    });
    const dots = RINGS.map((ring, i) => {
      const { geo, cx, cy } = extrudeSquare(ring.dot, HEIGHT[i]);
      const g = new THREE.Group(); g.add(mesh(geo, glaze(ring.dot.color)));
      g.position.set(cx, cy, top); piece.add(g);
      return { g, order: RINGS.length - i };
    });
    const core = (() => {
      const { geo, cx, cy } = extrudeSquare(CORE, CORE_H);
      const g = new THREE.Group(); g.add(mesh(geo, glaze(CORE.color)));
      g.position.set(cx, cy, top); piece.add(g);
      return g;
    })();

    // ── contact shadow: a soft blot on an unseen floor just below the mark
    const floorY = -SIZE / 2 - 80;
    const blotMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.9 });
    mats.push(blotMat);
    const blotGeo = new THREE.PlaneGeometry(1, 1); geos.push(blotGeo);
    const blot = new THREE.Mesh(blotGeo, blotMat);
    blot.rotation.x = -Math.PI / 2; blot.position.y = floorY;
    scene.add(blot);

    // ── light: a soft key from the upper left that casts the terraces' shadows, a fill, and a warm rim
    const key = new THREE.DirectionalLight(0xfffaf5, 2.1);
    key.position.set(-420, 520, 760); key.target = obj;
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, near: 200, far: 2400 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.6; key.shadow.radius = 5;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(500, -100, 600); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffc6a8, 0.9); rim.position.set(300, 200, -700); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xfff6f0, 0xb08070, 0.55));

    let raf = 0;
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);

    // ── input: the cursor sets where it wants to face; drag adds spin. Springs do the moving.
    const aim = { x: 0, y: 0 };
    const tiltX = new Spring(0.03, 0.84), tiltY = new Spring(0.03, 0.84), spin = new Spring(0.022, 0.9);
    let dragging = false, lastX = 0, dragSpin = 0, visible = true;
    let t0: number | null = null;
    const onMove = (e: PointerEvent) => {
      aim.x = (e.clientX / window.innerWidth) * 2 - 1;
      aim.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (dragging) { dragSpin += (e.clientX - lastX) * 0.012; lastX = e.clientX; }
      kick();
    };
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId); };
    const onUp = () => {
      dragging = false;
      dragSpin = Math.round(dragSpin / (Math.PI * 2)) * Math.PI * 2;   // settle facing front, on the nearest full turn
    };
    const onScroll = () => kick();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(el);

    function tick(now: number) {
      raf = 0;
      if (startRef.current && t0 === null) t0 = now;
      const t = t0 === null ? 0 : (now - t0) / 1000;
      const b = reduce ? 99 : t;
      const p = progress?.current ?? 0;
      const edge = smooth(0.02, 0.4, p);
      const free = 1 - edge;

      // ── build: the flat mark lands, then the rings extrude up out of it core → inner → outer, each dot after its ring
      const land = t0 === null ? 0 : outBack(b / 0.6, 1.2);
      piece.scale.x = piece.scale.y = 0.9 + 0.1 * land;
      piece.position.z = -centreZ + (1 - land) * -140;
      const rise = (delay: number) => (t0 === null ? 0.001 : Math.max(0.04, outBack((b - delay) / 0.55, 2.2)));
      core.scale.z = rise(0.45);
      rings.forEach((r) => { r.g.scale.z = rise(0.6 + (r.order - 1) * 0.2); r.g.visible = land > 0.01; });
      dots.forEach((d) => { d.g.scale.z = rise(0.8 + (d.order - 1) * 0.2); d.g.visible = land > 0.01; });
      core.visible = land > 0.01;

      // ── pose, all through springs
      const rx = tiltX.step(reduce ? 0 : aim.y * 0.32 * free);
      const ry = tiltY.step(reduce ? 0 : aim.x * 0.42 * free);
      const sp = spin.step(dragSpin * free);
      obj.rotation.set(rx, ry + sp + edge * (Math.PI / 2), 0);
      const lift = reduce ? 0 : (Math.sin(t * 0.9) * 0.5 + 0.5) * 12 * free;   // gentle float, 0–12 up
      obj.position.y = lift;

      // contact shadow: tighter and darker when the mark is low, wider and fainter as it rises or turns
      const turn = Math.abs(Math.sin(ry + sp + edge * (Math.PI / 2)));
      const w = SIZE * (1.05 - 0.5 * turn) * (1 + lift / 120);
      blot.scale.set(w, w * 0.36 + turn * 60, 1);
      blotMat.opacity = Math.max(0, 0.75 - lift / 60 - Math.abs(rx) * 0.3) * land;

      // the key light drifts a little with the cursor, so highlights travel across the glaze
      key.position.set(-420 + aim.x * 160 * free, 520 - aim.y * 120 * free, 760);

      renderer.render(scene, camera);

      const settled = tiltX.still && tiltY.still && spin.still && !dragging;
      if (visible && (!reduce || !settled || t0 === null || t < 0.1)) raf = requestAnimationFrame(tick);
    }
    kick();

    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose());
      blotMat.map?.dispose(); pmrem.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [progress, distance]);

  return <div ref={host} className={className} />;
}
