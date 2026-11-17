// /version2/g-lab: compare the simple-G candidates before one goes into the v2 hero.
// Top: the selected mark as the hero object, in front of the Audiowide wordmark (Matter-style layout).
// Below: every mark flat, in the nav lockup, and at favicon size, on light and dark.
import { useState } from "react";
import { MARKS, type Mark } from "./marks";
import MarkObject from "./MarkObject";
import "./glab.css";

function Flat({ mark, size, className = "" }: { mark: Mark; size: number; className?: string }) {
  return (
    <svg viewBox="-4 -4 108 108" width={size} height={size} className={className} aria-hidden="true">
      <path d={mark.d} fill="currentColor" />
      {mark.accent && <path d={mark.accent} className="gl-accent" />}
    </svg>
  );
}

export default function GLab() {
  const [pick, setPick] = useState(MARKS[0].id);
  const mark = MARKS.find((m) => m.id === pick)!;

  return (
    <div className="glab">
      <section className="gl-stage">
        <header className="gl-nav">
          <span className="gl-brand"><Flat mark={mark} size={22} />Grain</span>
          <span className="gl-tag">G lab · v2</span>
        </header>
        <div className="gl-head">
          <h1>AI operations your team can trust to run.</h1>
          <p>Grain turns a request, its files and its rules into a tracked workflow. Agents do the work. Your people approve what matters.</p>
        </div>
        <div className="gl-word" aria-hidden="true">GRAIN</div>
        <MarkObject mark={mark} />
        <p className="gl-hint">Move the cursor · drag to spin</p>
      </section>

      <section className="gl-grid" aria-label="Candidate marks">
        {MARKS.map((m, i) => (
          <button key={m.id} type="button" className={`gl-card${m.id === pick ? " on" : ""}`} onClick={() => setPick(m.id)} aria-pressed={m.id === pick}>
            <span className="gl-num">0{i + 1}</span>
            <span className="gl-pair">
              <span className="gl-tile light"><Flat mark={m} size={96} /></span>
              <span className="gl-tile dark"><Flat mark={m} size={96} /></span>
            </span>
            <span className="gl-row">
              <span className="gl-lockup light"><Flat mark={m} size={20} />Grain</span>
              <span className="gl-lockup dark"><Flat mark={m} size={20} />Grain</span>
              <span className="gl-fav"><Flat mark={m} size={32} /><Flat mark={m} size={16} /></span>
            </span>
            <span className="gl-name">{m.name}</span>
            <span className="gl-note">{m.note}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
