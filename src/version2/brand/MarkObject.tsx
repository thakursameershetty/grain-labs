// A G mark as a physical object: the SVG path extruded and bevelled, dark metal lit like a product shot.
// It turns to face the cursor, can be dragged to spin (and settles back with some weight), and floats gently.
// With `progress` (0–1, e.g. scroll through the hero) it turns edge-on, so it thins to a sliver of light.
// No model files: geometry comes from the mark's path, reflections from a generated studio room.
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Mark } from "./marks";

function extrude(d: string) {
  const shapes = SVGLoader.createShapes(new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths[0]);
  return new THREE.ExtrudeGeometry(shapes, {
    depth: 16, bevelEnabled: true, bevelThickness: 3.2, bevelSize: 2.4, bevelSegments: 8, curveSegments: 40,
  });
}

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

type Props = {
  mark: Mark;
  accent?: string;
  className?: string;
  /** 0–1: 0 faces the viewer, 1 is edge-on */
  progress?: RefObject<number>;
  /** camera distance: larger = smaller object */
  distance?: number;
};

export default function MarkObject({ mark, accent = "#d9ff5a", className = "mark-object", progress, distance = 420 }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
    camera.position.set(0, 0, distance);

    // geometry: SVG is y-down, so flip it, then centre it on the origin
    const parts = [extrude(mark.d)];
    if (mark.accent) parts.push(extrude(mark.accent));
    const all = mergeGeometries(parts.map((g) => g.clone()));
    all.computeBoundingBox();
    const c = new THREE.Vector3(); all.boundingBox!.getCenter(c);
    all.dispose();
    for (const g of parts) { g.translate(-c.x, -c.y, -c.z); g.scale(1, -1, 1); g.computeVertexNormals(); }

    const metal = new THREE.MeshPhysicalMaterial({ color: 0x2a2b2e, metalness: 1, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    const lit = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(accent), metalness: 0.2, roughness: 0.35, clearcoat: 1, emissive: new THREE.Color(accent), emissiveIntensity: 0.25 });

    const obj = new THREE.Group();
    obj.add(new THREE.Mesh(parts[0], metal));
    if (parts[1]) obj.add(new THREE.Mesh(parts[1], lit));
    scene.add(obj);

    // one key light that glides with the cursor, plus a cool rim from behind
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(120, 160, 260); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb4ff, 1.4); rim.position.set(-200, -60, -200); scene.add(rim);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);

    // pointer: look-at target; drag: adds spin that springs back
    const aim = { x: 0, y: 0 }, rot = { x: 0, y: 0 };
    let spin = 0, spinV = 0, dragging = false, lastX = 0, raf = 0, visible = true, lastP = -1;
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onMove = (e: PointerEvent) => {
      aim.x = (e.clientX / window.innerWidth) * 2 - 1;
      aim.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (dragging) { spinV += (e.clientX - lastX) * 0.0022; lastX = e.clientX; }
      if (reduce) kick();   // reduced motion: redraw only on input
    };
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId); };
    const onUp = () => { dragging = false; };
    const onScroll = () => { if (reduce) kick(); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(el);
    const t0 = performance.now();
    function tick(now: number) {
      raf = 0;
      const t = (now - t0) / 1000;
      const p = progress?.current ?? 0;
      const edge = smooth(0.02, 0.4, p);          // how far it has turned edge-on
      const free = 1 - edge;                      // cursor and float fade out as it turns
      rot.x += (aim.y * 0.28 - rot.x) * 0.06;
      rot.y += (aim.x * 0.45 - rot.y) * 0.06;
      // spin with momentum, then a soft spring pulls it back to facing front (nearest full turn)
      spin += spinV; spinV *= 0.94;
      if (!dragging) { const home = Math.round(spin / (Math.PI * 2)) * Math.PI * 2; spinV += (home - spin) * 0.012; }
      obj.rotation.set(rot.x * free, (rot.y + spin) * free + edge * (Math.PI / 2), 0);
      obj.position.y = reduce ? 0 : Math.sin(t * 0.9) * 3 * free;
      key.position.set(120 + aim.x * 220 * free, 160 - aim.y * 160 * free, 260);
      renderer.render(scene, camera);
      const settled = Math.abs(spinV) < 1e-4 && p === lastP;
      lastP = p;
      if (visible && !(reduce && settled)) raf = requestAnimationFrame(tick);
    }
    kick();

    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      parts.forEach((g) => g.dispose()); metal.dispose(); lit.dispose(); pmrem.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mark, accent, progress, distance]);

  return <div ref={host} className={className} />;
}
