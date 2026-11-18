// v5: the Grain mark as a gyroscope in glazed enamel. The three rings are nested gimbals, each on its own axis (outer
// about Y, middle about X, inner about Y the other way) and the core spins like the rotor, after the classic
// gyroscope. Rings stand at stepped depths (outer shallowest, core deepest) and all pivot on the logo's centre.
// Opening: the piece arrives while every gimbal spins and decelerates onto the logo, outer first, core last.
// Then: each gimbal leans by its own amount toward the cursor; drag sideways turns the outer gimbal, drag up/down
// tips the middle one (inner and core follow); release settles them on the logo; a click spins it all up again.
// Springs are near-critically damped (weight without wobble); real shadows and a soft contact shadow underneath.
// `progress` (scroll) still turns the whole piece edge-on. (v4 keeps the terraced, extruding version.)
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

    // ── the object, built like a gyroscope: each ring is a gimbal nested in the one outside it, on its own axis.
    //    obj (whole-piece tilt + scroll turn)
    //     └ outer ring + its dot      turns about Y (vertical)
    //        └ middle ring + its dot  turns about X (horizontal)
    //           └ inner ring + its dot turns about Y, the other way
    //              └ core             spins about Z, like the rotor
    //    Every gimbal pivots on the logo's centre at mid-depth, so the rings swing through each other cleanly.
    const obj = new THREE.Group();
    scene.add(obj);
    const PIV = CORE_H / 2;                           // pivot plane (mid-depth); meshes sit back by this much
    const piece = new THREE.Group(); obj.add(piece);
    const gimbal = (parent: THREE.Object3D) => { const g = new THREE.Group(); parent.add(g); return g; };
    const gOuter = gimbal(piece), gMid = gimbal(gOuter), gInner = gimbal(gMid), gCore = gimbal(gInner);
    const gims = [gOuter, gMid, gInner];
    RINGS.forEach((ring, i) => {
      const host = gims[i];
      const r = mesh(extrude(ring.fill, HEIGHT[i]), glaze(ring.color)); r.position.z = -PIV; host.add(r);
      const { geo, cx, cy } = extrudeSquare(ring.dot, HEIGHT[i]);
      const d = mesh(geo, glaze(ring.dot.color)); d.position.set(cx, cy, -PIV); host.add(d);
    });
    {
      const { geo, cx, cy } = extrudeSquare(CORE, CORE_H);
      const c = mesh(geo, glaze(CORE.color)); c.position.set(cx, cy, -PIV); gCore.add(c);
    }

    // ── contact shadow: a soft blot on an unseen floor just below the mark
    const floorY = -SIZE / 2 - 80;
    const blotMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.9 });
    mats.push(blotMat);
    const blotGeo = new THREE.PlaneGeometry(1, 1); geos.push(blotGeo);
    const blot = new THREE.Mesh(blotGeo, blotMat);
    blot.rotation.x = -Math.PI / 2; blot.position.y = floorY;
    scene.add(blot);

    // ── light: a soft key from the upper left that casts the rings' shadows on each other, a fill, and a warm rim
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

    // ── input. Springs are near-critically damped now: the mark has weight but doesn't wobble.
    //    cursor → each gimbal leans by its own amount on its own axis (layered parallax)
    //    drag sideways → the outer gimbal turns; drag up/down → the middle one tips; inner and core follow on
    //    release → every gimbal settles back to the logo on its nearest full turn
    //    click (no drag) → the gyroscope spins up again and settles, like the opening
    const aim = { x: 0, y: 0 };
    const S = () => new Spring(0.02, 0.8);
    const tiltX = S(), tiltY = S(), aOuter = S(), aMid = S(), aInner = S(), aCore = new Spring(0.016, 0.82);
    const drag = { outer: 0, mid: 0 };   // targets added by dragging
    let dragging = false, moved = 0, lastX = 0, lastY = 0, visible = true;
    let t0: number | null = null, spinFrom: number | null = null;
    const TURN = Math.PI * 2;
    const nearestTurn = (a: number) => Math.round(a / TURN) * TURN;
    const onMove = (e: PointerEvent) => {
      aim.x = (e.clientX / window.innerWidth) * 2 - 1;
      aim.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (dragging) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        drag.outer += dx * 0.011; drag.mid += dy * 0.011;
        moved += Math.abs(dx) + Math.abs(dy);
        lastX = e.clientX; lastY = e.clientY;
      }
      kick();
    };
    const onDown = (e: PointerEvent) => { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (moved < 5) { spinFrom = performance.now(); kick(); return; }   // a click: spin the gyroscope up again
      drag.outer = nearestTurn(drag.outer); drag.mid = nearestTurn(drag.mid);
    };
    const onScroll = () => kick();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(el);

    // the gyroscope spin: each gimbal starts a few turns away and decelerates onto the logo, outer first, core last
    const outCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
    const decel = (x: number) => 1 - Math.pow(1 - clamp01(x), 2.2);   // gentle: readable turns, no snap
    const SPIN = [
      { turns: 1, dur: 2.6 },    // outer about Y
      { turns: 1, dur: 3.0 },    // middle about X
      { turns: -1, dur: 3.4 },   // inner about Y, the other way
      { turns: 1.5, dur: 3.7 },  // core about Z (square: half turns land true)
    ];
    const spinAt = (i: number, s: number) => SPIN[i].turns * TURN * (1 - decel(s / SPIN[i].dur));

    function tick(now: number) {
      raf = 0;
      if (startRef.current && t0 === null) { t0 = now; spinFrom = now + 450; }   // spin starts once the loader veil has cleared
      const t = t0 === null ? 0 : (now - t0) / 1000;
      const s = reduce || spinFrom === null ? 99 : (now - spinFrom) / 1000;
      const p = progress?.current ?? 0;
      const edge = smooth(0.02, 0.4, p);
      const free = 1 - edge;

      // ── arrival: grows in from a little smaller and further back while the gimbals spin down
      const land = t0 === null ? 0 : reduce ? 1 : outCubic(t / 0.9);
      piece.scale.setScalar(0.72 + 0.28 * land);
      piece.position.z = (1 - land) * -220;
      piece.visible = land > 0.002;

      // ── gimbals: opening/click spin + drag + a gentle per-gimbal lean toward the cursor
      const ax = reduce ? 0 : aim.x * free, ay = reduce ? 0 : aim.y * free;
      gOuter.rotation.y = spinAt(0, s) + aOuter.step(drag.outer * free + ax * 0.22);
      gMid.rotation.x = spinAt(1, s) + aMid.step(drag.mid * free + ay * 0.26);
      gInner.rotation.y = spinAt(2, s) + aInner.step(-drag.outer * 0.6 * free - ax * 0.2);
      gCore.rotation.z = spinAt(3, s) + aCore.step((drag.outer + drag.mid) * 0.5 * free + ax * 0.12);

      // ── the whole piece: a small tilt, a slow float, and the scroll turn to edge-on
      const rx = tiltX.step(ay * 0.14);
      const ry = tiltY.step(ax * 0.2);
      obj.rotation.set(rx, ry + edge * (Math.PI / 2), 0);
      const lift = reduce ? 0 : (Math.sin(t * 0.7) * 0.5 + 0.5) * 5 * free;
      obj.position.y = lift;

      // contact shadow: follows the piece's turn and float
      const turn = Math.abs(Math.sin(ry + edge * (Math.PI / 2)));
      const w = SIZE * (1.05 - 0.5 * turn) * (1 + lift / 120);
      blot.scale.set(w, w * 0.36 + turn * 60, 1);
      blotMat.opacity = Math.max(0, 0.72 - lift / 60 - Math.abs(rx) * 0.3) * land;

      // the key light drifts a little with the cursor, so highlights travel across the glaze
      key.position.set(-420 + ax * 160, 520 - ay * 120, 760);

      renderer.render(scene, camera);

      const springs = [tiltX, tiltY, aOuter, aMid, aInner, aCore];
      const settled = springs.every((x) => x.still) && !dragging && s > 3.8;
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
