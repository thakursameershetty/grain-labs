// Trust: the opposite of a black box. Five cards, one per guarantee, each showing the guarantee itself:
// a run that fails and resumes from a checkpoint, a versioned agent profile with its grants, an approval on
// the record, an output traced to its sources, and a log that withholds sensitive content (the journal opens
// only on request, and the request is recorded).
import { useEffect, useRef, useState } from "react";
import { CpuIcon } from "@/components/ui/cpu";
import { WorkflowIcon } from "@/components/ui/workflow";
import { UserCheckIcon } from "@/components/ui/user-check";
import { ScanTextIcon } from "@/components/ui/scan-text";
import { LockIcon } from "@/components/ui/lock";
import "./trust.css";

type Anim = { startAnimation: () => void; stopAnimation: () => void };
const reduce = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function Card({ cls, I, t, d, children }: { cls: string; I: typeof CpuIcon; t: string; d: string; children: React.ReactNode }) {
  const ico = useRef<Anim>(null);
  return (
    <article className={`tg-card rv ${cls}`} onPointerEnter={() => ico.current?.startAnimation()} onPointerLeave={() => ico.current?.stopAnimation()}>
      <div className="tg-head">
        <span className="tg-ico"><I ref={ico} size={18} /></span>
        <h3>{t}</h3>
      </div>
      <p className="tg-d">{d}</p>
      <div className="tg-art">{children}</div>
    </article>
  );
}

/* 1 · durable execution: a run hits a timeout and resumes from its last checkpoint */
const STEPS = [
  { n: "Intake", cp: "" }, { n: "Ledger", cp: "cp-07" }, { n: "Records", cp: "", fail: true }, { n: "Draft", cp: "cp-09" }, { n: "Review", cp: "cp-10" },
];
function Durable() {
  return (
    <div className="tg-run">
      <div className="tg-track">
        <i className="tg-fill" />
        {STEPS.map((s, i) => (
          <div key={s.n} className={`tg-step${s.fail ? " fail" : ""}`} style={{ ["--i" as string]: i }}>
            <b>{s.fail ? "!" : "✓"}</b>
            <span className="tg-step-n">{s.n}</span>
            <span className="tg-step-cp">{s.fail ? "Portal timed out" : s.cp || " "}</span>
          </div>
        ))}
        {/* the retry: back to the last checkpoint, then on */}
        <svg className="tg-arc" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M50 2 C 47 28, 33 28, 30 2" /></svg>
        <span className="tg-arc-l">Resumed from cp-07</span>
      </div>
      <div className="tg-stats">
        <span><b>1</b> retry</span><span><b>0</b> restarts</span><span><b>4</b> checkpoints</span><span className="ok">No work lost</span>
      </div>
    </div>
  );
}

/* 2 · governed agents: a versioned profile and exactly what it's allowed to do */
function Governed() {
  return (
    <div className="tg-prof">
      <div className="tg-prof-h"><span className="tg-mono">advocacy-case-agent</span><span className="tg-pill">v12 · pinned</span></div>
      <dl>
        <dt>Model</dt><dd>Set by profile</dd>
        <dt>Skills</dt><dd>Bill audit · Appeal drafting</dd>
      </dl>
      <ul className="tg-grants">
        <li className="ok"><i>✓</i>Read case files</li>
        <li className="ok"><i>✓</i>Draft emails</li>
        <li className="wait"><i><LockIcon size={11} /></i>Send email · after approval</li>
      </ul>
      <p className="tg-diff">v11 → v12 approved by the ops lead</p>
    </div>
  );
}

/* 3 · human approval: the decision, who made it and when, on the record */
function Approval() {
  return (
    <div className="tg-appr">
      <div className="tg-appr-row">
        <span className="tg-av">SW</span>
        <span className="tg-appr-t"><b>s.whitfield</b><span>Send the appeal to the insurer</span></span>
        <span className="tg-stamp">Approved</span>
      </div>
      <div className="tg-appr-meta"><span>Today · 14:02</span><span>Recorded on the task</span></div>
      <ul className="tg-appr-list">
        <li><i className="ok" />Charity-care screen<span>approved</span></li>
        <li><i className="ok" />Charge audit<span>approved</span></li>
        <li><i className="wait" />Final packet<span>waiting</span></li>
      </ul>
    </div>
  );
}

