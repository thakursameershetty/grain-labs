// "How it runs": continues straight on from the portal at the end of the hero (same surface).
// Desktop: one screen; the five steps play automatically one after the other (and loop). Left: the step
// copy and a clickable step list. Right: one large canvas (dot grid) where that step's workflow plays.
// Phones: the steps simply stack, each with its workflow.
// Step copy comes from grainlabs.ai; the case (patient bill advocacy) is an illustrative example.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Workflow, { FileGlyph, runNode, type WfEdge, type WfNode, type WfScript } from "./Workflow";
import { PlayIcon } from "@/version2/components/ui/play";
import { PauseIcon } from "@/version2/components/ui/pause";
import "./how-it-runs.css";

/* ───────── small previews used inside nodes ───────── */
function Email({ initials, name, addr, subject, snippet, files }: {
  initials: string; name: string; addr: string; subject: string; snippet: string; files?: string[];
}) {
  return (
    <div className="pv">
      <div className="pv-from">
        <span className="pv-av">{initials}</span>
        <span><span className="pv-name">{name}</span> <span className="pv-addr">{addr}</span></span>
      </div>
      <p className="pv-subj">{subject}</p>
      <p className="pv-snip">{snippet}</p>
      {files && (
        <div className="pv-files">
          {files.map((f) => <span key={f} className="pv-chip"><FileGlyph name={f} />{f}</span>)}
        </div>
      )}
    </div>
  );
}
const KV = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="pv pv-kv">{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
);
const Doc = ({ title, lines, foot }: { title: string; lines: number[]; foot?: string }) => (
  <div className="pv">
    <p className="pv-doc-t">{title}</p>
    <div className="pv-lines">{lines.map((w, i) => <i key={i} style={{ width: `${w}%` }} />)}</div>
    {foot && <p className="pv-foot">{foot}</p>}
  </div>
);
const tick = <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
const lock = <svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>;

type Flow = { nodes: WfNode[]; edges: WfEdge[]; script: WfScript; height: number };
type Step = { n: string; t: string; d: string; caseLine: string; flow: Flow };

/* 1 · Intake: an email arrives → the intake agent reads it → a durable task */
const INTAKE: Flow = {
  height: 360,
  nodes: [
    {
      id: "mail", kind: "input", icon: "mail", type: "Trigger · Inbox", title: "New email", time: "0.0 sec", x: 0, y: 40, w: 35,
      body: <Email initials="DR" name="Dana Ruiz" addr="· patient" subject="Is this bill right?"
        snippet="Hi, I got this bill from my March visit and now a collection letter. Insurance already paid part of it. Can you check?"
        files={["itemized-bill.pdf", "eob-march.pdf", "letter.jpg"]} />,
    },
    {
      id: "agent", kind: "action", icon: "agent", type: "Agent", title: "Intake agent", time: "2.4 sec", meta: "model · set by profile", x: 40, y: 0, w: 28,
      items: [{ text: "Read the itemized bill · 14 pages" }, { text: "Parse the insurer's EOB" }, { text: "Read the letter photo" }],
    },
    {
      id: "task", kind: "output", icon: "task", type: "Task · durable", title: "New case opened", time: "0.3 sec", x: 72, y: 70, w: 28,
      body: <KV rows={[["Case", "Bill dispute"], ["Files", "3 attached"], ["Rules", "Appeal within 180 days · Screen for charity care"], ["Status", <span className="pv-pill">Open</span>]]} />,
    },
  ],
  edges: [["mail", "r", "agent", "l"], ["agent", "r", "task", "l"]],
  script: [...runNode("mail"), [200, { edge: [0] }], [700, { show: [] }], ...runNode("agent", 3), [150, { edge: [1] }], [700, { show: [] }], ...runNode("task")],
};

