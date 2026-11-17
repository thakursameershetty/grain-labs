// v3 hero visual: one real run in a product window. An invoice exception comes in, the reconcile agent works
// through it, then the run stops for a human. The visitor is that human: clicking Approve delivers it.
// Like the advocate in How it runs, a finance lead's cursor comes in and approves it; the visitor can click first. Then it replays.
// Built on the same Workflow engine as How it runs (a different case, so the two don't repeat).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Workflow, { runNode, type WfEdge, type WfNode, type WfScript } from "./Workflow";
import { Email } from "./HowItRuns";
import GrainMark from "./GrainMark";

const W = 980, H = 540;   // the run's minimum layout size: wider windows lay it out wider, narrower ones scale it down
const STACK = "(max-width: 900px)";   // matches workflow.css: below this the nodes stack vertically

const NODES: WfNode[] = [
  {
    id: "mail", kind: "input", icon: "mail", type: "Trigger · Inbox", title: "Vendor email", time: "0.0 sec", x: 0, y: 128, w: 29,
    body: <Email initials="NS" name="Northwind Supply" addr="· vendor" subject="Invoice #0412 is past due"
      snippet="Please confirm payment for the March order. Invoice and PO attached." files={["invoice-0412.pdf", "po-2291.pdf"]} />,
  },
  {
    id: "agent", kind: "action", icon: "agent", type: "Agent", title: "Reconcile agent", time: "3.1 sec", meta: "model · set by profile", x: 35.5, y: 40, w: 29,
    items: [{ text: "Match the invoice to PO-2291" }, { text: "Compare 9 line items" }, { text: "$400 billed over the PO", tone: "warn" }],
  },
  {
    id: "gate", kind: "gate", icon: "gate", type: "Approval · finance", title: "Pay $840, dispute $400", x: 71, y: 96, w: 29,
    body: (
      <div className="pv">
        <div className="pv-from"><span className="pv-av pv-role" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" /></svg></span><span className="pv-name">Finance</span></div>
        <p className="pv-snip" style={{ marginTop: 8 }}>A reply and the audit are ready. Nothing is paid or sent until you approve.</p>
      </div>
    ),
  },
  {
    id: "out", kind: "output", icon: "send", type: "Action · send", title: "Reply sent, ledger updated", time: "sent", x: 35.5, y: 404, w: 29, compact: true,
  },
];
const EDGES: WfEdge[] = [["mail", "r", "agent", "l"], ["agent", "r", "gate", "l"], ["gate", "b", "out", "r"]];
const SCRIPT: WfScript = [
  ...runNode("mail"), [250, { edge: [0] }],
  ...runNode("agent", 3, 620), [250, { edge: [1] }],
  [500, { show: ["gate"] }], [500, { gate: "gate" }],
  [150, { edge: [2] }], [600, { show: [] }], ...runNode("out"),
];

const STAGES = ["Intake", "Run", "Review", "Deliver"] as const;
type Gate = "idle" | "waiting" | "approved" | "held";

export default function LiveRun() {
  const win = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [round, setRound] = useState(0);         // bump to replay (remounts the run)
  const [gate, setGate] = useState<Gate>("idle");
  const [working, setWorking] = useState(false);   // past intake: the agent is on it
  // stable (Workflow restarts its progress loop if this changes); only re-renders when the stage flips
  const onProgress = useCallback((p: number) => setWorking(p > 0.22), []);
  const [done, setDone] = useState(false);
  const [fit, setFit] = useState({ w: W, scale: 1, stacked: false });

  // play only while the window is on screen
  useEffect(() => {
    const el = win.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the run is laid out at W × H and scaled down to fit narrower windows
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const mq = window.matchMedia(STACK);
    const measure = () => {
      const cw = el.clientWidth;
      setFit({ w: Math.max(cw, W), scale: Math.min(1, cw / W), stacked: mq.matches });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // after delivery, hold the finished run for a moment, then replay
  useEffect(() => {
    if (!done || !inView) return;
    const t = window.setTimeout(() => { setDone(false); setGate("idle"); setWorking(false); setRound((r) => r + 1); }, 7000);
    return () => clearTimeout(t);
  }, [done, inView]);

  const stageIdx = done || gate === "approved" ? 3 : gate === "waiting" || gate === "held" ? 2 : working ? 1 : 0;
  const status = done ? "Delivered" : gate === "waiting" ? "Needs approval" : gate === "held" ? "On hold" : gate === "approved" ? "Sending" : "Running";
  const tone = done ? "ok" : gate === "waiting" ? "wait" : gate === "held" ? "held" : "run";

  return (
    <div className={`lr-window g-${gate}`} ref={win}>
      <div className="lr-bar">
        <span className="lr-crumb"><GrainMark className="lr-mark" /><span>Runs</span><i>/</i><b>Invoice exception</b><span className="lr-id">#4821</span></span>
        <span className={`lr-status s-${tone}`} aria-live="polite"><i aria-hidden="true" />{status}</span>
      </div>

      <div className="lr-stage" ref={stage} style={fit.stacked ? undefined : { height: H * fit.scale }}>
        <div className="lr-scaled" style={fit.stacked ? undefined : { width: fit.w, transform: `scale(${fit.scale})` }}>
          <Workflow
            key={round}
            nodes={NODES} edges={EDGES} script={SCRIPT} height={H}
            active={inView} idle="empty"
            approver="Maya, Finance" visitorName="you" cursorTag="Maya · Finance"
            onGate={setGate} onProgress={onProgress} onDone={() => setDone(true)}
            label="A live run: a vendor email is reconciled by an agent, then waits for your approval before the reply is sent"
          />
        </div>
      </div>

      <div className="lr-foot">
        <ol className="lr-steps" aria-label="Run stages">
          {STAGES.map((s, i) => (
            <li key={s} className={i < stageIdx ? "done" : i === stageIdx ? "on" : ""}><i aria-hidden="true" />{s}</li>
          ))}
        </ol>
        <p className="lr-hint">{done
          ? "Approved, sent and recorded. Every step has a trail."
          : gate === "waiting" ? <><b>Needs a sign-off.</b> Finance is reviewing, or approve it yourself.</>
          : "Agents do the work. You approve what matters."}</p>
      </div>
    </div>
  );
}
