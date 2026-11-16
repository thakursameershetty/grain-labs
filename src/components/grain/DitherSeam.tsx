// A pixel-dither seam between two sections of different colour, instead of a hard line.
// An 8×8 ordered (Bayer) dither steps from the colour above to the colour below, the edge drifts in a
// slow wave, and a sparse scatter of ASCII characters flickers through the middle of the band.
// Colours are CSS custom properties (e.g. "--next-bg", "--paper"), so it follows the theme toggle.
import { useEffect, useRef } from "react";

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);
const GLYPHS = ".:-=+*#%@";
const CELL = 6;   // pixel size; the band's height is snapped to a whole number of these

export default function DitherSeam({ from, to, accent = "--next-muted", height = 140, keep = false }: {
  from: string; to: string; accent?: string; height?: number; keep?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, visible = false, frame = 0;
    let cA = "#0a0a0a", cB = "#ffffff", cG = "#d4d4d4";
    const t0 = performance.now();

    const readColors = () => {
      const cs = getComputedStyle(cv);
      cA = cs.getPropertyValue(from).trim() || cA;
      cB = cs.getPropertyValue(to).trim() || cB;
      cG = cs.getPropertyValue(accent).trim() || cG;
    };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const hash = (x: number, y: number) => {
      const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };

    const draw = () => {
      frame++;
      if (frame % 30 === 1) readColors();
      const t = reduce ? 0 : (performance.now() - t0) / 1000;
      const cols = Math.ceil(W / CELL), rows = Math.round(H / CELL);
      ctx.fillStyle = cB;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = cA;
      const glyphCells: [number, number, number][] = [];
      for (let i = 0; i < cols; i++) {
        // the dissolve edge drifts in a slow, layered wave
        const wave = 0.11 * Math.sin(i * 0.045 + t * 0.5) + 0.06 * Math.sin(i * 0.17 - t * 0.8);
        for (let j = 0; j < rows; j++) {
          // 0 at the top (colour A) → 1 at the bottom (colour B). The range is stretched past 0–1 by more
          // than the wave can move it, so the first and last rows always stay solid and every pixel is whole.
          const v = ((j + 0.5) / rows) * 1.5 - 0.25 + wave;
          const b = BAYER[(j & 7) * 8 + (i & 7)];
          if (v < b) ctx.fillRect(i * CELL, j * CELL, CELL, CELL);
          // sparse ASCII flecks around the middle of the band
          const mid = Math.abs(v - 0.5);
          if (mid < 0.16) {
            const h = hash(i, j + Math.floor(t * 3) * 13);
            if (h > 0.985) glyphCells.push([i, j, h]);
          }
        }
      }
      if (glyphCells.length) {
        ctx.font = `500 ${CELL * 2}px "Disket Mono", ui-monospace, monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = cG;
        for (const [i, j, h] of glyphCells) {
          ctx.globalAlpha = 0.55 + (h - 0.985) * 25;
          ctx.fillText(GLYPHS[Math.floor(h * 1000) % GLYPHS.length], i * CELL + CELL / 2, j * CELL + CELL / 2);
        }
        ctx.globalAlpha = 1;
      }
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => { resize(); if (!visible || reduce) draw(); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    io.observe(cv);
    // repaint immediately when the theme flips
    const mo = new MutationObserver(() => { readColors(); if (!visible || reduce) draw(); });
    const host = cv.closest(".grain-hero");
    if (host) mo.observe(host, { attributes: true, attributeFilter: ["data-theme"] });
    resize(); readColors(); draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); };
  }, [from, to, accent]);

  const snapped = Math.round(height / CELL) * CELL;   // whole rows of pixels, never a clipped last row
  return <canvas ref={ref} className={`dither-seam${keep ? " keep" : ""}`} style={{ height: snapped }} aria-hidden="true" />;
}
