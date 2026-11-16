// A preview of How it runs, in the corner of the open portal: a vertical scrubber of five segments. The
// active segment fills top to bottom while its step shows a one-line description; done steps stay lit.
// Runs only while the portal is open; still (all done) for reduced motion.
import { useEffect, useState } from "react";

const STEPS = [
  ["Intake", "Request, files and rules become one task"],
  ["Route", "The right agent profile picks it up"],
  ["Execute", "Steps run with checkpoints and retries"],
  ["Approve", "A person signs off what matters"],
  ["Inspect", "Evidence is checked before it ships"],
];
const STEP_MS = 1500, HOLD_MS = 1400;

export default function RunScrubber({ running }: { running: boolean }) {
  const reduce = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [k, setK] = useState(reduce ? STEPS.length : -1);   // index of the step filling; -1 = reset
  useEffect(() => {
    if (!running || reduce) return;
    const next = k < 0 ? 0 : k + 1;
    const wait = k < 0 ? 120 : k >= STEPS.length - 1 ? STEP_MS + HOLD_MS : STEP_MS;
    const id = window.setTimeout(() => setK(next > STEPS.length - 1 && k >= STEPS.length - 1 ? -1 : next), wait);
    return () => clearTimeout(id);
  }, [k, running, reduce]);
  useEffect(() => { if (!running && !reduce) setK(-1); }, [running, reduce]);

  return (
    <ol className="nr-scrub" aria-hidden="true" style={{ ["--step-ms" as string]: `${STEP_MS}ms` }}>
      {STEPS.map(([t, d], i) => {
        const state = i < k ? "done" : i === k ? "run" : "";
        return (
          <li key={t} className={state}>
            <span className="nr-seg"><i /></span>
            <span className="nr-lbl">
              <span className="nr-n">0{i + 1}</span>
              <b>{t}</b>
              <span className="nr-d">{d}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