/* 2 · Route: the case → the router → a versioned agent profile */
const ROUTE: Flow = {
  height: 440,
  nodes: [
    {
      id: "task", kind: "input", icon: "task", type: "Task", title: "Bill dispute case", time: "0.0 sec", x: 0, y: 20, w: 28,
      body: <KV rows={[["Type", "Healthcare · patient"], ["Files", "Bill, EOB, letter"], ["Deadline", "Appeal in 180 days"]]} />,
    },
    {
      id: "router", kind: "action", icon: "router", type: "Router", title: "Pick the right agent", time: "0.6 sec", meta: "14 approved profiles", x: 34, y: 200, w: 29,
      items: [{ text: "Match the case type" }, { text: "Check the agent registry" }, { text: "Pin the approved version" }],
    },
    {
      id: "profile", kind: "output", icon: "profile", type: "Profile · v9", title: "Advocacy agent", time: "ready", x: 68, y: 20, w: 32,
      body: (
        <div className="pv">
          <div className="pv-tags"><span className="pv-tag">Bill audit</span><span className="pv-tag">EOB matching</span><span className="pv-tag">Appeal drafting</span></div>
          <div className="pv-perm yes">{tick}<span>Read and write case documents</span></div>
          <div className="pv-perm yes">{tick}<span>Draft emails</span></div>
          <div className="pv-perm no">{lock}<span>Send emails or payments only after a person signs off</span></div>
        </div>
      ),
    },
  ],
  edges: [["task", "b", "router", "l"], ["router", "r", "profile", "l"]],
  script: [...runNode("task"), [200, { edge: [0] }], [700, { show: [] }], ...runNode("router", 3, 460), [150, { edge: [1] }], [700, { show: [] }], ...runNode("profile")],
};

/* 3 · Execute: the plan → two agents in parallel (one hits a timeout and resumes) → a draft */
const EXECUTE: Flow = {
  height: 460,
  nodes: [
    {
      id: "plan", kind: "input", icon: "plan", type: "Plan", title: "Run plan", time: "0.0 sec", x: 0, y: 130, w: 25,
      body: <div className="pv"><ol className="pv-ol"><li>Check every charge</li><li>Get the hospital records</li><li>Draft the appeal</li></ol></div>,
    },
    {
      id: "ledger", kind: "action", icon: "agent", type: "Agent · billing", title: "Check every charge", time: "1.9 sec", x: 31, y: 0, w: 33,
      items: [{ text: "Match 212 charges to the EOB" }, { text: "Flag 9 charges that don't match" }, { text: "Save a checkpoint" }],
    },
    {
      id: "records", kind: "action", icon: "agent", type: "Agent · records", title: "Get the hospital records", time: "4.2 sec", x: 31, y: 245, w: 33,
      items: [{ text: "Request records from the hospital" }, { text: "Portal timed out · retrying", tone: "warn" }, { text: "Picked up from the checkpoint" }],
    },
    {
      id: "draft", kind: "output", icon: "doc", type: "Draft", title: "Appeal letter", time: "0.8 sec", x: 71, y: 105, w: 29,
      body: <Doc title="Re: Disputed charges, March visit" lines={[100, 92, 97, 60, 88, 74]} foot="9 charges · audit table attached" />,
    },
  ],
  edges: [["plan", "r", "ledger", "l"], ["plan", "r", "records", "l"], ["ledger", "r", "draft", "l"], ["records", "r", "draft", "l"]],
  script: [
    ...runNode("plan"),
    [200, { edge: [0, 1] }],
    [700, { show: ["ledger", "records"] }],
    [420, { tick: "ledger" }], [200, { tick: "records" }],
    [400, { tick: "ledger" }], [500, { tick: "records" }],      // the timeout
    [420, { tick: "ledger" }], [180, { finish: ["ledger"] }],
    [900, { tick: "records" }], [260, { finish: ["records"] }], // picked up again
    [150, { edge: [2, 3] }],
    [700, { show: [] }],
    ...runNode("draft"),
  ],
};

/* 4 · Approve: the draft → a person signs off (waits for a click) → the email goes out */
const APPROVE: Flow = {
  height: 380,
  nodes: [
    {
      id: "draft", kind: "input", icon: "doc", type: "Document", title: "Appeal letter", time: "0.0 sec", x: 0, y: 95, w: 27,
      body: <Doc title="Re: Disputed charges" lines={[100, 88, 95, 55]} foot="ready for review" />,
    },
    {
      id: "gate", kind: "gate", icon: "gate", type: "Approval · human", title: "Needs a sign-off", x: 33, y: 45, w: 33,
      body: (
        <div className="pv">
          <div className="pv-from"><span className="pv-av pv-role" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" /></svg></span><span className="pv-name">Advocate</span></div>
          <p className="pv-snip" style={{ marginTop: 8 }}>Review the appeal before it goes to the insurer. Nothing is sent until you approve.</p>
        </div>
      ),
    },
    {
      id: "sent", kind: "output", icon: "send", type: "Action · email", title: "Send the appeal", time: "sent", x: 72, y: 70, w: 28,
      body: <Email initials="IN" name="Claims team" addr="· insurer" subject="Appeal: disputed charges, March visit" snippet="Please find our appeal and the supporting audit attached." files={["appeal.pdf", "audit.csv"]} />,
    },
  ],
  edges: [["draft", "r", "gate", "l"], ["gate", "r", "sent", "l"]],
  script: [...runNode("draft"), [200, { edge: [0] }], [700, { show: ["gate"] }], [500, { gate: "gate" }], [150, { edge: [1] }], [700, { show: [] }], ...runNode("sent")],
};

