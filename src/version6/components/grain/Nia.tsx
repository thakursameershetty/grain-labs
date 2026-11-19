// Nia, the agent shared across Grain and Cubo (mascot files from Abhinay: assets/nia-tile-inverted-v1*.svg).
// Inline so it can react. It always breathes and blinks. Moods change its face:
//   idle  – the mascot as drawn
//   work  – eyes read side to side, a small bob
//   happy – eyes close into ^ ^ and the smile widens
//   love  – heart eyes and blush
//   wink  – one eye closes into a curve, the smile widens, a small head tilt
// Blue is Nia's own colour, used only here.
import type { CSSProperties } from "react";
import "./nia.css";

export type NiaMood = "idle" | "work" | "happy" | "love" | "wink";
type Props = { size?: number; working?: boolean; mood?: NiaMood; className?: string; title?: string; style?: CSSProperties };

const INK = "#405A96";
const heart = (cx: number, cy: number) =>
  `M${cx} ${cy + 4.2}C${cx - 6.5} ${cy - 0.4} ${cx - 5.6} ${cy - 6.6} ${cx - 2.6} ${cy - 6.6}C${cx - 1.1} ${cy - 6.6} ${cx} ${cy - 5.4} ${cx} ${cy - 4.2}` +
  `C${cx} ${cy - 5.4} ${cx + 1.1} ${cy - 6.6} ${cx + 2.6} ${cy - 6.6}C${cx + 5.6} ${cy - 6.6} ${cx + 6.5} ${cy - 0.4} ${cx} ${cy + 4.2}Z`;

export default function Nia({ size = 32, working = false, mood, className = "", title, style }: Props) {
  const m: NiaMood = mood ?? (working ? "work" : "idle");
  return (
    <svg
      viewBox="40 32 176 176"
      width={size}
      height={size}
      className={`nia m-${m}${m === "work" ? " working" : ""} ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={style}
    >
      <g className="nia-body">
        <g transform="rotate(180 128 128)">
          <rect x="72" y="58" width="132" height="132" rx="35" transform="rotate(9 138 124)" fill="#B5C5E6" />
          <rect x="49" y="78" width="142" height="132" rx="35" fill="#5874BD" />
          <path d="M72 104H168V161C168 175 157 186 143 186H97C83 186 72 175 72 161Z" fill="#E6ECF7" />
          <rect x="111" y="91" width="18" height="4" rx="2" fill="#B5C5E6" />
        </g>
        <g transform="translate(16 -35)">
          {m === "love" && (
            <g className="nia-blush" fill="#F0A0A0" opacity=".7">
              <ellipse cx="96" cy="153" rx="6" ry="3.4" />
              <ellipse cx="145" cy="153" rx="6" ry="3.4" />
            </g>
          )}
          <g className="nia-look">
            {m === "happy" ? (
              <g fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round">
                <path d="M99.5 143Q105 135 110.5 143" />
                <path d="M130.5 143Q136 135 141.5 143" />
              </g>
            ) : m === "love" ? (
              <g className="nia-hearts-eyes" fill="#E27A5F">
                <path d={heart(105, 142)} />
                <path d={heart(136, 142)} />
              </g>
            ) : m === "wink" ? (
              <g>
                <ellipse cx="105" cy="141" rx="4.2" ry="6.5" fill={INK} />
                <path className="nia-wink-eye" d="M130 140.5Q136 147 142 140.5" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
              </g>
            ) : (
              <g className="nia-eyes">
                <ellipse cx="105" cy="141" rx="4.2" ry="6.5" fill={INK} />
                <ellipse cx="136" cy="141" rx="4.2" ry="6.5" fill={INK} />
              </g>
            )}
          </g>
          {m === "happy" || m === "love" || m === "wink"
            ? <path d="M112 155Q121 168 130 155Q121 159 112 155Z" fill={INK} />
            : <path d="M114 158Q121 162 128 157Q122 169 114 158Z" fill={INK} />}
        </g>
      </g>
    </svg>
  );
}
