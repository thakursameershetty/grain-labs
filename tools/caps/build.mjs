// Builds the four Capabilities illustrations (anatomy kit, isometric hairline office objects).
//   1 Takes in the work  — an inbox tray: two sheets drop in onto the stack, a binder clip, a routing tag
//   2 Does the work      — a clipboard checklist that ticks itself off, a checkpoint bookmark
//   3 Waits for you      — a document, a rubber stamp that presses "APPROVED", a magnifier on a cited line
//   4 Hands back a packet — a folder whose documents float exploded and close into one sealed packet
// Moving groups carry data-move + an inline --off (their rest offset); the page animates them to 0.
// Run: node tools/caps/build.mjs  → src/components/grain/caps-art.ts
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const k = await import("/Users/thakur/.claude/skills/anatomy/kit/iso-kit.mjs");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const W = 340, H = 240;
const view = (pts) => k.fitProjection(pts, W, H, { pad: 12, azimuth: 45 });
function tools(P) {
  const at = (p) => k.iso(p, P);
  const up = k.axisVector(P, [0, 0, 1]), ax = k.axisVector(P, [1, 0, 0]);
  return {
    at,
    S: (paths, style) => k.solidSvg(paths, style),
    L: (d, style) => k.lineSvg(d, style),
    D: (pts, style) => k.dotsSvg(pts, style),
    T: (xy, z, text, opts) => k.faceTextSvg(k.topMatrix(xy, z, P, "x"), text, opts),
    slab: (plan, z, h, st = 3, bev = 0) => k.slabOf(plan, z, h, P, st, bev),
    cyl: (x, y, r, z, h, st = 28, bev = 0) => k.cylinder(x, y, r, z, h, P, st, bev),
    top: (pts, z, closed) => k.onTop(pts, z, P, closed),
    line: (a, b, z) => k.lineOnTop(a, b, z, P),
    outline: (plan, z, st = 3) => k.planOutline(plan, z, P, st),
    ring: (x, y, r, z) => k.ring(x, y, r, z, P, 32),
    // a moving group: drawn at its final place, offset by `by` (world units) until the card is "on"
    move: (by, svg, delay = 0) => {
      const dx = up[0] * by[2] + ax[0] * by[0], dy = up[1] * by[2] + ax[1] * by[0];
      return `<g data-move style="--off:translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px);--delay:${delay}ms">${svg}</g>`;
    },
    show: (svg, delay = 0) => `<g data-show style="--delay:${delay}ms">${svg}</g>`,
    tick: (pts, z, delay = 0, done = false) => `<path class="iso-line cx-tick${done ? " done" : ""}" data-tone="lit" pathLength="1" style="--delay:${delay}ms" d="${k.onTop(pts, z, P)}"/>`,
    halo: (plan, z) => `<path class="iso-halo" d="${k.haloOf(plan, z, 0.1, P)}"/>`,
  };
}
// a desk mat under every object, with a fine grid along its front edges
function mat(t, plan) {
  return t.halo(k.insetPlan(plan, 14), 0);
}
const rules = (t, x0, x1, y0, n, gap, z, short = [0.62]) =>
  t.L(Array.from({ length: n }, (_, i) => t.line([x0, y0 + i * gap], [x0 + (x1 - x0) * (i === n - 1 ? short[0] : 1), y0 + i * gap], z)).join(""), { tone: "lo", free: true });
function sheet(t, plan, z, { lines = true, tone = "hi" } = {}) {
  const out = [t.S(t.slab(plan, z, 0.8, 2), { tone, crease: "none" })];
  if (lines) out.push(rules(t, plan.x + 8, plan.x + plan.w - 10, plan.y + 10, Math.floor((plan.d - 16) / 9), 9, z + 0.8));
  return out.join("");
}

