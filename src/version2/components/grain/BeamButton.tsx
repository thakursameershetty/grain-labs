// A call-to-action with a light beam riding its border (border-beam, MIT). Calm at rest, brighter on hover;
// the arrow plays on hover too. Ocean palette (violet/indigo) to sit with the Siri colours. Still for reduced motion.
import { useRef, useState } from "react";
import { BorderBeam } from "border-beam";
import { ArrowUpRightIcon } from "@/version2/components/ui/arrow-up-right";
import "./beam-button.css";

type Anim = { startAnimation: () => void; stopAnimation: () => void };
const reduce = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function BeamButton({
  href = "#", children, className = "", theme = "light", size = "md", rest = 0.8, arrowSize = 16, submit = false, disabled = false,
}: {
  href?: string; submit?: boolean; disabled?: boolean; children: React.ReactNode; className?: string;
  /** the site theme; the beam uses the opposite palette because it rides the button's own edge (black button on light, white on dark) */
  theme?: "light" | "dark";
  size?: "md" | "sm"; rest?: number; arrowSize?: number;
}) {
  const [hot, setHot] = useState(false);
  const arrow = useRef<Anim>(null);
  return (
    <BorderBeam
      className="beam-wrap" size={size} colorVariant="ocean" theme={theme === "light" ? "dark" : "light"}
      strength={hot ? 1 : Math.min(1, rest + 0.15)} brightness={hot ? 2.2 : 1.9} glowSize={hot ? 1.5 : 1.3} saturation={1.35}
      active={!reduce} duration={size === "sm" ? 2.6 : 2.2}
      onMouseEnter={() => { setHot(true); arrow.current?.startAnimation(); }}
      onMouseLeave={() => { setHot(false); arrow.current?.stopAnimation(); }}
    >
      {submit ? (
        <button type="submit" className={`beam-btn ${className}`} disabled={disabled}>
          {children} <ArrowUpRightIcon ref={arrow} size={arrowSize} />
        </button>
      ) : (
        <a className={`beam-btn ${className}`} href={href}>
          {children} <ArrowUpRightIcon ref={arrow} size={arrowSize} />
        </a>
      )}
    </BorderBeam>
  );
}
