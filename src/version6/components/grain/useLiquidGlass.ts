// Liquid glass for the nav (v6): a full-width band across the top of the page (data-glass="band"), or a pill, after the lens in the 21st.dev Warp Carousel: what's behind the
// glass bends near the rim like a convex lens, the three colour channels bend by slightly different amounts (the
// cyan / amber fringe at the edge), and a Gaussian frost sits over it.
//
// How: each capsule gets its own SVG filter, used as `backdrop-filter: url(#…)`:
//   feImage            a displacement map computed for that capsule's exact pill shape and size (a canvas data URL):
//                      neutral in the middle, a smooth bezel of inward offsets round the rim
//   feDisplacementMap  ×3 at slightly different strengths, one per colour channel, recombined (screen)
//   feGaussianBlur     the frost
// The map is rebuilt when a capsule changes size. SVG filters in backdrop-filter only work in Chromium, so other
// browsers keep the plain frosted CSS fallback (the root only gets data-lg where this runs).
import { useEffect, type RefObject } from "react";

const NS = "http://www.w3.org/2000/svg";
const MAX_OFF = 11;        // px: strongest bend, right at the rim
const SCALE = MAX_OFF * 2; // feDisplacementMap scale (map values span ±MAX_OFF)
const FROST = 4;           // px: Gaussian frost after the bend

/** displacement map for a w×h pill (stadium): inward offsets in a bezel round the rim, neutral grey elsewhere */
function pillMap(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  const img = x.createImageData(w, h);
  const r = h / 2, bezel = Math.min(18, h * 0.42);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const qx = px + 0.5, qy = py + 0.5;
      // closest point on the pill's spine, and the outward normal from it
      const sx = Math.min(Math.max(qx, r), w - r), sy = r;
      let nx = qx - sx, ny = qy - sy;
      const d = Math.hypot(nx, ny) || 1e-6;
      nx /= d; ny /= d;
      const toEdge = r - d;                       // distance in from the rim
      let ox = 0, oy = 0;
      if (toEdge >= 0 && toEdge < bezel) {
        const t = 1 - toEdge / bezel;             // 1 at the rim → 0 at the bezel's inner edge
        const m = MAX_OFF * t * t * (3 - 2 * t);  // smooth, strongest at the rim
        ox = -nx * m; oy = -ny * m;               // sample inward: the rim magnifies, like a convex lens
      }
      const o = (py * w + px) * 4;
      img.data[o] = Math.round(255 * (0.5 + ox / SCALE));
      img.data[o + 1] = Math.round(255 * (0.5 + oy / SCALE));
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL();
}

/** displacement map for a full-width band (data-glass="band"): a smooth lens wave, zero at the top and the bottom and
    strongest about two-thirds down, so the bent page meets the unbent page below it with no seam (no hard rim) */
function bandMap(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  const img = x.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    const t = (py + 0.5) / h;
    const bump = Math.sin(Math.PI * Math.pow(t, 1.6)) ** 2;   // peaks near t ≈ 0.65, 0 at both ends
    const oy = -MAX_OFF * 1.7 * bump;                          // sample upward: content swells through the lens
    const g = Math.round(255 * (0.5 + oy / (SCALE * 1.7)));
    for (let px = 0; px < w; px++) {
      const o = (py * w + px) * 4;
      img.data[o] = 128; img.data[o + 1] = g; img.data[o + 2] = 128; img.data[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL();
}

const el = (tag: string, attrs: Record<string, string | number>) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

export default function useLiquidGlass(root: RefObject<HTMLElement | null>, selector: string) {
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const ua = navigator.userAgent;
    // Chromium only (Safari's UA has no "Chrome/"; Firefox has its own token)
    if (!/Chrome\/|Chromium\//.test(ua) || /Firefox\//.test(ua)) return;

    const svg = el("svg", { width: 0, height: 0, "aria-hidden": "true" }) as SVGSVGElement;
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    const defs = el("defs", {});
    svg.appendChild(defs);
    document.body.appendChild(svg);
    host.dataset.lg = "on";   // an attribute: React re-renders rewrite className and would drop a class

    const uid = Math.random().toString(36).slice(2, 7);
    const targets = [...host.querySelectorAll<HTMLElement>(selector)];
    const sizes = new Map<HTMLElement, string>();

    const build = (t: HTMLElement, i: number) => {
      const w = Math.round(t.offsetWidth), h = Math.round(t.offsetHeight);
      if (w < 4 || h < 4 || sizes.get(t) === `${w}x${h}`) return;
      sizes.set(t, `${w}x${h}`);
      const id = `lg-${uid}-${i}`;
      defs.querySelector(`#${id}`)?.remove();
      const f = el("filter", { id, x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" });
      const band = t.dataset.glass === "band";
      f.appendChild(el("feImage", { href: band ? bandMap(w, h) : pillMap(w, h), x: 0, y: 0, width: w, height: h, result: "map", preserveAspectRatio: "none" }));
      // one bend per channel, a little stronger each time: red least, blue most
      // (the wide band fringes less than a pill)
      [["R", 1], ["G", 1.12], ["B", 1.24]].forEach(([ch, k], j) => {
        const spread = band ? 1 + ((k as number) - 1) * 0.8 : (k as number);
        f.appendChild(el("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale: SCALE * (band ? 1.7 : 1) * spread, xChannelSelector: "R", yChannelSelector: "G", result: `d${ch}` }));
        const m = ["0 0 0 0 0", "0 0 0 0 0", "0 0 0 0 0", "0 0 0 1 0"];
        m[j] = ["1 0 0 0 0", "0 1 0 0 0", "0 0 1 0 0"][j];
        f.appendChild(el("feColorMatrix", { in: `d${ch}`, type: "matrix", values: m.join("  "), result: `c${ch}` }));
      });
      f.appendChild(el("feBlend", { in: "cR", in2: "cG", mode: "screen", result: "rg" }));
      f.appendChild(el("feBlend", { in: "rg", in2: "cB", mode: "screen", result: "rgb" }));
      f.appendChild(el("feGaussianBlur", { in: "rgb", stdDeviation: FROST }));
      defs.appendChild(f);
      t.style.setProperty("--lg-filter", `url(#${id})`);
    };

    targets.forEach(build);
    const ro = new ResizeObserver(() => targets.forEach(build));
    targets.forEach((t) => ro.observe(t));

    return () => {
      ro.disconnect();
      delete host.dataset.lg;
      targets.forEach((t) => t.style.removeProperty("--lg-filter"));
      svg.remove();
    };
  }, [root, selector]);
}
