// A living ASCII field (canvas 2D) for the closing CTA: characters drift in a slow noise field,
// brighten around the cursor, and a click sends a ripple. Fades out toward the centre so text stays readable.
import { useEffect, useRef } from "react";

const RAMP = " .:-=+*#%@";

// calm: where the text sits (0–1 of the canvas); the field quietens around it. Default: the centre.
export default function AsciiField({ className = "", calm = [0.5, 0.5] }: { className?: string; calm?: [number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, visible = false, frame = 0;
    let color = "#d4d4d4";
    const CELL = 16;
    const mouse = { x: -9999, y: -9999, on: 0, target: 0 };
    const ripples: { x: number; y: number; t: number }[] = [];
    const t0 = performance.now();

    const readColor = () => {
      const c = getComputedStyle(cv).getPropertyValue("--next-muted").trim();
      if (c) color = c;
    };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      frame++;
      if (frame % 60 === 1) readColor();
      const t = reduce ? 0 : (performance.now() - t0) / 1000;
      mouse.on += (mouse.target - mouse.on) * 0.08;
      ctx.clearRect(0, 0, W, H);
      ctx.font = `500 ${CELL * 0.72}px "Disket Mono", ui-monospace, monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * CELL + CELL / 2, y = j * CELL + CELL / 2;
          // slow interfering waves = cheap "noise"
          let v = 0.5 + 0.25 * Math.sin(i * 0.21 + t * 0.6) * Math.cos(j * 0.27 - t * 0.45)
                      + 0.2 * Math.sin((i + j) * 0.13 + t * 0.35);
          // cursor glow
          const dm = Math.hypot(x - mouse.x, y - mouse.y);
          v += Math.max(0, 1 - dm / 180) * 0.9 * mouse.on;
          // click ripples
          for (const rp of ripples) {
            const age = t - rp.t, rr = age * 420;
            const d = Math.hypot(x - rp.x, y - rp.y);
            v += Math.exp(-((d - rr) ** 2) / 900) * Math.max(0, 1 - age / 1.6) * 1.2;
          }
          // keep the centre (where the text is) calm
          const cx = (x / W - calm[0]) * 1.7, cy = (y / H - calm[1]) * 2.2;
          const edge = Math.min(1, Math.max(0.12, Math.hypot(cx, cy)));
          v = v * edge;
          if (v < 0.32) continue;
          const k = Math.min(RAMP.length - 1, Math.floor((v - 0.32) * 9));
          if (k <= 0) continue;
          ctx.globalAlpha = Math.min(0.75, 0.12 + (v - 0.32) * 0.6);
          ctx.fillText(RAMP[k], x, y);
        }
      }
      ctx.globalAlpha = 1;
      while (ripples.length && t - ripples[0].t > 1.6) ripples.shift();
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    };

    const host = cv.parentElement!;
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.target = 1;
    };
    const onLeave = () => { mouse.target = 0; };
    const onDown = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: (performance.now() - t0) / 1000 });
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);
    const ro = new ResizeObserver(() => { resize(); if (!visible || reduce) draw(); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    io.observe(cv);
    resize(); readColor(); draw();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
    };
  }, [calm[0], calm[1]]);   // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
