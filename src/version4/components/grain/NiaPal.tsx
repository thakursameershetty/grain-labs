// Nia who reacts: wrap any Nia that people can see up close.
//   hover → heart eyes and blush, a few hearts float up
//   click → a spin, ^ ^ happy face and a burst of the logo's square dots
// `mood` is what Nia is doing otherwise (work while a node runs, happy when it finishes, …).
// Optional `celebrate`: change its value to make Nia happy for a moment (e.g. when a page comes forward).
import { useEffect, useRef, useState, type MouseEvent } from "react";
import Nia, { type NiaMood } from "./Nia";

const LOGO = ["#C85636", "#E27A5F", "#F0BFA7"];
type Bit = { id: number; kind: "heart" | "dot"; dx: number; dy: number; c: string; s: number };

type Props = { size?: number; mood?: NiaMood; celebrate?: unknown; className?: string; label?: string };

export default function NiaPal({ size = 32, mood = "idle", celebrate, className = "", label = "Nia, Grain's agent" }: Props) {
  const [react, setReact] = useState<NiaMood | null>(null);
  const [spin, setSpin] = useState(0);
  const [bits, setBits] = useState<Bit[]>([]);
  const id = useRef(0);
  const timer = useRef(0);
  const lastLove = useRef(0);

  const moodFor = (m: NiaMood, ms: number) => {
    setReact(m);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setReact(null), ms);
  };
  const burst = (kind: "heart" | "dot", n: number) => {
    const r0 = Math.max(18, size * 0.7);
    const add = Array.from({ length: n }, (_, k): Bit => {
      const a = kind === "heart" ? -Math.PI / 2 + (k - (n - 1) / 2) * 0.5 : (k / n) * Math.PI * 2;
      const r = r0 + Math.random() * r0 * 0.4;
      return { id: ++id.current, kind, dx: Math.cos(a) * r, dy: Math.sin(a) * r - (kind === "heart" ? r0 * 0.3 : 0), c: LOGO[k % 3],
        s: kind === "heart" ? Math.max(9, size * 0.22) + Math.random() * 4 : Math.max(4, size * 0.09) + Math.random() * 3 };
    });
    setBits((b) => [...b, ...add]);
    const ids = new Set(add.map((x) => x.id));
    window.setTimeout(() => setBits((b) => b.filter((x) => !ids.has(x.id))), 1300);
  };

  // a moment of joy whenever `celebrate` changes (not on first render)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    moodFor("happy", 1300);
  }, [celebrate]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onEnter = () => {
    if (performance.now() - lastLove.current < 1100) return;
    lastLove.current = performance.now();
    moodFor("love", 1400);
    burst("heart", 3);
  };
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    setSpin((s) => s + 1);
    moodFor("happy", 1200);
    burst("dot", 9);
  };

  return (
    <span className={`nia-pal ${className}`} role="button" tabIndex={0} aria-label={label}
      onPointerEnter={onEnter} onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e as unknown as MouseEvent); } }}>
      <span className={`nia-pal-spin${spin ? " go" : ""}`} key={spin}>
        <Nia size={size} mood={react ?? mood} />
      </span>
      {bits.map((b) => (
        <i key={b.id} className={`np-bit ${b.kind}`} aria-hidden="true"
          style={{ ["--dx" as string]: `${b.dx}px`, ["--dy" as string]: `${b.dy}px`, ["--c" as string]: b.c, ["--s" as string]: `${b.s}px` }} />
      ))}
    </span>
  );
}