/* 1 · inbox tray */
function inbox() {
  const MAT = { x: -88, y: -64, w: 176, d: 128, r: 6 };
  const P = view([...k.boxCorners({ x: -52, y: -40, w: 132, d: 80, r: 0 }, 0, 16), ...k.boxCorners({ x: -45, y: -28, w: 76, d: 60, r: 0 }, 70, 70)]);
  const t = tools(P);
  const T0 = { x: -52, y: -40, w: 96, d: 80, r: 4 };
  const out = [mat(t, MAT)];
  out.push(t.S(t.slab(T0, 0, 3, 4, 0.5), { tone: "mid" }));
  // back walls (tall), then the stack, then the low front lip
  out.push(t.S(t.slab({ x: T0.x, y: T0.y, w: T0.w, d: 3, r: 1 }, 3, 16, 2, 0.3), { tone: "mid" }));
  out.push(t.S(t.slab({ x: T0.x, y: T0.y + 3, w: 3, d: T0.d - 3, r: 1 }, 3, 16, 2, 0.3), { tone: "mid" }));
  const base = { x: -42, y: -30, w: 76, d: 60, r: 1 };
  out.push(sheet(t, { ...base, x: base.x + 2 }, 3, { lines: false, tone: "mid" }));
  out.push(sheet(t, base, 3.8, { lines: false }));
  // two incoming sheets drop in from above
  out.push(t.move([0, 0, 46], sheet(t, { ...base, x: base.x - 3, y: base.y + 2 }, 4.6, { lines: false }), 0));
  out.push(t.move([0, 0, 64], sheet(t, { ...base, x: base.x + 1 }, 5.4) + t.T([base.x + 8, base.y + base.d - 8], 6.2, "RE: PRICING", { size: 4, tone: "mid" }), 120));
  // binder clip that clamps the stack once it lands
  out.push(t.move([0, 0, 64], t.S(t.slab({ x: -6, y: base.y + base.d - 7, w: 14, d: 8, r: 1.5 }, 6.2, 3, 2, 0.3), { tone: "mid" }) + t.S(t.cyl(1, base.y + base.d - 3, 3, 9.2, 1.4, 16), { tone: "mid" }), 260));
  // front lip and right wall (low)
  out.push(t.S(t.slab({ x: T0.x + T0.w - 3, y: T0.y + 3, w: 3, d: T0.d - 3, r: 1 }, 3, 7, 2, 0.3), { tone: "mid" }));
  out.push(t.S(t.slab({ x: T0.x, y: T0.y + T0.d - 3, w: T0.w, d: 3, r: 1 }, 3, 7, 2, 0.3), { tone: "mid" }));
  // the routing tag, lying on the mat: it lights when the request is routed
  const tag = { x: 52, y: -26, w: 26, d: 16, r: 2 };
  out.push(t.S(t.slab(tag, 0, 1.2, 3, 0.3), { tone: "hi" }));
  out.push(t.L(t.ring(tag.x + 5, tag.y + 8, 2, 1.2), { tone: "mid" }));
  out.push(t.show(t.S(t.slab(k.insetPlan(tag, 0.01), 0, 1.2, 3, 0.3), { tone: "hi", lit: true }) + t.L(t.ring(tag.x + 5, tag.y + 8, 2, 1.2), { tone: "lit" }) + t.T([tag.x + 10, tag.y + 11], 1.2, "AGENT", { size: 3.6, tone: "hi" }), 700));
  return { svg: k.figureSvg({ width: W, height: H, label: "An inbox tray where incoming sheets land on the stack, are clipped together, and a routing tag lights up.", body: out }) };
}