/* 5 · Inspect: the files → the reviewer → a packet with its sources */
const INSPECT: Flow = {
  height: 440,
  nodes: [
    { id: "f1", kind: "input", icon: "file", file: "appeal-letter.pdf", type: "File · PDF", title: "appeal-letter.pdf", compact: true, x: 0, y: 10, w: 26, body: <p className="pv-file-meta">2 pages · signed off</p> },
    { id: "f2", kind: "input", icon: "file", file: "charge-audit.csv", type: "File · CSV", title: "charge-audit.csv", compact: true, x: 0, y: 150, w: 26, body: <p className="pv-file-meta">212 rows · 9 flagged</p> },
    { id: "f3", kind: "input", icon: "file", file: "charity-care-check.pdf", type: "File · PDF", title: "charity-care-check.pdf", compact: true, x: 0, y: 290, w: 26, body: <p className="pv-file-meta">1 page · eligibility</p> },
    {
      id: "review", kind: "action", icon: "review", type: "Agent · reviewer", title: "Check the evidence", time: "1.2 sec", x: 33, y: 110, w: 29,
      items: [{ text: "Trace every claim to its source" }, { text: "Fingerprint each file" }, { text: "Flag anything uncertain" }],
    },
    {
      id: "packet", kind: "output", icon: "packet", type: "Packet", title: "Case packet", time: "done", x: 68, y: 60, w: 32,
      body: (
        <div className="pv">
          <ul className="pv-files-list">
            <li><span><FileGlyph name="appeal-letter.pdf" />appeal-letter.pdf</span><span className="pv-st ok">verified</span></li>
            <li><span><FileGlyph name="charge-audit.csv" />charge-audit.csv</span><span className="pv-st">derived</span></li>
            <li><span><FileGlyph name="charity-care-check.pdf" />charity-care-check.pdf</span><span className="pv-st flag">needs review</span></li>
          </ul>
          <p className="pv-foot">Every claim links to its source page</p>
        </div>
      ),
    },
  ],
  edges: [["f1", "r", "review", "l"], ["f2", "r", "review", "l"], ["f3", "r", "review", "l"], ["review", "r", "packet", "l"]],
  script: [
    [0, { show: ["f1"] }], [180, { show: ["f2"] }], [180, { show: ["f3"] }], [300, { finish: ["f1", "f2", "f3"] }],
    [100, { edge: [0, 1, 2] }], [700, { show: [] }],
    ...runNode("review", 3), [150, { edge: [3] }], [700, { show: [] }], ...runNode("packet"),
  ],
};

const STEPS: Step[] = [
  { n: "01", t: "Intake", d: "Request, files, rules and history become one durable task.", caseLine: "A patient forwards a bill, an EOB and a collection letter.", flow: INTAKE },
  { n: "02", t: "Route", d: "A versioned agent profile supplies skills, model settings and tool grants.", caseLine: "Grain hands the case to the advocacy agent.", flow: ROUTE },
  { n: "03", t: "Execute", d: "Steps run with checkpoints and retries, and recover from known-good state.", caseLine: "Two agents work in parallel; one hits a timeout and picks up where it left off.", flow: EXECUTE },
  { n: "04", t: "Approve", d: "The run pauses for human decisions and records each one.", caseLine: "The appeal waits for the advocate. Try the button.", flow: APPROVE },
  { n: "05", t: "Inspect", d: "Evidence, safe previews and output lineage are reviewed before anything ships.", caseLine: "The finished packet, with every source attached.", flow: INSPECT },
];

