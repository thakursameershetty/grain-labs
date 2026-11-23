// The nav pill's behaviour for a vertical list of links (the footer columns). One pill per list: its top and bottom
// edges run on separate springs (the edge leading the move is stiff, the trailing one soft), so it stretches like a
// drop between links and thins a little while stretched; its edges blur with speed and sharpen as it lands; at rest
// the edge nearest the cursor goes Gaussian-soft (same sharp/soft outline pair as the nav pill, via --mx/--my/--sk).
// Leaving the list dissolves it in place. The pill element uses the nav pill's look (.nav-pill), positioned here.
import { useEffect, type RefObject } from "react";

const LEAD = { k: 380, d: 26 }, TRAIL = { k: 120, d: 17 };
// how far the pill reaches past the item: room round plain text links (footer, contents). Items that draw their own
// outline (the article chips) pass 0, so the pill lands exactly on that outline instead of ringing it a second time.
const PAD = { x: 12, y: 6 };

/** `selector`: which children get the pill (links by default; the article chips are buttons) */
export default function usePillList(
  list: RefObject<HTMLElement | null>, pill: RefObject<HTMLElement | null>, selector = "a", pad: { x: number; y: number } = PAD,
) {
  const padX = pad.x, padY = pad.y;
  useEffect(() => {
    const box = list.current, p = pill.current;
    if (!box || !p) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // edges (px, in the list's box) and their velocities; x/width ease separately
    let t = 0, b = 0, vt = 0, vb = 0, tt = 0, tb = 0, l = 0, w = 0, tl = 0, tw = 0;
    let shown = 0, show = 0, placed = false, raf = 0, last = 0, restH = 0;

    const target = (a: HTMLElement) => {
      const r = box.getBoundingClientRect(), q = a.getBoundingClientRect();
      tl = q.left - r.left - padX; tw = q.width + padX * 2;
      tt = q.top - r.top - padY; tb = q.bottom - r.top + padY;
      if (!placed || reduce) { t = tt; b = tb; l = tl; w = tw; vt = vb = 0; restH = tb - tt; placed = true; }
      show = 1; kick();
    };
    const step = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 1 / 60; last = now;
      const down = tt > t, st = down ? TRAIL : LEAD, sb = down ? LEAD : TRAIL;
      vt += ((tt - t) * st.k - vt * st.d) * dt; t += vt * dt;
      vb += ((tb - b) * sb.k - vb * sb.d) * dt; b += vb * dt;
      l += (tl - l) * Math.min(1, dt * 16); w += (tw - w) * Math.min(1, dt * 16);
      shown += (show - shown) * Math.min(1, dt * (show ? 14 : 7));
      restH += (tb - tt - restH) * Math.min(1, dt * 9);
      const h = Math.max(10, b - t), stretch = Math.max(0, h / (restH || h) - 1);
      const speed = Math.abs(vt) + Math.abs(vb);
      const blur = Math.min(4.5, speed * 0.0045) + (1 - shown) * 8;
      const sx = 1 - Math.min(0.18, stretch * 0.25);
      p.style.transform = `translate3d(${l}px, ${t}px, 0) scaleX(${sx.toFixed(3)})`;
      p.style.width = `${w}px`; p.style.height = `${h}px`;
      p.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none";
      p.style.opacity = shown.toFixed(3);
      const settled = Math.abs(tt - t) < 0.2 && Math.abs(tb - b) < 0.2 && Math.abs(tl - l) < 0.2 && speed < 2 && Math.abs(show - shown) < 0.01;
      if (settled) { t = tt; b = tb; l = tl; w = tw; vt = vb = 0; shown = show; last = 0; p.style.filter = shown ? "none" : "blur(8px)"; p.style.opacity = String(shown); if (!shown) placed = false; return; }
      raf = requestAnimationFrame(step);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };

    const links = [...box.querySelectorAll<HTMLElement>(selector)];
    const enter = (e: Event) => target(e.currentTarget as HTMLElement);
    const leave = () => { show = 0; kick(); p.style.setProperty("--sk", "0"); };
    const near = (e: PointerEvent) => {
      const r = p.getBoundingClientRect();
      p.style.setProperty("--mx", `${e.clientX - r.left}px`); p.style.setProperty("--my", `${e.clientY - r.top}px`); p.style.setProperty("--sk", "1");
    };
    links.forEach((a) => { a.addEventListener("pointerenter", enter); a.addEventListener("focus", enter); a.addEventListener("blur", leave); });
    box.addEventListener("pointerleave", leave);
    box.addEventListener("pointermove", near);
    return () => {
      cancelAnimationFrame(raf);
      links.forEach((a) => { a.removeEventListener("pointerenter", enter); a.removeEventListener("focus", enter); a.removeEventListener("blur", leave); });
      box.removeEventListener("pointerleave", leave); box.removeEventListener("pointermove", near);
    };
  }, [list, pill, selector, padX, padY]);
}
