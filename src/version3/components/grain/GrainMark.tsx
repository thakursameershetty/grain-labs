// The v2 Grain mark: the "Block" G (src/version3/brand/marks.ts), one solid colour that follows the text.
import { MARKS } from "@/version3/brand/marks";

const BLOCK = MARKS.find((m) => m.id === "block")!;

export default function GrainMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg viewBox="-2 -2 104 104" aria-hidden="true" className={className}>
      <path d={BLOCK.d} fill="currentColor" />
    </svg>
  );
}
