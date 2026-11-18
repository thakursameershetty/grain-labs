// The opening moment: the Grain mark builds itself in the middle of a blank page (core, rings winding round,
// dots dropping into their gaps), then flies up into the nav's logo spot while the page fades in under it.
// onReveal fires as the flight starts (the hero's entrance plays under it); onDone when it has landed.
import { useEffect, useRef } from "react";
import GrainMark from "./GrainMark";

const BUILD_MS = 1500;
const FLY_MS = 760;

export default function Loader({ target, onReveal, onDone }: { target: () => Element | null; onReveal: () => void; onDone: () => void }) {
  const veil = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const anims: Animation[] = [];
    const t = window.setTimeout(() => {
      if (cancelled) return;
      onReveal();
      const m = mark.current, v = veil.current, dest = target();
      if (!m || !v) { onDone(); return; }
      const ease = "cubic-bezier(.7, 0, .2, 1)";
      anims.push(v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLY_MS * 0.8, easing: "ease", fill: "forwards", delay: FLY_MS * 0.15 }));
      if (dest) {
        const a = m.getBoundingClientRect(), b = dest.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
        anims.push(m.animate(
          [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${b.width / a.width})` }],
          { duration: FLY_MS, easing: ease, fill: "forwards" },
        ));
      } else {
        anims.push(m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLY_MS, fill: "forwards" }));
      }
      Promise.all(anims.map((x) => x.finished)).then(() => { if (!cancelled) onDone(); }, () => {});
    }, BUILD_MS);
    return () => { cancelled = true; clearTimeout(t); anims.forEach((x) => x.cancel()); };
    // runs once: the callbacks come from the parent's first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="gl-loader" aria-hidden="true">
      <div className="gl-veil" ref={veil} />
      <div className="gl-mark" ref={mark}>
        <GrainMark draw className="gl-svg" />
      </div>
    </div>
  );
}
