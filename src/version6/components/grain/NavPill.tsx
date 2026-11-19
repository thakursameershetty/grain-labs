// The nav's tabs with one travelling pill (v6).
// The pill's two edges run on separate springs: the edge leading the move is stiff and shoots ahead, the trailing
// edge is soft and catches up. So it stretches like a drop of liquid between tabs, thins a little while stretched
// (keeps its volume), then lands with a small squish. While it moves its edges go soft, a Gaussian blur that
// follows its speed, and it sharpens as it settles (the hero wireframe's idea: crisp at rest, foggy in motion).
// At rest it reacts to the pointer too: the edge nearest the cursor goes Gaussian-soft and the far side stays crisp
// (a sharp copy and a blurred copy of the outline, cross-masked round the cursor; --mx/--my/--sk, eased in CSS).
// Hover moves it; leaving the nav sends it back to the section you're reading (the `.on` tab, set by the hero's
// scroll spy); with no section it dissolves in place. Click sends it to that tab, and the scroll spy keeps it there.
import { useEffect, useRef } from "react";

type Item = { label: string; href: string };

const LEAD = { k: 380, d: 26 };   // stiff, quick edge
const TRAIL = { k: 120, d: 17 };  // soft, lagging edge

/** `active`: an href to mark as current from the start (pages without a scroll spy, like Articles) */
export default function NavPill({ items, active }: { items: Item[]; active?: string }) {
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nav = navRef.current, pill = pillRef.current;
    if (!nav || !pill) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // edges (px, relative to the nav), their velocities, and where they're headed
    let l = 0, r = 0, vl = 0, vr = 0, tl = 0, tr = 0;
    let shown = 0, show = 0;          // eased visibility
    let restW = 0;                    // the width it "should" have right now: eases from the old tab's to the new one's
    let placed = false;               // has it been anywhere yet (first appearance shouldn't travel in from 0)
    let hovering: HTMLElement | null = null;
    let raf = 0, last = 0;

    const active = () => nav.querySelector<HTMLElement>("a.on");
    const retarget = () => {
      const a = hovering ?? active();
      show = a ? 1 : 0;
      if (!a) { kick(); return; }
      tl = a.offsetLeft; tr = a.offsetLeft + a.offsetWidth;
      if (!placed || reduce) { l = tl; r = tr; vl = vr = 0; restW = tr - tl; placed = true; }
      kick();
    };

    const step = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 1 / 60;
      last = now;
      // whichever edge is moving toward the target's far side leads
      const right = tl > l;
      const sl = right ? TRAIL : LEAD, sr = right ? LEAD : TRAIL;
      vl += ((tl - l) * sl.k - vl * sl.d) * dt; l += vl * dt;
      vr += ((tr - r) * sr.k - vr * sr.d) * dt; r += vr * dt;
      shown += (show - shown) * Math.min(1, dt * (show ? 14 : 7));

      const w = Math.max(8, r - l);
      restW += (tr - tl - restW) * Math.min(1, dt * 9);
      const stretch = Math.max(0, w / (restW || w) - 1);      // 0 at rest, >0 while stretched
      const speed = Math.abs(vl) + Math.abs(vr);
      const blur = Math.min(4.5, speed * 0.0045) + (1 - shown) * 8;  // soft while moving, and while dissolving
      const sy = 1 - Math.min(0.22, stretch * 0.35) + Math.min(0.06, Math.abs(vl - vr) * 0.00004);
      pill.style.transform = `translate3d(${l}px, -50%, 0) scaleY(${sy.toFixed(3)})`;
      pill.style.width = `${w}px`;
      pill.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none";
      pill.style.opacity = shown.toFixed(3);

      const settled = Math.abs(tl - l) < 0.2 && Math.abs(tr - r) < 0.2 && speed < 2 && Math.abs(show - shown) < 0.01;
      if (settled) {
        l = tl; r = tr; vl = vr = 0; shown = show; last = 0; restW = tr - tl;
        pill.style.transform = `translate3d(${l}px, -50%, 0)`;
        pill.style.width = `${Math.max(8, r - l)}px`;
        pill.style.filter = shown ? "none" : "blur(8px)";
        pill.style.opacity = String(shown);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };

    const links = [...nav.querySelectorAll<HTMLElement>("a")];
    const enter = (e: Event) => { hovering = e.currentTarget as HTMLElement; retarget(); };
    const leave = () => { hovering = null; retarget(); };
    const click = (e: Event) => { hovering = e.currentTarget as HTMLElement; retarget(); };
    links.forEach((a) => {
      a.addEventListener("pointerenter", enter);
      a.addEventListener("focus", enter);
      a.addEventListener("blur", leave);
      a.addEventListener("click", click);
    });
    nav.addEventListener("pointerleave", leave);
    // soft edge follows the pointer (pill-local px)
    const near = (e: PointerEvent) => {
      const r = pill.getBoundingClientRect();
      pill.style.setProperty("--mx", `${e.clientX - r.left}px`);
      pill.style.setProperty("--my", `${e.clientY - r.top}px`);
      pill.style.setProperty("--sk", "1");
    };
    const far = () => pill.style.setProperty("--sk", "0");
    nav.addEventListener("pointermove", near);
    nav.addEventListener("pointerleave", far);
    // the scroll spy flips `.on`: follow it whenever the pointer isn't on the nav
    const mo = new MutationObserver(() => { if (!hovering) retarget(); });
    links.forEach((a) => mo.observe(a, { attributes: true, attributeFilter: ["class"] }));
    const ro = new ResizeObserver(() => { placed = false; retarget(); });
    ro.observe(nav);
    retarget();

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect(); ro.disconnect();
      links.forEach((a) => {
        a.removeEventListener("pointerenter", enter);
        a.removeEventListener("focus", enter);
        a.removeEventListener("blur", leave);
        a.removeEventListener("click", click);
      });
      nav.removeEventListener("pointerleave", leave);
      nav.removeEventListener("pointermove", near);
      nav.removeEventListener("pointerleave", far);
    };
  }, [items]);

  return (
    <nav className="desktop-nav" aria-label="Primary navigation" ref={navRef}>
      <span className="nav-pill" ref={pillRef} aria-hidden="true"><i className="np-sharp" /><i className="np-soft" /></span>
      {items.map((item) => <a key={item.label} href={item.href} className={active === item.href ? "on" : undefined} aria-current={active === item.href ? "page" : undefined}>{item.label}</a>)}
    </nav>
  );
}