/* 2 · clipboard checklist */
function checklist() {
  const MAT = { x: -88, y: -76, w: 176, d: 152, r: 6 };
  const P = view([...k.boxCorners({ x: -56, y: -74, w: 118, d: 142, r: 0 }, 0, 12)]);
  const t = tools(P);
  const BOARD = { x: -56, y: -68, w: 104, d: 136, r: 5 };
  const PAPER = { x: -48, y: -54, w: 88, d: 116, r: 1 };
  const out = [mat(t, MAT)];
  out.push(t.S(t.slab(BOARD, 0, 4, 6, 0.6), { tone: "mid" }));
  out.push(t.S(t.slab(PAPER, 4, 0.8, 2), { tone: "hi", crease: "none" }));
  const z = 4.8;
  const rows = [-40, -20, 0, 20, 40];
  rows.forEach((y, i) => {
    out.push(t.L(t.outline({ x: -40, y: y - 4, w: 8, d: 8, r: 1 }, z, 2), { tone: "mid" }));
    out.push(t.L(t.line([-26, y - 2], [30, y - 2], z) + t.line([-26, y + 2], [i % 2 ? 4 : 14, y + 2], z), { tone: "lo", free: true }));
    out.push(t.tick([[-39, y - 1], [-36.5, y + 2.5], [-31, y - 5.5]], z, 220 * Math.max(0, i - 1), i < 2));
  });
  // the checkpoint bookmark sticking out of the side at the last saved row
  out.push(t.show(t.S(t.slab({ x: 38, y: rows[2] - 5, w: 22, d: 10, r: 1 }, z, 0.8, 2), { tone: "hi", lit: true }) + t.T([44, rows[2] + 2], z + 0.8, "CP-07", { size: 3.4, tone: "hi" }), 380));
  // the clip at the top edge
  out.push(t.S(t.slab({ x: -22, y: -74, w: 40, d: 14, r: 3 }, 4, 6, 3, 0.5), { tone: "mid" }));
  out.push(t.S(t.cyl(-2, -67, 4, 10, 2, 20), { tone: "mid" }));
  return { svg: k.figureSvg({ width: W, height: H, label: "A clipboard checklist that ticks off its steps one by one, with a bookmark marking the last checkpoint.", body: out }) };
}

/* 3 · document, stamp and magnifier */
function approval() {
  const MAT = { x: -88, y: -70, w: 176, d: 140, r: 6 };
  const P = view([...k.boxCorners({ x: -98, y: -60, w: 142, d: 118, r: 0 }, 0, 4), ...k.boxCorners({ x: -2, y: -2, w: 36, d: 24, r: 0 }, 64, 64)]);
  const t = tools(P);
  const DOC = { x: -52, y: -60, w: 96, d: 118, r: 1 };
  const out = [mat(t, MAT)];
  out.push(t.S(t.slab(DOC, 0, 0.8, 2), { tone: "hi", crease: "none" }));
  out.push(rules(t, DOC.x + 8, DOC.x + DOC.w - 10, DOC.y + 10, 5, 8, 0.8));
  // the cited line, highlighted
  out.push(t.S(t.slab({ x: DOC.x + 6, y: DOC.y + 51, w: 60, d: 6, r: 1 }, 0.8, 0.2, 2), { tone: "mid", flat: true, crease: "none" }));
  out.push(t.L(t.line([DOC.x + 8, DOC.y + 54], [DOC.x + 62, DOC.y + 54], 1), { tone: "lit", free: true }));
  // signature line with an ×
  out.push(t.L(t.line([DOC.x + 10, DOC.y + 104], [DOC.x + 50, DOC.y + 104], 0.8), { tone: "mid", free: true }));
  out.push(t.L(t.line([DOC.x + 10, DOC.y + 99], [DOC.x + 14, DOC.y + 103], 0.8) + t.line([DOC.x + 14, DOC.y + 99], [DOC.x + 10, DOC.y + 103], 0.8), { tone: "mid" }));
  // the stamp mark it leaves
  const MARK = { x: -4, y: 66 - 70, w: 40, d: 20, r: 2 };
  out.push(t.show(t.L(t.outline(MARK, 0.8, 3) + t.outline(k.insetPlan(MARK, 2), 0.8, 3), { tone: "lit" }) + t.T([MARK.x + 5, MARK.y + 13], 0.8, "APPROVED", { size: 4.6, tone: "hi" }), 520));
  // the magnifier, sliding along the cited line
  const lens = t.S(t.cyl(-30, -9, 13, 0.8, 2.2, 40, 0.5), { tone: "mid" }) + t.S(t.cyl(-30, -9, 10, 3, 0.2, 40), { tone: "hi", flat: true, crease: "none" }) + t.L(t.ring(-30, -9, 10, 3.2), { tone: "lo" })
    + t.S(t.slab({ x: -48, y: -12, w: 8, d: 6, r: 2 }, 0.8, 2, 2, 0.3), { tone: "mid" }) + t.S(t.slab({ x: -72, y: -12, w: 26, d: 6, r: 2.5 }, 0.8, 3, 3, 0.4), { tone: "mid" });
  out.push(t.move([-26, 0, 0], lens, 0));
  // the rubber stamp: held up, then pressed
  const SB = { x: -2, y: -2, w: 36, d: 24, r: 2 };
  const stamp = t.S(t.slab(SB, 1, 5, 3, 0.4), { tone: "mid" }) + t.S(t.slab(k.insetPlan(SB, 4), 6, 3, 3, 0.3), { tone: "mid" })
    + t.S(t.cyl(16, 10, 3.6, 9, 14, 20), { tone: "mid" }) + t.S(t.cyl(16, 10, 9, 23, 7, 32, 0.6), { tone: "hi", lit: true }) + t.L(k.knurl(16, 10, 9, 24, 30, 30, P), { tone: "lo" });
  out.push(t.move([0, 0, 34], stamp, 260));
  return { svg: k.figureSvg({ width: W, height: H, label: "A document waiting for sign-off: a rubber stamp presses APPROVED onto it while a magnifier checks a cited line.", body: out }) };
}

