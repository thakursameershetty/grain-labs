/* Hero 3D: "The grain".
   A glossy black seed made of six shell segments. It turns to follow the cursor.
   On hover the shell peels open from the base and shows a glowing core with four agents
   orbiting it: ledger, gate, reviewer and outbound, the roles grainlabs.ai says every fleet shares. */
(async function () {
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("box");
  const labels = [...document.querySelectorAll("#labels li")];
  const hint = document.getElementById("hint");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  let THREE, RoomEnvironment;
  try {
    THREE = await import("three");
    ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"));
  } catch (e) {
    console.warn("3D unavailable:", e);
    stage.classList.add("no3d");
    return;
  }

  const SIG = new THREE.Color("#ff5a1f");
  const PETALS = 6;
  const GAP = 0.035;          // radians between shell segments
  const HALF_H = 1.75;        // half height of the seed
  const PIVOT_Y = -1.45;      // segments hinge near the base
  const OPEN_ANGLE = 0.55;    // how far each segment peels outward

  /* renderer / scene / camera */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.8, 9.6);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd8c4, 2.6); rim.position.set(5, 2, -6); scene.add(rim);
  const coreLight = new THREE.PointLight(SIG, 0, 5, 1.4); scene.add(coreLight);

  /* seed-shaped segment: a wedge of a sphere, reshaped into a kernel
     (fuller at the base, tapering to a soft point at the top) */
  function petalGeometry(i) {
    const len = (Math.PI * 2) / PETALS;
    const g = new THREE.SphereGeometry(1, 40, 64, i * len + GAP / 2, len - GAP, 0, Math.PI);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      let x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const taper = 1 - 0.2 * y - 0.18 * Math.max(0, y) ** 3;  // fuller bottom, pointed top
      x *= taper; z *= taper * 0.92;                            // slightly flattened, like a real kernel
      p.setXYZ(k, x, y * HALF_H, z);
    }
    g.computeVertexNormals();
    return g;
  }

  const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0b0b, metalness: 0.5, roughness: 0.3,
    clearcoat: 1, clearcoatRoughness: 0.07, side: THREE.FrontSide
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x2a140b, emissive: SIG, emissiveIntensity: 0, roughness: 0.55, side: THREE.BackSide
  });

  const root = new THREE.Group();   // follows the cursor
  const seed = new THREE.Group();   // the kernel itself, tilted on a diagonal
  seed.rotation.z = -0.38;
  root.add(seed);
  scene.add(root);

  const petals = [];
  for (let i = 0; i < PETALS; i++) {
    const geo = petalGeometry(i);
    const phi = (i + 0.5) * ((Math.PI * 2) / PETALS);
    const dir = new THREE.Vector3(-Math.cos(phi), 0, Math.sin(phi));  // outward direction of this segment
    const axis = new THREE.Vector3(dir.z, 0, -dir.x);                 // hinge axis so the top tips outward
    const pivot = new THREE.Group();
    pivot.position.y = PIVOT_Y;
    const outer = new THREE.Mesh(geo, outerMat); outer.position.y = -PIVOT_Y;
    const inner = new THREE.Mesh(geo, innerMat); inner.position.y = -PIVOT_Y;
    pivot.add(outer, inner);
    seed.add(pivot);
    // stagger so the shell opens in a ripple rather than all at once
    petals.push({ pivot, dir, axis, delay: i * 0.05 });
  }

  /* inside: a core with a wireframe shell, and four agents in orbit */
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a0a04, emissive: SIG, emissiveIntensity: 2.2 })
  );
  const cage = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.42, 1)),
    new THREE.LineBasicMaterial({ color: SIG, transparent: true, opacity: 0.5 })
  );
  const inside = new THREE.Group();
  inside.position.y = -0.1;
  inside.add(core, cage);
  seed.add(inside);

  const AGENTS = [
    { y: 0.62, r: 0.5, speed: 0.55, phase: 0.0 },
    { y: 0.2, r: 0.62, speed: -0.42, phase: 1.7 },
    { y: -0.22, r: 0.64, speed: 0.38, phase: 3.4 },
    { y: -0.62, r: 0.52, speed: -0.5, phase: 5.0 }
  ];
  const agentMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe6d8, emissiveIntensity: 1.4 });
  const linkMat = new THREE.LineBasicMaterial({ color: SIG, transparent: true, opacity: 0 });
  const agents = AGENTS.map((a) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 20), agentMat);
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const link = new THREE.Line(lg, linkMat);
    inside.add(m, link);
    return { ...a, mesh: m, link };
  });

  /* sizing */
  let narrow = false;
  function resize() {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    narrow = r.width < 700;
    camera.position.z = narrow ? 13 : 9.6;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* pointer */
  const ptr = { nx: 0, ny: 0, inside: false, active: false };
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    ptr.active = true;
    ptr.nx = (e.clientX / innerWidth) * 2 - 1;
    ptr.ny = (e.clientY / innerHeight) * 2 - 1;
    const r = stage.getBoundingClientRect();
    const d = Math.hypot((e.clientX - (r.left + r.width / 2)) / (r.width * 0.5), (e.clientY - (r.top + r.height / 2)) / (r.height * 0.5));
    ptr.inside = d < 0.6;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { ptr.inside = false; });
  let tapOpen = false;
  stage.addEventListener("click", () => { if (coarse) tapOpen = !tapOpen; });
  if (coarse) hint.textContent = "Tap to open the grain";

  /* frame */
  let open = 0, rotY = 0, rotX = 0, time = 0, last = performance.now();
  const v = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Quaternion();
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;

    let target;
    if (coarse) target = tapOpen ? 1 : 0;
    else if (!ptr.active) target = Math.sin(time * 0.55 - 1.4) > 0.3 ? 1 : 0; // demo loop until the mouse moves
    else target = ptr.inside ? 1 : 0;
    open += (target - open) * (1 - Math.pow(0.03, dt));

    // follow the cursor, plus a slow idle sway
    const ty = (ptr.active ? ptr.nx * 0.7 : Math.sin(time * 0.3) * 0.5) + time * 0.08 * 0;
    const tx = ptr.active ? ptr.ny * 0.22 : 0;
    rotY += (ty - rotY) * (1 - Math.pow(0.05, dt));
    rotX += (tx - rotX) * (1 - Math.pow(0.05, dt));
    root.rotation.set(rotX, rotY, 0);
    root.position.y = Math.sin(time * 0.9) * 0.06 + 0.05;
    root.position.x = narrow ? -0.9 * ease(clamp01(open)) : 0;
    seed.rotation.y = time * 0.12;  // the kernel slowly turns on its own axis

    // peel each segment open with a small stagger
    let eMax = 0;
    for (const p of petals) {
      const e = ease(clamp01((open - p.delay) / (1 - 0.3)));
      eMax = Math.max(eMax, e);
      q.setFromAxisAngle(p.axis, OPEN_ANGLE * e);
      p.pivot.quaternion.copy(q);
      p.pivot.position.set(p.dir.x * 0.12 * e, PIVOT_Y - 0.05 * e, p.dir.z * 0.12 * e);
    }
    const e = ease(clamp01(open));
    innerMat.emissiveIntensity = 0.05 + e * 0.5;
    coreLight.intensity = e * 5;
    inside.scale.setScalar(0.6 + 0.4 * e);
    cage.rotation.y += dt * 0.4; cage.rotation.x += dt * 0.15;
    linkMat.opacity = e * 0.55;

    for (const a of agents) {
      const ang = a.phase + time * a.speed;
      a.mesh.position.set(Math.cos(ang) * a.r, a.y, Math.sin(ang) * a.r);
      a.mesh.scale.setScalar(e);
      const pos = a.link.geometry.attributes.position;
      pos.setXYZ(1, a.mesh.position.x, a.mesh.position.y, a.mesh.position.z);
      pos.needsUpdate = true;
    }

    // labels follow each agent; they flip to the left when the agent swings to that side
    root.updateMatrixWorld();
    const rect = stage.getBoundingClientRect();
    inside.getWorldPosition(c); c.project(camera);
    const cx = (c.x * 0.5 + 0.5) * rect.width;
    agents.forEach((a, i) => {
      a.mesh.getWorldPosition(v); v.project(camera);
      const sx = (v.x * 0.5 + 0.5) * rect.width, sy = (-v.y * 0.5 + 0.5) * rect.height;
      const left = sx < cx;
      const li = labels[i];
      li.classList.toggle("left", left);
      li.style.transform = left ? `translate(${sx}px, ${sy}px) translate(-100%, -50%)` : `translate(${sx}px, ${sy}px) translate(0, -50%)`;
      // labels fade while their agent passes behind the core
      const depth = v.z < c.z ? 1 : 0.45;
      li.style.opacity = clamp01((e - 0.45) / 0.55) * depth;
    });
    hint.style.opacity = 1 - e;

    renderer.render(scene, camera);
  }

  let running = false, raf = 0;
  const loop = (t) => { frame(t); raf = requestAnimationFrame(loop); };
  if (reduce) {
    ptr.active = true; ptr.inside = true;
    for (let i = 0; i < 160; i++) frame(last + 16 * i);
  } else {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
      else if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(stage);
  }
})();
