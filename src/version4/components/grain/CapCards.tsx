// Capabilities as four cards (after the "Not just control. Clarity." reference): mono caps title, a dot mark,
// one line of copy and an Antigravity-style particle field that gathers into the card's shape (ParticleShape.tsx).
// The eight capabilities group into the four things a buyer cares about; governance and improvement are the
// always-on strip underneath. Each card "plays" its moment: papers land, ticks go down, the stamp presses,
// the packet closes. They play in turn while in view; hovering a card plays it.
import { useEffect, useRef, useState } from "react";
import ParticleShape from "./ParticleShape";
import { LockIcon } from "@/version4/components/ui/lock";
import { SparklesIcon } from "@/version4/components/ui/sparkles";
import "./cap-cards.css";

const CARDS = [
  { t: "Takes in\nthe work", covers: "Intake · Routing", d: "Requests, files and rules land in one durable task, handed to the right agent with only the tools it's allowed." },
  { t: "Does\nthe work", covers: "Execution", d: "Agents work through every step with checkpoints, so a failure picks up where it stopped instead of starting over." },
  { t: "Waits\nfor you", covers: "Approvals · Inspection", d: "Consequential steps pause for a named person, and every claim points back to the source it came from." },
  { t: "Hands back\na packet", covers: "Packaging", d: "Review-ready documents with their lineage attached, ready to send or archive. Not a chat reply." },
];
// 5×5 dot marks for the card corners, one pattern per card (1 = dot)
const MARKS = [
  "0000100011001110111111111",
  "1010101010101010101010101",
  "0010001110111110111000100",
  "1111110001100011000111111",
];
const LABELS = [
  "Coloured particles gather into an envelope: the work coming in.",
  "Coloured particles gather into a checklist with three ticks: the work being done.",
  "Coloured particles gather into a circle with a check: a person approving.",
  "Coloured particles gather into a folder: the finished packet.",
];
type Anim = { startAnimation: () => void; stopAnimation: () => void };

function Mark({ bits }: { bits: string }) {
  return (
    <span className="cx-mark" aria-hidden="true">
      {bits.split("").map((b, i) => <i key={i} className={b === "1" ? "on" : ""} />)}
    </span>
  );
}

export default function CapCards() {
  const wrap = useRef<HTMLDivElement>(null);
  const [auto, setAuto] = useState(-1);         // the card the tour is playing
  const [hover, setHover] = useState<number | null>(null);
  const played = useRef<Set<number>>(new Set());
  const [, force] = useState(0);
  const lock = useRef<Anim>(null), spark = useRef<Anim>(null);

  // tour: play each card in turn while the section is in view; once played, a card stays "done"
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { CARDS.forEach((_, i) => played.current.add(i)); force((v) => v + 1); return; }
    let timer = 0, i = -1, visible = false;
    const step = () => {
      i = (i + 1) % CARDS.length;
      setAuto(i);
      played.current.add(i);
      timer = window.setTimeout(step, 2600);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && e.intersectionRatio > 0.3;
      clearTimeout(timer);
      if (visible) timer = window.setTimeout(step, 300);
    }, { threshold: [0, 0.3] });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);

  const active = hover ?? auto;
  const enter = (i: number) => { setHover(i); played.current.add(i); };

  return (
    <div className="cx" ref={wrap}>
      <div className="cx-grid">
        {CARDS.map((c, i) => {
          const on = active === i;
          return (
            <article
              key={i}
              className={`cx-card${on ? " on" : ""}${played.current.has(i) && !on ? " done" : ""}`}
              onPointerEnter={() => enter(i)}
              onPointerLeave={() => setHover(null)}
            >
              <header className="cx-head">
                <h3>{c.t}</h3>
                <Mark bits={MARKS[i]} />
              </header>
              <p className="cx-covers">{c.covers}</p>
              <p className="cx-d">{c.d}</p>
              <div className="cx-fig"><ParticleShape shape={i} gathered={on} label={LABELS[i]} /></div>
            </article>
          );
        })}
      </div>

      <div className="cx-strip">
        <div className="cx-always" onPointerEnter={() => lock.current?.startAnimation()} onPointerLeave={() => lock.current?.stopAnimation()}>
          <span className="cx-always-ico"><LockIcon ref={lock} size={18} /></span>
          <div><b>Governance, around every step</b><span>Every capability is granted, every run is evidenced, and sensitive details never reach the logs.</span></div>
        </div>
        <div className="cx-always" onPointerEnter={() => spark.current?.startAnimation()} onPointerLeave={() => spark.current?.stopAnimation()}>
          <span className="cx-always-ico"><SparklesIcon ref={spark} size={18} /></span>
          <div><b>Improvement, run after run</b><span>Corrections people make are kept and reused, so the next run needs fewer of them.</span></div>
        </div>
      </div>
    </div>
  );
}
