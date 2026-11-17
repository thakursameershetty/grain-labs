// Capabilities as one machine: an exploded "operations stack" drawn with the anatomy kit
// (static art pre-rendered by tools/stack/build.mjs into stack-art.ts).
//   Six plates = the steps of a run (Intake → Packaging), bottom to top.
//   The posts and rails that cage them = Governance (always on, around everything).
//   The shuttle on the right post = Improvement (corrections travel from the top back to the base).
// The stack opens as it scrolls into view; hovering a label lifts the plates above that layer to reveal it.
import { useEffect, useRef, useState } from "react";
import { STACK } from "./stack-art";
import "./iso-kit.css";
import "./cap-stack.css";

type Cap = { t: string; line: string; e: string };
const LAYERS: Cap[] = [
  { t: "Work intake", line: "The request, its files and its rules land in one durable task.", e: "An RFP arrives with 48 pages and a rule that pricing needs sign-off." },
  { t: "Agent routing", line: "A versioned profile picks the agent, its skills and the tools it may use.", e: "The RFP agent can read the CRM and write documents, but never send email." },
  { t: "Execution", line: "Agents do the work with checkpoints, retries and recovery.", e: "A CRM timeout resumes from the last checkpoint, not from zero." },
  { t: "Approvals", line: "Consequential steps wait for a named person.", e: "The pricing section waits for its approver. Nothing ships until then." },
  { t: "Inspection", line: "See what happened in a run before you trust the result.", e: "Open the evidence on any deliverable and walk the run back to intake." },
  { t: "Packaging", line: "A review-ready packet with lineage, not a chat reply.", e: "Response, approved pricing and the decision record, in one packet." },
];
const GOV: Cap = { t: "Governance", line: "The frame around every step: granted permissions, audit logs, sensitive data kept out of them.", e: "A benefits case runs end to end with no member details in any log line." };
const IMP: Cap = { t: "Improvement", line: "Corrections travel back to the start, so the next run is better.", e: "Approved wording from May is reused in July, with attribution." };

const PAD = 300;                                  // room either side of the drawing for labels
const VBW = STACK.width + PAD * 2, VBH = STACK.height;
const SIDE = (i: number) => (i % 2 === 0 ? "left" : "right");
const ease = (a: number, b: number, dt: number, s: number) => a + (b - a) * (1 - Math.exp(-dt / s));