/* 4 · inspectable output: claims in the deliverable trace to their sources */
function Lineage() {
  return (
    <div className="tg-lin">
      <div className="tg-lin-doc">
        <p className="tg-mono">appeal-letter.pdf</p>
        <span className="tg-claim c1">9 charges don't match the EOB</span>
        <i className="tg-l" style={{ width: "86%" }} />
        <span className="tg-claim c2">Plan already paid $910</span>
        <i className="tg-l" style={{ width: "70%" }} />
      </div>
      <ul className="tg-lin-src">
        <li className="c1">charge-audit.csv · rows 14–22</li>
        <li className="c2">EOB-march.pdf · page 2</li>
      </ul>
    </div>
  );
}

/* 5 · PHI-safe: the log keeps out sensitive text; the journal opens only on request, and that's recorded */
const JOURNAL: [string, string][] = [["prompt", "Draft the appeal from the March EOB"], ["patient", "Dana Ruiz · DOB 1984"], ["note", "Charity care likely eligible"]];
const GLYPHS = "#%@*+=-:/\\|_";
const scramble = (s: string, keep: number) => s.split("").map((ch, i) => (i < keep || ch === " " ? ch : GLYPHS[(i * 7 + keep * 3) % GLYPHS.length])).join("");
function Phi() {
  const [k, setK] = useState(-1);
  const longest = Math.max(...JOURNAL.map(([, v]) => v.length));
  const timer = useRef(0);
  useEffect(() => () => clearInterval(timer.current), []);
  const open = () => {
    if (reduce()) { setK(longest); return; }
    let n = 0; setK(0);
    timer.current = window.setInterval(() => { n += 2; setK(n); if (n >= longest) clearInterval(timer.current); }, 30);
  };
  const done = k >= longest;
  return (
    <div className="tg-phi">
      <p className="tg-phi-h">Runtime log</p>
      <div className="tg-log">
        <div><span>event</span><span>draft.saved</span></div>
        <div><span>prompt</span><span className="wh">withheld</span></div>
        <div><span>patient</span><span className="wh">withheld</span></div>
      </div>
      <p className="tg-phi-h"><LockIcon size={12} /> Private journal · 23 entries</p>
      <div className={`tg-log journal${k < 0 ? " locked" : ""}`}>
        {JOURNAL.map(([key, v]) => <div key={key}><span>{key}</span><span>{k < 0 ? scramble(v, 0) : scramble(v, k)}</span></div>)}
      </div>
      {k < 0
        ? <button type="button" className="tg-req" onClick={open}><LockIcon size={13} /> Request access</button>
        : <p className="tg-granted">{done ? "✓ Access granted to s.whitfield · recorded" : "Opening…"}</p>}
    </div>
  );
}

export default function TrustGrid() {
  return (
    <div className="tg-grid">
      <Card cls="tg-durable" I={CpuIcon} t="Durable execution" d="Checkpoints, retries and recovery keep long work moving. Failures resume instead of restarting."><Durable /></Card>
      <Card cls="tg-governed" I={WorkflowIcon} t="Governed agents" d="Profiles, skills, tools and models are versioned, so what runs is what was approved."><Governed /></Card>
      <Card cls="tg-approval" I={UserCheckIcon} t="Human approval" d="Grain pauses before consequential actions, and every approval is recorded."><Approval /></Card>
      <Card cls="tg-inspect" I={ScanTextIcon} t="Inspectable output" d="Each deliverable links back to its runs, artifacts and lineage."><Lineage /></Card>
      <Card cls="tg-phi-c" I={LockIcon} t="PHI-safe operations" d="Runtime logs leave out prompts, raw content and sensitive text. Detail lives in private journals."><Phi /></Card>
    </div>
  );
}
