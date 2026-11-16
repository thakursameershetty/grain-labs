// Builds the Capabilities figure: an exploded "operations stack".
// Six machined plates (Intake → Packaging) on a plinth, caged by three posts and rails (Governance),
// with a shuttle on the right post that carries corrections from the top back to the base (Improvement).
// Run: node tools/stack/build.mjs  → writes src/components/grain/stack-art.ts (+ a preview page with --preview)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const KIT = "/Users/thakur/.claude/skills/anatomy";
const k = await import(`${KIT}/kit/iso-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const WIDTH = 760, HEIGHT = 800;
const PLAN = { x: -100, y: -100, w: 200, d: 200, r: 10 };
const H = 9;                       // plate thickness
const REST_GAP = 3, APART_GAP = 46;
const OPEN = 92;                   // extra lift for the layers above the one being inspected
const Z0 = 8;                      // first plate sits on standoffs above the plinth
const zRest = (i) => Z0 + i * (H + REST_GAP);
const LIFT = APART_GAP - REST_GAP; // extra height per layer when apart
const TOP_APART = Z0 + 5 * (H + APART_GAP) + H;
const POST = 123, POST_W = 10, POST_TOP = TOP_APART + OPEN + 18;
const PLINTH = { x: -136, y: -136, w: 272, d: 272, r: 14 };

const P = k.fitProjection(
  [...k.boxCorners(PLINTH, -18, 0), [POST, -POST, POST_TOP + 6], [-POST, POST, POST_TOP + 6], [-POST, -POST, POST_TOP + 6], [0, 0, TOP_APART + 20]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 45 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const T = (xy, z, text, opts) => k.faceTextSvg(k.topMatrix(xy, z, P, "x"), text, opts);

// which side corner is on the right of the screen
const RIGHT = at([POST, -POST, 0])[0] > at([-POST, POST, 0])[0] ? [POST, -POST] : [-POST, POST];
const LEFT = RIGHT[0] === POST ? [-POST, POST] : [POST, -POST];
const BACK = [-POST, -POST];

/* ───────── plinth (governance base) ───────── */
function plinth() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLINTH, -18, 18, P)}"/>`];
  for (const [x, y] of [...k.corners(PLINTH, 24)].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    out.push(S(k.cylinder(x, y, 8, -18, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -16, 4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLINTH, -12, 12, P, 8, 1.4), { tone: "mid", inner: L(k.sideSeam(PLINTH, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(PLINTH, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  // ruler strip along the front-left edge
  const strip = { x: -112, y: PLINTH.y + PLINTH.d - 16, w: 150, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // name plate on the plinth
  const plate = { x: 52, y: PLINTH.y + PLINTH.d - 20, w: 56, d: 12, r: 1.5 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(T([plate.x + 4, plate.y + 8.6], 0.8, "GRAIN · OPS STACK", { size: 3.4, tone: "mid" }));
  // four standoffs under the first plate
  for (const [x, y] of k.corners(PLAN, 26).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    out.push(S(k.cylinder(x, y, 5, 0, Z0, P, 24), { tone: "mid" }));
  }
  return out.join("");
}

/* ───────── governance cage ───────── */
function post([x, y]) {
  const plan = { x: x - POST_W / 2, y: y - POST_W / 2, w: POST_W, d: POST_W, r: 1.5 };
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(plan, -3), 0, 6, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(plan, 6, POST_TOP - 6, P, 3, 0.4), { tone: "mid", inner: L([60, 130, 200].map((z) => k.sideSeam(plan, z, P, 3)).join(""), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(plan, -2.5), POST_TOP, 5, P, 3, 0.6), { tone: "mid" }));
  out.push(D([at([x, y, POST_TOP + 5])], { size: 0.6 }));
  return out.join("");
}
function rail(a, b, z) {
  const xs = [Math.min(a[0], b[0]), Math.max(a[0], b[0])], ys = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  const plan = { x: xs[0] - 2.5 + (xs[0] === xs[1] ? 0 : POST_W / 2), y: ys[0] - 2.5 + (ys[0] === ys[1] ? 0 : POST_W / 2), w: xs[0] === xs[1] ? 5 : xs[1] - xs[0] - POST_W, d: ys[0] === ys[1] ? 5 : ys[1] - ys[0] - POST_W, r: 1 };
  return S(k.slabOf(plan, z, 5, P, 2, 0.3), { tone: "mid" });
}
function cageBack() {
  // back post and the two back rails (top and middle), all behind the stack
  const out = [post(BACK)];
  for (const z of [POST_TOP - 10, 120]) {
    out.push(rail(BACK, [POST, -POST], z), rail(BACK, [-POST, POST], z));
  }
  return out.join("");
}

/* ───────── the six layers ───────── */
const NAMES = ["Intake", "Routing", "Execution", "Approvals", "Inspection", "Packaging"];
function plateBody(i, z) {
  const top = z + H;
  const out = [];
  out.push(S(k.slabOf(PLAN, z, H, P, 8, 1.2), { tone: "mid", crease: "faint", inner: L(k.sideSeam(PLAN, z + H * 0.42, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLAN, 6), top, P), { tone: "faint" }));
  const screws = k.corners(PLAN, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, top, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, top])), { size: 0.5 }));
  // engraved number + name near the front edge
  out.push(T([-88, 88], top, `0${i + 1}  ${NAMES[i].toUpperCase()}`, { size: 4.2, tone: "lo" }));
  return { out, top };
}
function pins(top) {
  // alignment pins that seat into the plate above
  return k.corners(PLAN, 28).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
    .map(([x, y]) => S(k.cylinder(x, y, 2.6, top, 3, P, 18), { tone: "mid", crease: "none" })).join("");
}
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function intake(z) {
  const { out, top } = plateBody(0, z);
  // inbox tray: a recessed well with three letters in it
  const tray = { x: -58, y: -34, w: 116, d: 78, r: 4 };
  out.push(S(k.slabOf(tray, top, 0.4, P, 4), { tone: "lo", flat: true, crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(tray, 3), top + 0.4, P), { tone: "faint" }));
  for (const [j, y] of [-22, -2, 18].entries()) {
    const env = { x: -44 + j * 6, y, w: 76, d: 14, r: 1 };
    out.push(S(k.slabOf(env, top + 0.4, 1.4, P, 2), { tone: "hi", crease: "none" }));
    out.push(L(k.onTop([[env.x, env.y], [env.x + env.w / 2, env.y + 7], [env.x + env.w, env.y]], top + 1.8, P), { tone: "lo" }));
  }
  // five connector ports along the back edge
  for (const x of byDepth([-64, -32, 0, 32, 64].map((x) => [x, -80])).map((p) => p[0])) {
    const port = { x: x - 9, y: -88, w: 18, d: 12, r: 1.5 };
    out.push(S(k.slabOf(port, top, 5, P, 2, 0.4), { tone: "mid" }));
    out.push(L(k.planOutline({ x: x - 6, y: -84.5, w: 12, d: 5, r: 1 }, top + 5, P, 2), { tone: "lo" }));
  }
  out.push(pins(top));
  return out.join("");
}
function routing(z) {
  const { out, top } = plateBody(1, z);
  // a central router chip with pins on all sides
  const chip = { x: -22, y: -22, w: 44, d: 44, r: 2 };
  // traces from edge pads to the chip (manhattan)
  const traces = [];
  [-66, -46, -26, 26, 46, 66].forEach((y, j) => {
    const ex = -84, mid = -50 + (j % 3) * 8, cy = Math.max(-18, Math.min(18, y * 0.3));
    traces.push([[ex, y], [mid, y], [mid, cy], [chip.x, cy]]);
    const ex2 = 84, mid2 = 50 - (j % 3) * 8;
    traces.push([[ex2, -y], [mid2, -y], [mid2, -cy], [chip.x + chip.w, -cy]]);
  });
  out.push(L(traces.map((t) => k.onTop(t, top, P)).join(""), { tone: "lo" }));
  out.push(D(traces.flatMap((t) => [at([t[0][0], t[0][1], top])]), { size: 0.75, tone: "mid" }));
  out.push(D(k.dotGrid(-70, -84, 15, 2, 10, top, P), { size: 0.35, tone: "lo" }));
  out.push(S(k.slabOf(chip, top, 3, P, 3, 0.5), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan(chip, 5), top + 3, P, 2), { tone: "faint" }));
  out.push(D([at([chip.x + 7, chip.y + 7, top + 3])], { size: 0.7, tone: "mid" }));
  out.push(pins(top));
  return out.join("");
}
function execution(z) {
  const { out, top } = plateBody(2, z);
  // a 4×4 array of processing cores on a carrier
  const carrier = { x: -66, y: -66, w: 132, d: 132, r: 4 };
  out.push(S(k.slabOf(carrier, top, 1.4, P, 4, 0.4), { tone: "mid" }));
  const cells = [];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) cells.push([-56 + a * 30, -56 + b * 30]);
  for (const [x, y] of byDepth(cells.map(([x, y]) => [x + 11, y + 11])).map(([x, y]) => [x - 11, y - 11])) {
    const core = { x, y, w: 22, d: 22, r: 1.5 };
    out.push(S(k.slabOf(core, top + 1.4, 3.2, P, 2, 0.5), { tone: "hi", crease: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(core, 4), top + 4.6, P, 2), { tone: "faint" }));
  }
  out.push(pins(top));
  return out.join("");
}
function approvals(z) {
  const { out, top } = plateBody(3, z);
  // a gate: two pillars and a crossbar over a lane
  const lane = { x: -80, y: -10, w: 160, d: 20, r: 2 };
  out.push(S(k.slabOf(lane, top, 0.4, P, 3), { tone: "lo", flat: true, crease: "none" }));
  out.push(L(k.onTop([[-76, 0], [-14, 0]], top + 0.4, P) + k.onTop([[14, 0], [76, 0]], top + 0.4, P), { tone: "faint", dashed: true }));
  for (const y of [-16, 16].sort((a, b) => k.depthOf([0, a, 0], P) - k.depthOf([0, b, 0], P))) {
    out.push(S(k.slabOf({ x: -5, y: y - 5, w: 10, d: 10, r: 1.5 }, top, 26, P, 3, 0.4), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: -4, y: -22, w: 8, d: 44, r: 1.5 }, top + 26, 5, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  // a toggle switch and a stamp pad
  const sw = { x: 40, y: -66, w: 30, d: 20, r: 2 };
  out.push(S(k.slabOf(sw, top, 6, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(55, -56, 3, top + 6, 8, P, 18), { tone: "hi" }));
  out.push(D([at([55, -56, top + 14])], { size: 0.7, tone: "hi" }));
  out.push(S(k.cylinder(-56, -54, 13, top, 6, P, 36, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(-56, -54, 13, top + 1, top + 6, 40, P), { tone: "lo" }));
  out.push(L(k.ring(-56, -54, 8, top + 6, P, 28), { tone: "faint" }));
  out.push(pins(top));
  return out.join("");
}
function inspection(z) {
  const { out, top } = plateBody(4, z);
  // a scan lens with a graduated bezel and a crosshair
  out.push(S(k.cylinder(0, 0, 50, top, 4, P, 72, 0.8), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 42, top + 4, P, 72), { tone: "lo" }));
  const ticks = k.radialTicks(0, 0, 49, 60, 5, top + 4, [2, 4.5], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 38, top + 4, 0.6, P, 64), { tone: "hi", flat: true, crease: "none" }));
  out.push(L(k.lineOnTop([-34, 0], [34, 0], top + 4.6, P) + k.lineOnTop([0, -34], [0, 34], top + 4.6, P), { tone: "lo" }));
  out.push(L(k.ring(0, 0, 14, top + 4.6, P, 40), { tone: "faint" }));
  // the scan head on a short arm
  out.push(S(k.slabOf({ x: 56, y: -8, w: 26, d: 16, r: 2 }, top, 7, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: 60, y: -4, w: 10, d: 8, r: 1 }, top + 7, P, 2), { tone: "lo" }));
  out.push(pins(top));
  return out.join("");
}
function packaging(z) {
  const { out, top } = plateBody(5, z);
  // the sealed lid: a raised panel with the Grain spiral engraved, and four seal tabs
  const panel = { x: -64, y: -64, w: 128, d: 128, r: 6 };
  out.push(S(k.slabOf(panel, top, 2, P, 6, 0.6), { tone: "hi", crease: "lo" }));
  const logo = [[3, 21], [3, 3], [21, 3], [21, 21], [9, 21], [9, 9], [15, 9], [15, 15]].map(([u, v]) => [(u - 12) * 4.6, (v - 12) * 4.6]);
  out.push(`<g class="stk-logo">${L(k.onTop(logo, top + 2, P), { tone: "lit" })}</g>`);
  for (const [x, y] of byDepth([[0, -88], [-88, 0], [88, 0], [0, 88]])) {
    const tab = Math.abs(x) > 0 ? { x: x - 4, y: y - 14, w: 8, d: 28, r: 1.5 } : { x: x - 14, y: y - 4, w: 28, d: 8, r: 1.5 };
    out.push(S(k.slabOf(tab, top, 2.4, P, 2, 0.3), { tone: "mid" }));
  }
  return out.join("");
}
const LAYERS = [intake, routing, execution, approvals, inspection, packaging];

/* ───────── improvement shuttle (on the right post) ───────── */
const OUT = [Math.sign(RIGHT[0]), Math.sign(RIGHT[1])];
const SHUTTLE_C = [RIGHT[0] + OUT[0] * 4 + (OUT[1] !== 0 ? 0 : 0), RIGHT[1] + OUT[1] * 4];
function shuttleRail() {
  // a guide strip on the outer face of the right post
  const [x, y] = RIGHT;
  const plan = { x: x + (OUT[0] > 0 ? POST_W / 2 : -POST_W / 2 - 3), y: y - 2, w: 3, d: 4, r: 0.6 };
  return S(k.slabOf(plan, 10, POST_TOP - 24, P, 2), { tone: "lo", crease: "none" });
}
function shuttle() {
  const [x, y] = RIGHT;
  const side = OUT[0];
  const body = { x: x + (side > 0 ? POST_W / 2 + 3 : -POST_W / 2 - 3 - 16), y: y - 9, w: 16, d: 18, r: 2 };
  return [
    `<path class="iso-halo" style="filter:blur(3px);opacity:.25" d="${k.haloOf(k.insetPlan(body, 2), 0, 0.1, P)}"/>`,
    S(k.slabOf(body, 0, 16, P, 3, 0.5), { tone: "hi", lit: true }),
    L(k.planOutline(k.insetPlan(body, 3.5), 16, P, 2), { tone: "faint" }),
    D([at([body.x + body.w / 2, body.y + body.d / 2, 16])], { size: 0.8, tone: "hi" }),
  ].join("");
}

/* ───────── anchors for labels ───────── */
// the outermost visible corners of each plate on screen (left and right), at the plate's mid height
const cornerL = [[-100, 100], [100, -100]].sort((a, b) => at([a[0], a[1], 0])[0] - at([b[0], b[1], 0])[0])[0];
const cornerR = [[-100, 100], [100, -100]].sort((a, b) => at([a[0], a[1], 0])[0] - at([b[0], b[1], 0])[0])[1];
const anchors = LAYERS.map((_, i) => ({ left: at([cornerL[0], cornerL[1], zRest(i) + H / 2]), right: at([cornerR[0], cornerR[1], zRest(i) + H / 2]) }));
const up = k.axisVector(P, [0, 0, 1]);   // screen offset per world unit of height

const art = {
  width: WIDTH,
  height: HEIGHT,
  up,
  lift: LIFT,
  open: OPEN,
  shuttleTravel: [zRest(0) + 2, Z0 + 5 * (H + REST_GAP) + H + 2],
  shuttleTravelApart: [zRest(0) + 2, TOP_APART - 6],
  restTop: Z0 + 5 * (H + REST_GAP) + H,
  apartTop: TOP_APART,
  anchors,
  base: plinth() + cageBack() + post(LEFT) + post(RIGHT) + shuttleRail(),
  layers: LAYERS.map((f, i) => f(zRest(i))),
  shuttle: shuttle(),
};

const out = `// GENERATED by tools/stack/build.mjs (anatomy kit). Do not edit by hand; edit the build script and re-run it.
export const STACK = ${JSON.stringify(art)} as const;
`;
writeFileSync(join(ROOT, "src/components/grain/stack-art.ts"), out);
console.log("wrote src/components/grain/stack-art.ts", (out.length / 1024).toFixed(0) + " KB");

if (process.argv.includes("--preview")) {
  const theme = process.argv.includes("--light") ? "light" : "dark";
  const apart = process.argv.includes("--apart");
  const g = art.layers.map((svg, i) => `<g transform="translate(${(apart ? up[0] * LIFT * i : 0).toFixed(2)} ${(apart ? up[1] * LIFT * i : 0).toFixed(2)})">${svg}</g>`).join("");
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: "Grain operations stack", body: [art.base, g, `<g transform="translate(0 ${(up[1] * 120).toFixed(2)})">${art.shuttle}</g>`] });
  const dir = process.env.PREVIEW_DIR || HERE;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `stack-${theme}${apart ? "-apart" : ""}.html`), k.pageHtml({ title: "Stack", theme, body: `<div class="iso-stage">${svg}</div>`, script: "", width: 900 }));
  console.log("preview written");
}