export default function CapStack() {
  const stage = useRef<HTMLDivElement>(null);
  const layerEls = useRef<(SVGGElement | null)[]>([]);
  const shuttleEl = useRef<SVGGElement>(null);
  const leadEls = useRef<(SVGPathElement | null)[]>([]);
  const dotEls = useRef<(SVGCircleElement | null)[]>([]);
  const labelEls = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  activeRef.current = active;

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0, visible = false, t = 0;
    let share = reduce ? 1 : 0, target = 0;
    const open = LAYERS.map(() => 0);
    const [ux, uy] = STACK.up;

    const draw = () => {
      const h = activeRef.current;
      LAYERS.forEach((_, i) => {
        const dz = share * STACK.lift * i + open[i];
        const dx = ux * dz, dy = uy * dz;
        layerEls.current[i]?.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
        // leader: from the plate's outer corner to its label
        const side = SIDE(i);
        const [ax, ay] = STACK.anchors[i][side];
        const px = ax + PAD + dx, py = ay + dy;
        const lx = side === "left" ? PAD - 30 : PAD + STACK.width + 30;
        const ly = py;
        leadEls.current[i]?.setAttribute("d", `M ${px.toFixed(1)} ${py.toFixed(1)} L ${lx} ${ly.toFixed(1)}`);
        dotEls.current[i]?.setAttribute("cx", px.toFixed(1));
        dotEls.current[i]?.setAttribute("cy", py.toFixed(1));
        const lab = labelEls.current[i];
        if (lab) lab.style.top = `${(ly / VBH) * 100}%`;
        void h;
      });
      // improvement shuttle: down from the top layer to the base, then back up empty
      const [lo, hiRest] = [STACK.shuttleTravel[0], STACK.shuttleTravel[1]];
      const hi = hiRest + (STACK.shuttleTravelApart[1] - hiRest) * share;
      const cyc = (t % 6) / 6;
      const k = cyc < 0.62 ? 1 - smooth(cyc / 0.62) : smooth((cyc - 0.62) / 0.38);
      const z = lo + (hi - lo) * k;
      shuttleEl.current?.setAttribute("transform", `translate(${(ux * z).toFixed(2)} ${(uy * z).toFixed(2)})`);
      el.style.setProperty("--carry", cyc < 0.62 ? "1" : "0");
    };
    const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      if (!reduce) t += dt;
      share = reduce ? target : ease(share, target, dt, 0.45);
      const h = activeRef.current;
      LAYERS.forEach((_, i) => {
        const want = h === null ? 0 : i > h ? STACK.open : i === h ? 10 : 0;
        open[i] = reduce ? want : ease(open[i], want, dt, 0.22);
      });
      draw();
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (e.intersectionRatio > 0.35) target = 1;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    }, { threshold: [0, 0.35, 0.6] });
    io.observe(el);
    draw();
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const pct = (x: number) => `${(x / VBW) * 100}%`;
  const label = (c: Cap, i: number | "gov" | "imp", style: React.CSSProperties, side: "left" | "right") => {
    const on = typeof i === "number" && active === i;
    return (
      <div
        key={c.t}
        ref={typeof i === "number" ? (el) => { labelEls.current[i] = el; } : undefined}
        className={`stk-label ${side}${on ? " on" : ""}${typeof i !== "number" ? ` ${i}` : ""}`}
        style={style}
        tabIndex={typeof i === "number" ? 0 : -1}
        onPointerEnter={() => typeof i === "number" && setActive(i)}
        onFocus={() => typeof i === "number" && setActive(i)}
      >
        <span className="stk-n">{typeof i === "number" ? `0${i + 1}` : i === "gov" ? "▢" : "↺"}</span>
        <b>{c.t}</b>
        <span className="stk-line">{c.line}</span>
        <span className="stk-ex">{c.e}</span>
      </div>
    );
  };

  return (
    <div className="stk iso" ref={stage} onPointerLeave={() => setActive(null)}>
      <div className="stk-stage" style={{ aspectRatio: `${VBW} / ${VBH}` }}>
        <svg className="iso-svg stk-art" viewBox={`${-PAD} 0 ${VBW} ${VBH}`} role="img"
          aria-label="Grain as one machine: six plates for intake, routing, execution, approvals, inspection and packaging, held in a governance frame, with a shuttle that carries improvements from the top back to the base.">
          <g dangerouslySetInnerHTML={{ __html: STACK.base }} />
          {STACK.layers.map((svg, i) => (
            <g key={i} ref={(el) => { layerEls.current[i] = el; }} className={`stk-layer${active === i ? " on" : ""}`}
              dangerouslySetInnerHTML={{ __html: svg }} />
          ))}
          <g ref={shuttleEl} className="stk-shuttle" dangerouslySetInnerHTML={{ __html: STACK.shuttle }} />
        </svg>
        <svg className="stk-leads" viewBox={`0 0 ${VBW} ${VBH}`} aria-hidden="true">
          {LAYERS.map((_, i) => (
            <g key={i} className={active === i ? "on" : ""}>
              <path ref={(el) => { leadEls.current[i] = el; }} />
              <circle ref={(el) => { dotEls.current[i] = el; }} r="3.2" />
            </g>
          ))}
        </svg>
        {LAYERS.map((c, i) => label(c, i, { [SIDE(i)]: 0, width: pct(PAD - 46) } as React.CSSProperties, SIDE(i)))}
        {label(GOV, "gov", { left: 0, top: "6%", width: pct(PAD - 46) }, "left")}
        {label(IMP, "imp", { right: 0, top: "84%", width: pct(PAD - 46) }, "right")}
      </div>
      <p className="stk-hint">Hover a layer to open the stack at that step.</p>
    </div>
  );
}
