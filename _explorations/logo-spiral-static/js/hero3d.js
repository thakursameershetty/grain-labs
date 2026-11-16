/* Hero 3D: the Grain logo, as an object.
   The logo is a square spiral. Here it is a glossy 3D piece in the logo's rust-to-salmon colors.
   It turns to follow the cursor. On hover the spiral rises into a ramp, and a task travels it
   from the outer edge to the center, passing the five steps of a run. */
(async function () {
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("box");
  const labels = [...document.querySelectorAll("#labels li")];
  const svg = document.getElementById("leaders");
  const hint = document.getElementById("hint");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  let THREE, RoomEnvironment, RoundedBoxGeometry, mergeGeometries;
  try {
    THREE = await import("three");
    ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"));
    ({ RoundedBoxGeometry } = await import("three/addons/geometries/RoundedBoxGeometry.js"));
    ({ mergeGeometries } = await import("three/addons/utils/BufferGeometryUtils.js"));
  } catch (e) {
    console.warn("3D unavailable:", e);
    stage.classList.add("no3d");
    return;
  }

  /* logo palette */
  const RUST = new THREE.Color("#8f3a30");
  const SALMON = new THREE.Color("#e6a493");
  const GLOW = new THREE.Color("#ff8a6b");

  /* spiral path — same construction as the logo: an inward square spiral */
  const L = 3.2;      // outer size
  const T = 0.34;     // bar width
  const D = 0.5;      // bar depth
  const S = 0.7;      // spacing between rings
  const LIFT = 1.15;  // how far the center rises when unfolded

  const pts = [new THREE.Vector2(-L / 2, -L / 2)];
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const lens = [L, L, L];
  for (let k = 1; L - k * S > S * 0.6; k++) lens.push(L - k * S, L - k * S);
  lens.forEach((len, i) => {
    const [dx, dy] = dirs[i % 4];
    const p = pts[pts.length - 1];
    pts.push(new THREE.Vector2(p.x + dx * len, p.y + dy * len));
  });
  const segLen = lens;
  const total = segLen.reduce((a, b) => a + b, 0);

  // point on the path at u ∈ [0,1]
  function pathAt(u, out) {
    let d = u * total;
    for (let i = 0; i < segLen.length; i++) {
      if (d <= segLen[i] || i === segLen.length - 1) {
        const a = pts[i], b = pts[i + 1], t = Math.min(1, d / segLen[i]);
        return out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      }
      d -= segLen[i];
    }
    return out;
  }

  /* geometry: one rounded bar per segment, merged, with an "along" attribute (0 outer → 1 center)
     that the shader uses to raise the spiral into a ramp */
  const parts = [];
  let acc = 0;
  segLen.forEach((len, i) => {
    const a = pts[i], b = pts[i + 1];
    const horiz = a.y === b.y;
    const g = new RoundedBoxGeometry(horiz ? len + T : T, horiz ? T : len + T, D, 3, 0.07);
    const mid = new THREE.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2);
    g.translate(mid.x, mid.y, 0);
    const p = g.attributes.position;
    const along = new Float32Array(p.count);
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let k = 0; k < p.count; k++) {
      // distance along this segment, clamped to the segment's ends
      const local = horiz ? (p.getX(k) - a.x) * Math.sign(b.x - a.x) : (p.getY(k) - a.y) * Math.sign(b.y - a.y);
      const u = (acc + Math.max(0, Math.min(len, local))) / total;
      along[k] = u;
      c.copy(RUST).lerp(SALMON, Math.pow(u, 0.9));
      col.set([c.r, c.g, c.b], k * 3);
    }
    g.setAttribute("along", new THREE.BufferAttribute(along, 1));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    parts.push(g);
    acc += len;
  });
  const spiralGeo = mergeGeometries(parts);

  /* renderer / scene / camera */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-4, 5, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd2c2, 2.4); rim.position.set(5, 4, -5); scene.add(rim);
  const taskLight = new THREE.PointLight(GLOW, 0, 3, 1.5); scene.add(taskLight);

  const uniforms = { uOpen: { value: 0 }, uLift: { value: LIFT } };
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, metalness: 0.15, roughness: 0.32,
    clearcoat: 1, clearcoatRoughness: 0.06
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uOpen = uniforms.uOpen;
    sh.uniforms.uLift = uniforms.uLift;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float along;\nuniform float uOpen;\nuniform float uLift;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.z += along * uLift * uOpen;");
  };

  const root = new THREE.Group();
  const spiral = new THREE.Mesh(spiralGeo, mat);
  root.add(spiral);
  scene.add(root);

  /* the task travelling the spiral */
  const task = new THREE.Mesh(
    new RoundedBoxGeometry(0.2, 0.2, 0.2, 2, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: GLOW, emissiveIntensity: 1.6 })
  );
  root.add(task);

  /* where each step sits along the path: middle of the left, top, right and bottom outer bars,
     then the very center, so every label gets its own side and no leader lines cross */
  const cum = [0]; segLen.forEach((l) => cum.push(cum[cum.length - 1] + l));
  const STEP_U = [0, 1, 2, 3].map((i) => (cum[i] + segLen[i] / 2) / total).concat(1);

  /* sizing */
  let narrow = false, W = 1, H = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    camera.aspect = W / H;
    narrow = W < 700;
    camera.position.z = narrow ? 14 : 10;
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
  if (coarse) hint.textContent = "Tap to unfold";

  /* leader lines (SVG) */
  svg.innerHTML = STEP_U.map(() => `<g><line /><circle r="3.2" /></g>`).join("");
  const leaders = [...svg.querySelectorAll("g")];

  /* frame */
  let open = 0, rotY = -0.5, rotX = 0.35, time = 0, last = performance.now();
  let tu = 0, hold = 0;
  const p2 = new THREE.Vector2(), v = new THREE.Vector3(), edge = new THREE.Vector3();
  const ease = (t) => t * t * (3 - 2 * t);

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;

    let target;
    if (coarse) target = tapOpen ? 1 : 0;
    else if (!ptr.active) target = Math.sin(time * 0.5 - 1.3) > 0.25 ? 1 : 0;
    else target = ptr.inside ? 1 : 0;
    open += (target - open) * (1 - Math.pow(0.035, dt));
    const e = ease(Math.max(0, Math.min(1, open)));
    uniforms.uOpen.value = e;

    // cursor follow around a 3/4 view
    const ty = -0.42 + (ptr.active ? ptr.nx * 0.45 : Math.sin(time * 0.3) * 0.25);
    const tx = 0.32 + (ptr.active ? ptr.ny * 0.18 : 0);
    rotY += (ty - rotY) * (1 - Math.pow(0.05, dt));
    rotX += (tx - rotX) * (1 - Math.pow(0.05, dt));
    root.rotation.set(-rotX, rotY, 0);
    root.position.y = Math.sin(time * 0.9) * 0.05 + 0.1;

    // task travels outer edge → center, pausing at Approve
    let active = -1;
    if (e > 0.5) {
      if (hold > 0) hold -= dt;
      else {
        const before = tu;
        tu += dt * 0.16;
        if (before < STEP_U[3] && tu >= STEP_U[3]) hold = 1.6;   // wait for sign-off
        if (tu > 1.12) tu = 0;
      }
      STEP_U.forEach((u, i) => { if (Math.min(tu, 1) >= u - 0.02) active = i; });
    } else if (e < 0.15) tu = 0;
    const uu = Math.min(1, tu);
    pathAt(uu, p2);
    task.position.set(p2.x, p2.y, D / 2 + 0.14 + uu * LIFT * e);
    task.scale.setScalar(e > 0.5 && tu <= 1.02 ? 1 : 0.001);
    task.rotation.z += dt * 1.5;
    task.getWorldPosition(taskLight.position);
    taskLight.intensity = e * 4;

    // labels: each one pushed outward from the spiral's center, on its own side
    root.updateMatrixWorld();
    edge.set(0, 0, D / 2 + 0.5 * LIFT * e).applyMatrix4(root.matrixWorld).project(camera);
    const cx = (edge.x * 0.5 + 0.5) * W, cy = (-edge.y * 0.5 + 0.5) * H;
    // fixed outward directions: left, up, right, down, and up-right for the center
    // Intake ← left, Route ↑ top, Execute ↗ right, Approve ↘ bottom-right (clear of the spec text),
    // Inspect → from the center, out past the right side
    const OUT = [[-1, 0.1], [0.3, -1], [1, -0.55], [0.55, 1], [1, 0.42]];
    const reach = narrow ? 30 : 60;
    const REACH_MULT = [1, 1.5, 1, 1, 5.3];
    STEP_U.forEach((u, i) => {
      pathAt(u, p2);
      v.set(p2.x, p2.y, D / 2 + u * LIFT * e).applyMatrix4(root.matrixWorld).project(camera);
      const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H;
      const [ox, oy] = OUT[i];
      const n = Math.hypot(ox, oy);
      const r = reach * REACH_MULT[i];
      let lx = px + (ox / n) * r, ly = py + (oy / n) * r;
      const leftSide = ox < 0;
      lx = Math.max(leftSide ? 120 : 8, Math.min(W - (leftSide ? 8 : 140), lx));
      ly = Math.max(14, Math.min(H - 14, ly));
      const g = leaders[i];
      const ln = g.firstChild, dot = g.lastChild;
      ln.setAttribute("x1", px); ln.setAttribute("y1", py);
      ln.setAttribute("x2", lx); ln.setAttribute("y2", ly);
      dot.setAttribute("cx", px); dot.setAttribute("cy", py);
      const vis = narrow ? 0 : Math.max(0, (e - 0.4) / 0.6);  // phones: no room, the hint line shows the step instead
      g.style.opacity = vis;
      g.classList.toggle("on", i === active);
      const li = labels[i];
      li.style.transform = leftSide
        ? `translate(${lx - 8}px, ${ly}px) translate(-100%, -50%)`
        : `translate(${lx + 8}px, ${ly}px) translate(0, -50%)`;
      li.classList.toggle("left", leftSide);
      li.style.opacity = vis;
      li.classList.toggle("on", i === active);
    });
    void cx; void cy;
    if (narrow && e > 0.5) {
      const txt = active >= 0 ? `${labels[active].querySelector(".n").textContent} · ${labels[active].querySelector(".t").textContent}` : "";
      if (hint.textContent !== txt) hint.textContent = txt;
      hint.classList.add("step");
      hint.style.opacity = 1;
    } else {
      if (hint.classList.contains("step")) { hint.classList.remove("step"); hint.textContent = coarse ? "Tap to unfold" : "Hover to unfold"; }
      hint.style.opacity = 1 - e;
    }

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
