// The Grain mark (2D). With `draw`, it builds itself: the core lands, then each ring winds round from its
// opening, inner to outer, and its dot drops into the gap to close it. With `pulse`, the dots then send a
// small signal outward every few seconds (centre → outer), like work moving out to done.
import { CORE, RINGS } from "@/version4/brand/grainMark";
import "./grain-mark.css";

type Props = { className?: string; draw?: boolean; pulse?: boolean; title?: string; /** one colour: currentColor */ mono?: boolean };

export default function GrainMark({ className = "logo-mark", draw = false, pulse = false, title, mono = false }: Props) {
  const col = (c: string) => (mono ? "currentColor" : c);
  // inner ring first: index 0 = innermost
  const inner = [...RINGS].reverse();
  return (
    <svg
      viewBox="0 0 320 320"
      className={`gmark${draw ? " gm-draw" : ""}${pulse ? " gm-pulse" : ""} ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect className="gm-core gm-dot" x={CORE.x} y={CORE.y} width={CORE.s} height={CORE.s} rx={CORE.r} fill={col(CORE.color)} style={{ "--i": 0 } as React.CSSProperties} />
      {inner.map((ring, i) => (
        <g key={ring.color} style={{ "--i": i + 1 } as React.CSSProperties}>
          <path
            className="gm-ring"
            d={ring.stroke.d}
            fill="none"
            stroke={col(ring.color)}
            strokeWidth={ring.stroke.width}
            strokeLinejoin={ring.stroke.join}
            strokeLinecap="butt"
            pathLength={1}
          />
          <path className="gm-fillet" d={ring.fillets} fill={col(ring.color)} />
          <rect className="gm-dot" x={ring.dot.x} y={ring.dot.y} width={ring.dot.s} height={ring.dot.s} rx={ring.dot.r} fill={col(ring.dot.color)} />
        </g>
      ))}
    </svg>
  );
}
