// The fog spot (the Gemini-like hover): a crisp layer and a Gaussian-soft copy cross-masked round the pointer, so
// whatever sits under the cursor goes foggy and the rest stays sharp. This hook only moves the spot: it eases
// --mx/--my after the pointer and springs --sk (0 → 1) in on enter and out on leave, writing the vars once a frame
// on the host, and stops when settled. (CSS transitions on the vars restarted on every pointermove and stuttered.)
// Spread the returned handlers on the host; its CSS draws the two layers from the vars.
import { useEffect, useRef, type PointerEvent } from "react";

export default function useFogSpot<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const st = useRef({ x: 0, y: 0, tx: 0, ty: 0, k: 0, tk: 0, vk: 0, raf: 0, live: false });
  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  const tick = () => {
    const s = st.current, el = ref.current;
    if (!el) { s.raf = 0; return; }
    s.x += (s.tx - s.x) * 0.2; s.y += (s.ty - s.y) * 0.2;
    s.vk = (s.vk + (s.tk - s.k) * 0.08) * 0.78; s.k += s.vk;
    el.style.setProperty("--mx", `${s.x.toFixed(1)}px`); el.style.setProperty("--my", `${s.y.toFixed(1)}px`);
    el.style.setProperty("--sk", Math.max(0, s.k).toFixed(3));
    const settled = Math.abs(s.tx - s.x) < 0.2 && Math.abs(s.ty - s.y) < 0.2 && Math.abs(s.tk - s.k) < 0.002 && Math.abs(s.vk) < 0.002;
    s.raf = settled ? 0 : requestAnimationFrame(tick);
  };
  const kick = () => { if (!st.current.raf) st.current.raf = requestAnimationFrame(tick); };

  const onPointerMove = (e: PointerEvent<T>) => {
    if (e.pointerType === "touch") return;
    const s = st.current, r = e.currentTarget.getBoundingClientRect();
    s.tx = e.clientX - r.left; s.ty = e.clientY - r.top;
    if (!s.live) { s.x = s.tx; s.y = s.ty; s.live = true; } // the spot starts where the pointer came in
    s.tk = 1; kick();
  };
  const onPointerLeave = () => { st.current.tk = 0; st.current.live = false; kick(); };
  return { ref, onPointerMove, onPointerLeave };
}