export default function HowItRuns() {
  const [active, setActive] = useState(0);
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  const sectionRef = useRef<HTMLElement>(null);
  const blockRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // desktop: the steps play automatically, one after the other, while the section is on screen.
  // Each step's workflow reports its progress (fills the step's bar) and when it finishes;
  // after a 1s pause on the result (the bar fills through it), the next step starts. After Inspect it loops to Intake.
  const [inView, setInView] = useState(false);
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const advance = useRef<number>(0);
  // After a workflow finishes: the bar keeps filling for FILL_TAIL_MS, then sits full for
  // FULL_BEAT_MS (a short beat on the finished result), then the next step starts.
  const FILL_TAIL_MS = 400;
  const FULL_BEAT_MS = 800;
  const HOLD_MS = FILL_TAIL_MS + FULL_BEAT_MS;
  useEffect(() => {
    if (narrow) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, [narrow]);
  useEffect(() => () => clearTimeout(advance.current), []);
  const setProgress = (p: number) => sectionRef.current?.style.setProperty("--step-p", p.toFixed(3));
  // pause / play: freezes the running workflow and holds the sequence where it is
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const advanceDue = useRef(0);      // when the pending move to the next step will fire
  const advanceLeft = useRef(0);     // time left on it if paused mid-pause
  const queueAdvance = (ms: number) => {
    clearTimeout(advance.current);
    advanceLeft.current = ms;
    if (pausedRef.current) return;   // starts when play is pressed
    advanceDue.current = performance.now() + ms;
    advance.current = window.setTimeout(() => { advanceLeft.current = 0; setProgress(0); setActive((a) => (a + 1) % STEPS.length); }, ms);   // reset first so the next box never flashes full
  };
  const onStepDone = () => {
    if (reduce) return;
    queueAdvance(HOLD_MS);
  };
  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    pausedRef.current = next;
    if (next && advance.current) {   // freeze a pending step change too
      clearTimeout(advance.current); advance.current = 0;
      advanceLeft.current = Math.max(0, advanceDue.current - performance.now());
    } else if (!next && advanceLeft.current > 0) {
      queueAdvance(advanceLeft.current);
    }
  };

  // phones: the step crossing the middle of the screen plays
  useEffect(() => {
    if (!narrow) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.i))),
      { rootMargin: "-40% 0px -40% 0px" },
    );
    blockRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [narrow]);

  const goTo = (i: number) => {
    clearTimeout(advance.current);
    advanceLeft.current = 0;
    setProgress(0);
    setActive(i);
  };

  const flowFor = (s: Step, i: number) => (
    <Workflow
      nodes={s.flow.nodes} edges={s.flow.edges} script={s.flow.script} height={s.flow.height}
      active={i === active && (narrow || inView)} approver="the advocate"
      onProgress={!narrow && i === active ? setProgress : undefined}
      onDone={!narrow && i === active ? onStepDone : undefined}
      idle={narrow ? "final" : "empty"}
      tailMs={narrow ? 0 : FILL_TAIL_MS}
      paused={!narrow && i === active && paused}
      label={`${s.t} workflow: ${s.flow.nodes.map((n) => n.title).join(", then ")}`}
    />
  );

  if (narrow) {
    return (
      <section className="hw narrow" data-surface="dark" aria-label="How it runs">
        {STEPS.map((s, i) => (
          <article key={s.n} className="hw-block" data-i={i} ref={(el) => { blockRefs.current[i] = el; }}>
            <p className="hw-n"><span>{s.n}</span> / 05</p>
            <h3>{s.t}</h3>
            <p className="hw-d">{s.d}</p>
            <p className="hw-case"><span>In this case</span>{s.caseLine}</p>
            <div className="hw-canvas">{flowFor(s, i)}</div>
          </article>
        ))}
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="hw" data-surface="dark" aria-label="How it runs" >
      <div className="hw-stage">
        <div className="hw-side">
          <div className="hw-copies">
            {STEPS.map((s, i) => (
              <div key={s.n} className={`hw-copy${i === active ? " on" : ""}`} aria-hidden={i !== active}>
                <p className="hw-n"><span>{s.n}</span> / 05</p>
                <h3>{s.t}</h3>
                <p className="hw-d">{s.d}</p>
                <p className="hw-case"><span>In this case</span>{s.caseLine}</p>
              </div>
            ))}
          </div>
          <ol className="hw-tabs">
            {STEPS.map((s, i) => (
              <li key={s.n} className={`${i === active ? "on" : ""}${i === active && paused ? " is-paused" : ""}`}>
                <button type="button" className={i === active ? "on" : i < active ? "done" : ""} onClick={() => goTo(i)}>
                  <span className="hw-tab-n">{s.n}</span>
                  <span className="hw-tab-t">{s.t}</span>
                </button>
                {i === active && !reduce && (
                  <button
                    type="button"
                    className="hw-pp"
                    onClick={togglePause}
                    aria-label={paused ? "Play the walkthrough" : "Pause the walkthrough"}
                  >
                    {/* lucide-animated: rounded strokes, and they animate on hover */}
                    {paused ? <PlayIcon size={16} className="hw-pp-ico" /> : <PauseIcon size={16} className="hw-pp-ico" />}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="hw-canvas">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`hw-flow${i === active ? " on" : ""}`} aria-hidden={i !== active}>
              {flowFor(s, i)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
