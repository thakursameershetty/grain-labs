// Article covers (v6, redesigned to the site's language): a pastel smoke field (like the footer) and a motif drawn
// in hairlines (like the hero's wireframe mark): packet stack, approval gate, the mark's rings, Nia, sources
// converging, a cited document, a workflow with swappable models. The motif is drawn twice, crisp and Gaussian-soft,
// cross-masked round the cursor, so over a cover the lines go foggy where the pointer is and stay sharp elsewhere
// (the hero / nav-pill idea). Colours come from the page tokens, so covers follow the palette and theme.
import type { Cover } from "./data";
import { RINGS, CORE } from "@/version6/brand/grainMark";
import Nia from "@/version6/components/grain/Nia";
import useFogSpot from "@/version6/components/grain/useFogSpot";

const TINT: Record<Cover, string> = {
  packet: "var(--o1)", gate: "var(--o2)", rings: "#E27A5F", nia: "#8FA4D8", route: "var(--in)", docs: "var(--o3)", models: "var(--o3)",
};

const S = { fill: "none", stroke: "var(--tint-line)", strokeWidth: 1.3, vectorEffect: "non-scaling-stroke" as const, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const ink = { ...S, stroke: "var(--ink-line)" };
const bar = (x: number, y: number, w: number) => <line x1={x} y1={y} x2={x + w} y2={y} {...ink} />;

function Motif({ kind }: { kind: Cover }) {
  switch (kind) {
    case "packet":
      return (
        <g className="m-float">
          {[2, 1, 0].map((k) => (
            <g key={k} transform={`translate(${130 + k * 18} ${66 + k * 16}) rotate(${(k - 1) * 3} 70 80)`}>
              <rect width="140" height="170" rx="12" {...(k === 0 ? S : ink)} fill="var(--sheet)" />
              {k === 0 && <>{bar(18, 30, 70)}{bar(18, 52, 100)}{bar(18, 66, 88)}{bar(18, 80, 96)}{bar(18, 106, 60)}<rect x="18" y="130" width="54" height="18" rx="9" {...S} /></>}
            </g>
          ))}
        </g>
      );
    case "gate":
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => <circle key={i} className="m-flow" style={{ animationDelay: `${i * 0.35}s` }} cx={60 + i * 34} cy={150} r="7" {...S} />)}
          <line x1="239" y1="98" x2="239" y2="202" {...S} strokeWidth={2.4} />
          <circle cx="300" cy="150" r="27" {...S} />
          <path d="M288 150l8 8 16-17" {...S} strokeWidth={2} />
        </g>
      );
    case "rings":
      return (
        <g transform="translate(120 70) scale(.5)">
          <g className="m-float">
            {RINGS.map((r) => <path key={r.color} d={r.stroke.d} {...S} />)}
            {RINGS.map((r) => <rect key={r.color + "d"} x={r.dot.x} y={r.dot.y} width={r.dot.s} height={r.dot.s} rx="3" {...S} />)}
            <rect x={CORE.x} y={CORE.y} width={CORE.s} height={CORE.s} rx="4" {...S} />
          </g>
        </g>
      );
    case "nia":
      return (
        <g>
          <g transform="translate(70 190) rotate(-8)"><rect width="86" height="58" rx="8" {...ink} fill="var(--sheet)" />{bar(12, 18, 50)}{bar(12, 32, 36)}</g>
          <g transform="translate(250 60) rotate(6)"><rect width="86" height="58" rx="8" {...ink} fill="var(--sheet)" />{bar(12, 18, 56)}{bar(12, 32, 40)}</g>
          <foreignObject x="135" y="70" width="130" height="130"><div className="m-float" style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><Nia size={112} /></div></foreignObject>
        </g>
      );
    case "route":
      return (
        <g>
          {[60, 100, 140, 180, 220].map((y, i) => (
            <g key={y}>
              <path d={`M84 ${y} C 190 ${y}, 200 150, 300 150`} {...S} />
              <rect x="44" y={y - 12} width="40" height="24" rx="7" {...ink} fill="var(--sheet)" />
              <circle className="m-flow" style={{ animationDelay: `${i * 0.3}s` }} cx="84" cy={y} r="3.5" fill="var(--tint-line)" />
            </g>
          ))}
          <rect x="300" y="122" width="56" height="56" rx="16" {...S} fill="var(--sheet)" />
        </g>
      );
    case "docs":
      return (
        <g className="m-float">
          <rect x="110" y="50" width="180" height="210" rx="14" {...ink} fill="var(--sheet)" />
          {bar(132, 82, 90)}{bar(132, 110, 112)}{bar(132, 126, 92)}
          <rect x="232" y="119" width="40" height="14" rx="7" {...S} />
          {bar(132, 152, 128)}{bar(132, 168, 60)}
          <rect x="200" y="161" width="40" height="14" rx="7" {...S} />
          {bar(132, 194, 120)}{bar(132, 210, 96)}
        </g>
      );
    case "models":
      return (
        <g>
          <line x1="60" y1="150" x2="340" y2="150" {...ink} strokeDasharray="3 6" />
          {[100, 200, 300].map((x, i) => (
            <g key={x} className={i === 1 ? "m-float" : undefined}>
              <rect x={x - 34} y="118" width="68" height="64" rx="14" {...(i === 1 ? S : ink)} fill="var(--sheet)" />
              <rect x={x - 22} y="132" width="44" height="12" rx="6" {...S} />
              {bar(x - 22, 160, 34)}
            </g>
          ))}
        </g>
      );
  }
}

export default function ArticleCover({ kind, className = "" }: { kind: Cover; className?: string }) {
  const fog = useFogSpot<HTMLDivElement>(); // the pointer's spot: the soft layer shows there, the crisp one elsewhere
  return (
    <div {...fog} className={`acv ${className}`} style={{ "--tint": TINT[kind] } as React.CSSProperties} aria-hidden="true">
      <svg className="acv-sharp" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet"><Motif kind={kind} /></svg>
      <svg className="acv-soft" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet"><Motif kind={kind} /></svg>
    </div>
  );
}
