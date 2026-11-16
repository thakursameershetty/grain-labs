// The Grain mark, in the Siri family: the stroke runs cyan → violet → raspberry along its path.
// Deeper tones on white, brighter on black (set by --lg-a/b/c in grain-hero.css).
import { useId } from "react";

export default function GrainMark({ className = "logo-mark" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`gm-${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--lg-a)" />
          <stop offset=".55" stopColor="var(--lg-b)" />
          <stop offset="1" stopColor="var(--lg-c)" />
        </linearGradient>
      </defs>
      <path d="M3 21V3h18v18H9V9h6v6" fill="none" stroke={`url(#gm-${id})`} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
