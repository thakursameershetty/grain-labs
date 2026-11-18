// A Siri-style orb: a deep indigo sphere with translucent cyan, magenta, violet and teal petals that
// rotate through each other and add up (screen blending) into a white-hot core. Pure CSS.
import type { ReactNode } from "react";
import "./siri-orb.css";

export default function SiriOrb({ size, children, className = "" }: { size: number | string; children?: ReactNode; className?: string }) {
  const s = typeof size === "number" ? `${size}px` : size;
  return (
    <span className={`siri ${className}`} style={{ ["--s" as string]: s }} aria-hidden={children ? undefined : true}>
      <i className="p p1" /><i className="p p2" /><i className="p p3" /><i className="p p4" />
      <i className="core" />
      {children && <span className="siri-in">{children}</span>}
    </span>
  );
}