/* 4 · folder: exploded documents close into one sealed packet */
function packet() {
  const MAT = { x: -88, y: -64, w: 176, d: 128, r: 6 };
  const P = view([...k.boxCorners({ x: -56, y: -53, w: 108, d: 97, r: 0 }, 0, 3), ...k.boxCorners({ x: -46, y: -42, w: 96, d: 76, r: 0 }, 80, 84)]);
  const t = tools(P);
  const F = { x: -56, y: -44, w: 108, d: 88, r: 3 };
  const out = [mat(t, MAT)];
  out.push(t.S(t.slab({ x: F.x, y: F.y - 9, w: 40, d: 12, r: 2 }, 0, 2, 2, 0.3), { tone: "mid" }));
  out.push(t.S(t.slab(F, 0, 2, 4, 0.5), { tone: "mid" }));
  const docs = [["PDF", 2], ["CSV", 2.8], ["MD", 3.6]];
  docs.forEach(([kind, z], i) => {
    const d = { x: F.x + 6 + i * 2, y: F.y + 6 - i * 2, w: 92, d: 72, r: 1 };
    const svg = sheet(t, d, z, { lines: true }) + t.S(t.slab({ x: d.x + 6, y: d.y + d.d - 16, w: 18, d: 10, r: 1.5 }, z + 0.8, 0.4, 2), { tone: "mid", crease: "none" }) + t.T([d.x + 8.5, d.y + d.d - 9], z + 1.2, kind, { size: 4, tone: "hi" });
    out.push(t.move([0, 0, 24 + i * 26], svg, 260 - i * 110));
  });
  // the seal that closes the packet
  out.push(t.show(t.S(t.cyl(28, -10, 9, 4.4, 1.4, 36, 0.5), { tone: "hi", lit: true }) + t.L(t.ring(28, -10, 6, 5.8), { tone: "lo" }) + t.D([t.at([28, -10, 5.8])], { size: 0.7, tone: "hi" }), 640));
  return { svg: k.figureSvg({ width: W, height: H, label: "A folder whose documents float apart, then settle into it and are sealed as one packet.", body: out }) };
}

const art = { width: W, height: H, cards: [inbox(), checklist(), approval(), packet()].map((c) => c.svg) };
writeFileSync(join(ROOT, "src/components/grain/caps-art.ts"), `// GENERATED by tools/caps/build.mjs (anatomy kit). Edit the build script and re-run it.\nexport const CAPS_ART = ${JSON.stringify(art)} as const;\n`);
console.log("wrote src/components/grain/caps-art.ts", (JSON.stringify(art).length / 1024).toFixed(0) + " KB");
