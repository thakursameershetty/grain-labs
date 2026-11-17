// Animated workflow graph (the "how it works" visual from the Orion reference, in Grain's style).
// Nodes look like a real workflow builder: icon tile, node type, name, ports where wires attach,
// and a body that previews real content (an email, a profile, a document…).
// Nodes are positioned absolutely (left/width in %, top in px); wires are measured from the rendered
// nodes and drawn as SVG. A small script plays the run: nodes appear, tasks tick through an ASCII
// spinner to ✓, wires draw, and a dot keeps travelling along them. Plays when `active`.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
// animated icons from lucide-animated (installed with `npx shadcn add @lucide-animated/...`)
import { MailboxIcon } from "@/version2/components/ui/mailbox";
import { BotIcon } from "@/version2/components/ui/bot";
import { ClipboardCheckIcon } from "@/version2/components/ui/clipboard-check";
import { WorkflowIcon } from "@/version2/components/ui/workflow";
import { UserCheckIcon } from "@/version2/components/ui/user-check";
import { LayersIcon } from "@/version2/components/ui/layers";
import { FilePenLineIcon } from "@/version2/components/ui/file-pen-line";
import { ShieldCheckIcon } from "@/version2/components/ui/shield-check";
import { SendIcon } from "@/version2/components/ui/send";
import { FileTextIcon } from "@/version2/components/ui/file-text";
import { BoxIcon } from "@/version2/components/ui/box";
import { ScanTextIcon } from "@/version2/components/ui/scan-text";
import { TimerIcon } from "@/version2/components/ui/timer";
import "./workflow.css";

export type Side = "l" | "r" | "t" | "b";
export type WfItem = { text: string; tone?: "warn" | "review" };
export type IconName = "mail" | "agent" | "task" | "router" | "profile" | "plan" | "doc" | "gate" | "send" | "file" | "packet" | "review";
export type WfNode = {
  id: string;
  /** a file node: show the Material Symbols icon for its type instead of the animated icon */
  file?: string;
  kind: "input" | "action" | "gate" | "output";
  icon: IconName;
  type: string;           // node type label, e.g. "Trigger · Inbox"
  title: string;          // plain name, e.g. "New email"
  body?: ReactNode;       // rich preview
  /** tasks tick one by one while the node runs */
  items?: WfItem[];
  meta?: string;          // footer line, e.g. "model · set by profile"
  time?: string;          // shown when the node finishes
  compact?: boolean;
  x: number; y: number; w: number;   // left %, top px, width %
};
export type WfEdge = [from: string, fromSide: Side, to: string, toSide: Side];
export type WfAction = { show: string[] } | { tick: string } | { finish: string[] } | { edge: number[] } | { gate: string };
export type WfScript = [delayMs: number, action: WfAction][];

/** helper: show a node, tick its n tasks, finish it */
export function runNode(id: string, tasks = 0, tickMs = 520): WfScript {
  const s: WfScript = [[0, { show: [id] }]];
  for (let i = 0; i < tasks; i++) s.push([i === 0 ? 380 : tickMs, { tick: id }]);
  s.push([tasks ? 280 : 420, { finish: [id] }]);
  return s;
}

const PATHS: Record<IconName, ReactNode> = {
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M4 7.5l8 5.5 8-5.5" /></>,
  agent: <><rect x="4.5" y="8" width="15" height="11" rx="3.5" /><path d="M12 4.5V8M9.5 13.2h.01M14.5 13.2h.01" /><circle cx="12" cy="4" r="1" /></>,
  task: <><rect x="5" y="4" width="14" height="16" rx="2.5" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></>,
  router: <><circle cx="5.5" cy="12" r="2" /><circle cx="18.5" cy="6.5" r="2" /><circle cx="18.5" cy="17.5" r="2" /><path d="M7.5 12h3.5l4.8-4.8M11 12l4.8 4.8" /></>,
  profile: <><circle cx="12" cy="9" r="3.4" /><path d="M5.5 19.5c1.1-3.2 3.6-4.8 6.5-4.8s5.4 1.6 6.5 4.8" /></>,
  plan: <><path d="M9 7h10M9 12h10M9 17h7" /><circle cx="5.5" cy="7" r="1.1" /><circle cx="5.5" cy="12" r="1.1" /><circle cx="5.5" cy="17" r="1.1" /></>,
  doc: <><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" /><path d="M14 3.5V8h4M9.5 12.5h5M9.5 16h5" /></>,
  gate: <><path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.5-7 9-4.1-1.5-7-4.7-7-9V6.3z" /><path d="M9 12.2l2.1 2.1 4-4" /></>,
  send: <path d="M4 11.6L20 4.5l-5.6 15.5-3.1-6.5z M11.3 13.5L20 4.5" />,
  file: <><path d="M7 3.5h7l4 4V20.5H7z" /><path d="M14 3.5V8h4" /></>,
  packet: <><path d="M4 8l8-4 8 4v8.5l-8 4-8-4z" /><path d="M4 8l8 4 8-4M12 12v8.5" /></>,
  review: <><circle cx="11" cy="11" r="6" /><path d="M19.5 19.5l-4-4M8.5 11l1.8 1.8 3.2-3.3" /></>,
};
/** file-type icon from Google Material Symbols (loaded in index.html), picked by extension */
export function fileSymbol(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "picture_as_pdf";
  if (ext === "csv") return "csv";
  if (["jpg", "jpeg", "png", "heic"].includes(ext)) return "image";
  if (["xlsx", "xls"].includes(ext)) return "table";
  return "description";
}
export function FileGlyph({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`msym ${className}`} aria-hidden="true">{fileSymbol(name)}</span>;
}

/** small static icon (file chips, inline marks) */
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}

type AnimHandle = { startAnimation: () => void; stopAnimation: () => void };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ANIM: Record<IconName, any> = {
  mail: MailboxIcon, agent: BotIcon, task: ClipboardCheckIcon, router: WorkflowIcon, profile: UserCheckIcon,
  plan: LayersIcon, doc: FilePenLineIcon, gate: ShieldCheckIcon, send: SendIcon, file: FileTextIcon,
  packet: BoxIcon, review: ScanTextIcon,
};
/** node icon: plays once when the node appears, and keeps playing while the node is working */
function NodeIcon({ name, shown, running }: { name: IconName; shown: boolean; running: boolean }) {
  const ref = useRef<AnimHandle>(null);
  const Comp = ANIM[name];
  useEffect(() => {
    const h = ref.current;
    if (!h || !shown) return;
    h.startAnimation();
    if (!running) {
      const t = window.setTimeout(() => h.stopAnimation(), 900);
      return () => clearTimeout(t);
    }
    const id = window.setInterval(() => {
      h.stopAnimation();
      window.setTimeout(() => h.startAnimation(), 180);
    }, 1500);
    return () => clearInterval(id);
  }, [shown, running]);
  return <Comp ref={ref} size={18} className="wf-anim" />;
}
/** time pill: animated timer + a live count while the node works, then the node's final time.
    Times that aren't numbers ("ready", "sent", "done") show as a plain status pill. */
function TimePill({ time, running, paused }: { time?: string; running: boolean; paused: boolean }) {
  const ref = useRef<AnimHandle>(null);
  const [elapsed, setElapsed] = useState(0);
  const base = useRef(0);   // time already counted before the last pause
  const numeric = !!time && /^\d/.test(time);
  useEffect(() => { if (!running) base.current = 0; }, [running]);
  useEffect(() => {
    const h = ref.current;
    if (!running || paused) { h?.stopAnimation(); return; }
    const t0 = performance.now() - base.current * 1000;
    let raf = 0;
    const tick = () => { const e = (performance.now() - t0) / 1000; base.current = e; setElapsed(e); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    h?.startAnimation();
    const loop = window.setInterval(() => { h?.stopAnimation(); window.setTimeout(() => h?.startAnimation(), 120); }, 1200);
    return () => { cancelAnimationFrame(raf); clearInterval(loop); };
  }, [running, paused]);
  if (!running && !time) return null;
  if (!running && !numeric) return <span className="wf-pill word">{time}</span>;
  return (
    <span className={`wf-pill${running ? " live" : ""}`}>
      <TimerIcon ref={ref} size={13} className="wf-pill-ico" />
      {running ? `${elapsed.toFixed(1)} sec` : time}
    </span>
  );
}
const ROLE: Record<WfNode["kind"], string> = { input: "Input", action: "Action", gate: "Approval", output: "Output" };

const GATE_MS = 4400;   // how long the gate waits before the advocate's cursor clicks Approve
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type State = { shown: Set<string>; running: Set<string>; done: Record<string, number>; edges: Set<number>; gate: "idle" | "waiting" | "approved" | "held" };
const SPIN = ["|", "/", "-", "\\"];

function finalState(nodes: WfNode[], edges: WfEdge[]): State {
  const done: Record<string, number> = {};
  nodes.forEach((n) => (done[n.id] = n.items?.length ?? 0));
  return { shown: new Set(nodes.map((n) => n.id)), running: new Set(), done, edges: new Set(edges.map((_, i) => i)), gate: "approved" };
}
const emptyState = (): State => ({ shown: new Set(), running: new Set(), done: {}, edges: new Set(), gate: "idle" });

function roundPath(pts: [number, number][], r = 12) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    if (rr < 0.5) { d += ` L ${x1} ${y1}`; continue; }
    const ax = x1 - ((x1 - x0) / d1) * rr, ay = y1 - ((y1 - y0) / d1) * rr;
    const bx = x1 + ((x2 - x1) / d2) * rr, by = y1 + ((y2 - y1) / d2) * rr;
    d += ` L ${ax} ${ay} Q ${x1} ${y1} ${bx} ${by}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${last[0]} ${last[1]}`;
}

type Wire = { d: string; a: [number, number]; b: [number, number]; kind: WfNode["kind"] };

export default function Workflow({
  nodes, edges, script, height, active, label, approver = "the advocate", onProgress, onDone, idle = "final", tailMs = 0, paused = false,
}: {
  nodes: WfNode[]; edges: WfEdge[]; script: WfScript; height: number; active: boolean; label: string; approver?: string;
  /** 0–1 as the run plays (drives the step's progress bar) */
  onProgress?: (p: number) => void;
  /** the run reached its last node (used to advance to the next step) */
  onDone?: () => void;
  /** what an inactive workflow shows: its finished graph ("final") or nothing yet ("empty") */
  idle?: "final" | "empty";
  /** extra time after the run that still counts toward progress (the pause before the next step) */
  tailMs?: number;
  /** the visitor paused the sequence: freeze where it is */
  paused?: boolean;
}) {
  const cb = useRef({ onProgress, onDone });
  cb.current = { onProgress, onDone };
  const wrap = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<Record<string, HTMLDivElement | null>>({});
  const [wires, setWires] = useState<Wire[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduceInit = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // start from the idle state so a run never flashes its end result before playing
  const [st, setSt] = useState<State>(() => (idle === "empty" && !reduceInit ? emptyState() : finalState(nodes, edges)));
  const [spin, setSpin] = useState(0);
  // the advocate's cursor: glides in while the gate waits, clicks Approve, then drifts away
  const [cursor, setCursor] = useState<"off" | "on" | "leave">("off");
  const curRef = useRef<HTMLDivElement>(null);
  const curAt = useRef({ x: 0, y: 0 });   // where the cursor last was, kept across its phases
  const timers = useRef<number[]>([]);
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── measure nodes and build wires ──
  const measure = useCallback(() => {
    // `slot` spreads several wires on the same side of a node so they never share one point
    const port = (id: string, side: Side, slot = 0): [number, number] => {
      const el = nodeEls.current[id];
      if (!el) return [0, 0];
      const { offsetLeft: x, offsetTop: y, offsetWidth: w, offsetHeight: h } = el;
      return side === "l" ? [x, y + h / 2 + slot] : side === "r" ? [x + w, y + h / 2 + slot] : side === "t" ? [x + w / 2 + slot, y] : [x + w / 2 + slot, y + h];
    };
    const centre = (id: string): [number, number] => {
      const el = nodeEls.current[id];
      return el ? [el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2] : [0, 0];
    };
    // for every (node, side) with more than one wire, order the wires by where their other end sits
    // (top-to-bottom on left/right sides, left-to-right on top/bottom) and give each its own slot
    const slots = edges.map(() => [0, 0]);
    const spread = (end: 0 | 1) => {
      const groups = new Map<string, number[]>();
      edges.forEach((e, i) => {
        const key = end === 0 ? `${e[0]}|${e[1]}` : `${e[2]}|${e[3]}`;
        groups.set(key, [...(groups.get(key) ?? []), i]);
      });
      groups.forEach((list, key) => {
        if (list.length < 2) return;
        const [id, side] = key.split("|") as [string, Side];
        const el = nodeEls.current[id];
        if (!el) return;
        const vertical = side === "l" || side === "r";
        const span = vertical ? el.offsetHeight : el.offsetWidth;
        const gap = Math.min(26, (span * 0.7) / (list.length - 1));
        const other = (i: number) => centre(end === 0 ? edges[i][2] : edges[i][0])[vertical ? 1 : 0];
        [...list].sort((p, q) => other(p) - other(q)).forEach((i, k) => {
          slots[i][end] = (k - (list.length - 1) / 2) * gap;
        });
      });
    };
    spread(0); spread(1);
    setWires(
      edges.map(([a, sa, b, sb], i) => {
        const p1 = port(a, sa, slots[i][0]), p2 = port(b, sb, slots[i][1]);
        const [x1, y1] = p1, [x2, y2] = p2;
        const horiz = (s: Side) => s === "l" || s === "r";
        let pts: [number, number][];
        if (horiz(sa) && horiz(sb)) { const mx = (x1 + x2) / 2; pts = [[x1, y1], [mx, y1], [mx, y2], [x2, y2]]; }
        else if (!horiz(sa) && !horiz(sb)) { const my = (y1 + y2) / 2; pts = [[x1, y1], [x1, my], [x2, my], [x2, y2]]; }
        else if (!horiz(sa)) pts = [[x1, y1], [x1, y2], [x2, y2]];
        else pts = [[x1, y1], [x2, y1], [x2, y2]];
        return { d: roundPath(pts), a: p1, b: p2, kind: nodes.find((n) => n.id === b)?.kind ?? "action" };
      }),
    );
  }, [edges, nodes]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    Object.values(nodeEls.current).forEach((el) => el && ro.observe(el));
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  // ── play the script ──
  // ── playback: one action at a time, so a run can pause anywhere and resume from the same spot ──
  const run = useRef({ idx: 0, timer: 0, dueAt: 0, remaining: 0, phase: "idle" as "idle" | "playing" | "gate" | "held" | "done", auto: 0, autoDue: 0, autoLeft: 0 });
  const clear = () => {
    const r = run.current;
    clearTimeout(r.timer); clearTimeout(r.auto);
    r.timer = 0; r.auto = 0;
    timers.current.forEach(clearTimeout); timers.current = [];
  };

  // ── smooth progress: driven by time, not by events ──
  // The run's length is known from the script, so progress = playing time / total time, updated every
  // frame. Time spent waiting at an approval gate, on hold, or paused by the visitor doesn't count.
  const totalMs = script.reduce((t, [d]) => t + d, 0) + 200 + tailMs;
  const clock = useRef({ start: 0, pausedAt: 0, paused: 0, running: false, gate: false, user: false });
  const syncClock = () => {
    const c = clock.current, now = performance.now();
    const stop = c.gate || c.user;
    if (stop && !c.pausedAt) c.pausedAt = now;
    if (!stop && c.pausedAt) { c.paused += now - c.pausedAt; c.pausedAt = 0; }
  };
  useEffect(() => {
    if (!active || !onProgress) return;
    let raf = 0;
    const tick = () => {
      const c = clock.current;
      if (c.running) {
        const now = performance.now();
        const played = now - c.start - c.paused - (c.pausedAt ? now - c.pausedAt : 0);
        cb.current.onProgress?.(Math.min(1, Math.max(0, played / totalMs)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, onProgress, totalMs]);

  const nextDelay = (i: number) => (i < script.length ? script[i][0] : 200);
  const schedule = (delay: number) => {
    const r = run.current;
    r.phase = "playing";
    if (clock.current.user) { r.remaining = delay; return; }   // paused: remember, start on resume
    r.dueAt = performance.now() + delay;
    r.timer = window.setTimeout(exec, delay);
  };
  const armAuto = (ms: number) => {   // the gate approves itself if nobody clicks
    const r = run.current;
    r.autoLeft = ms;
    if (clock.current.user) return;
    r.autoDue = performance.now() + ms;
    r.auto = window.setTimeout(() => approve(false), ms);
  };
  function exec() {
    const r = run.current;
    r.timer = 0;
    if (r.idx >= script.length) { r.phase = "done"; cb.current.onDone?.(); return; }   // the clock keeps filling through tailMs
    const act = script[r.idx][1];
    r.idx++;
    if ("gate" in act) {
      r.phase = "gate";
      clock.current.gate = true; syncClock();
      setSt((s) => ({ ...s, gate: "waiting", running: new Set([...s.running, act.gate]) }));
      setCursor("on");
      armAuto(GATE_MS);
      return;
    }
    setSt((s) => {
      const n: State = { ...s, shown: new Set(s.shown), running: new Set(s.running), done: { ...s.done }, edges: new Set(s.edges) };
      if ("show" in act) act.show.forEach((id) => { n.shown.add(id); n.running.add(id); n.done[id] = n.done[id] ?? 0; });
      if ("tick" in act) n.done[act.tick] = (n.done[act.tick] ?? 0) + 1;
      if ("finish" in act) act.finish.forEach((id) => n.running.delete(id));
      if ("edge" in act) act.edge.forEach((e) => n.edges.add(e));
      return n;
    });
    schedule(nextDelay(r.idx));
  }

  const approve = (byVisitor = true) => {
    const r = run.current;
    clearTimeout(r.auto); r.auto = 0;
    setCursor(byVisitor ? "off" : "leave");
    clock.current.gate = false; syncClock();
    setSt((s) => {
      const running = new Set(s.running);
      nodes.filter((n) => n.kind === "gate").forEach((n) => running.delete(n.id));
      return { ...s, gate: "approved", running };
    });
    schedule(nextDelay(r.idx));
  };
  const hold = () => {
    const r = run.current;
    clearTimeout(r.auto); r.auto = 0;
    r.phase = "held";
    setCursor("off");
    setSt((s) => ({ ...s, gate: "held" }));
  };
  const replay = () => {
    clear();
    setCursor("off");
    run.current = { idx: 0, timer: 0, dueAt: 0, remaining: 0, phase: "idle", auto: 0, autoDue: 0, autoLeft: 0 };
    clock.current = { ...clock.current, start: performance.now(), pausedAt: 0, paused: 0, running: true, gate: false };
    syncClock();
    setSt(emptyState());
    cb.current.onProgress?.(0);
    schedule(nextDelay(0));
  };

  // visitor pause / play: freeze the run exactly where it is
  const setUserPaused = (p: boolean) => {
    const r = run.current, c = clock.current;
    if (c.user === p) return;
    c.user = p; syncClock();
    const now = performance.now();
    if (p) {
      if (r.timer) { clearTimeout(r.timer); r.timer = 0; r.remaining = Math.max(0, r.dueAt - now); }
      if (r.auto) { clearTimeout(r.auto); r.auto = 0; r.autoLeft = Math.max(0, r.autoDue - now); }
    } else {
      if (r.phase === "playing" && !r.timer) { r.dueAt = now + r.remaining; r.timer = window.setTimeout(exec, r.remaining); }
      if (r.phase === "gate" && !r.auto) armAuto(r.autoLeft || GATE_MS);
    }
  };
  useEffect(() => {
    setUserPaused(!!paused);
    // the travelling dots on the wires freeze too
    const svg = svgRef.current;
    if (svg) { if (paused) svg.pauseAnimations(); else svg.unpauseAnimations(); }
  }, [paused]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduce) { setSt(finalState(nodes, edges)); return; }
    if (active) replay();
    else { clear(); setCursor("off"); clock.current.running = false; setSt(idle === "empty" ? emptyState() : finalState(nodes, edges)); }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Advocate cursor. Its timeline is the gate's own auto-approve timer, so pausing freezes it.
  // It behaves like a person: comes in, reads down the note, eases over to Approve (a little overshoot and
  // correction), settles, clicks quickly, lingers, then drifts off. A small wander keeps it from looking scripted.
  useEffect(() => {
    if (cursor === "off") return;
    const el = curRef.current, w = wrap.current;
    if (!el || !w) return;
    const arrow = el.querySelector<HTMLElement>(".wf-cur-arrow")!, tag = el.querySelector<HTMLElement>(".wf-cur-tag")!;
    const t0 = performance.now();
    const mj = (v: number) => { const c = clamp01(v); return c * c * c * (10 - 15 * c + 6 * c * c); };   // minimum-jerk, like a hand
    const lerp = (p: { x: number; y: number }, q: { x: number; y: number }, k: number) => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });
    let raf = 0, last = t0, lx = NaN, ly = NaN;
    const at = curAt.current;
    let pts: Record<string, { x: number; y: number }> | null = null;
    const measurePts = () => {
      const btn = w.querySelector<HTMLElement>("[data-approve]"), gate = btn?.closest(".wf-node") as HTMLElement | null;
      const note = gate?.querySelector<HTMLElement>(".pv-snip");
      if (!btn || !gate || !note) return null;
      const wr = w.getBoundingClientRect(), b = btn.getBoundingClientRect(), g = gate.getBoundingClientRect(), n = note.getBoundingClientRect();
      const X = (v: number) => v - wr.left, Y = (v: number) => v - wr.top;
      return {
        enter: { x: X(g.right) + 90, y: Y(g.bottom) + 70 },
        read0: { x: X(n.left) + n.width * 0.22, y: Y(n.top) + n.height * 0.35 },
        read1: { x: X(n.left) + n.width * 0.78, y: Y(n.top) + n.height * 0.8 },
        btn: { x: X(b.left) + b.width * 0.52, y: Y(b.top) + b.height * 0.58 },
      };
    };
    const tick = (now: number) => {
      const r = run.current, dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!pts) pts = measurePts();
      if (!pts) { raf = requestAnimationFrame(tick); return; }
      const P = pts, sec = (now - t0) / 1000;
      let p: { x: number; y: number }, alpha = 1, press = 0, hover = false, down = false;
      if (cursor === "on") {
        const left = r.auto ? r.autoDue - now : r.autoLeft;
        const ms = GATE_MS - left;                                   // elapsed on the gate's clock (frozen while paused)
        // phases (ms): come in 0–900 · read 900–2300 · to the button 2300–3300 · settle 3300–GATE_MS-140 · press
        if (ms < 900) { p = lerp(P.enter, P.read0, mj(ms / 900)); alpha = clamp01(ms / 300); }
        else if (ms < 2300) {
          const k = (ms - 900) / 1400;
          p = lerp(P.read0, P.read1, k * k * (3 - 2 * k));
          p.y += Math.sin(k * Math.PI * 2) * 3;                      // following the two lines of text
        } else if (ms < 3300) {
          const k = mj((ms - 2300) / 1000);
          const ov = 1 + 0.06 * Math.sin(clamp01((ms - 2700) / 600) * Math.PI); // overshoot a touch, then correct
          p = lerp(P.read1, P.btn, Math.min(k * ov, 1.06));
          hover = k > 0.8;
        } else { p = { ...P.btn }; hover = true; }
        const pressK = clamp01((ms - (GATE_MS - 140)) / 140);
        press = Math.sin(pressK * Math.PI); down = pressK > 0;
        at.x = p.x; at.y = p.y;
      } else {
        // after the click: rest for a beat, then drift away down-right and fade
        const k = clamp01((sec - 0.35) / 0.9);
        p = { x: at.x + 34 * mj(k), y: at.y + 26 * mj(k) };
        alpha = 1 - mj(k);
        press = Math.sin(clamp01(sec / 0.12) * Math.PI) * (sec < 0.12 ? 1 : 0);
      }
      // a hand never holds perfectly still
      const wx = Math.sin(sec * 1.7) * 1.2 + Math.sin(sec * 3.1 + 1) * 0.6, wy = Math.cos(sec * 1.3) * 1.0 + Math.sin(sec * 2.6) * 0.5;
      const x = p.x + wx * (1 - press), y = p.y + wy * (1 - press);
      const btn = w.querySelector<HTMLElement>("[data-approve]");
      btn?.classList.toggle("is-hover", hover);
      btn?.classList.toggle("is-press", down && cursor === "on");
      if (Number.isNaN(lx)) { lx = x; ly = y; }
      const f = 1 - Math.exp(-dt / 0.11);
      lx += (x - lx) * f; ly += (y - ly) * f;
      el.style.opacity = String(alpha);
      arrow.style.transform = `translate(${x}px, ${y}px) scale(${1 - 0.12 * press})`;
      tag.style.transform = `translate(${lx + 16}px, ${ly + 22}px)`;
      if (cursor === "leave" && sec > 1.35) { setCursor("off"); return; }
      raf = requestAnimationFrame(tick);
    };
    const ro = new ResizeObserver(() => { pts = null; });
    ro.observe(w);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); w.querySelector("[data-approve]")?.classList.remove("is-hover", "is-press"); };
  }, [cursor]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ASCII spinner while anything runs
  const anyRunning = st.running.size > 0;
  useEffect(() => {
    if (!anyRunning || paused) return;
    const id = window.setInterval(() => setSpin((v) => (v + 1) % SPIN.length), 110);
    return () => clearInterval(id);
  }, [anyRunning, paused]);

  return (
    <div className={`wf${paused ? " paused" : ""}`} ref={wrap} style={{ height }} role="img" aria-label={label}>
      <svg className="wf-edges" aria-hidden="true" ref={svgRef}>
        {wires.map((w, i) => {
          // a wire only exists once the node it starts from has appeared;
          // each end's port shows with its own node
          const fromShown = st.shown.has(edges[i][0]);
          const toShown = st.shown.has(edges[i][2]);
          return (
          <g key={i} className={`k-${w.kind}${st.edges.has(i) ? " on" : ""}${fromShown ? " live" : ""}`}>
            <path className="wf-rail" d={w.d} />
            <path className="wf-line" d={w.d} pathLength={1} />
            {st.edges.has(i) && !reduce && (
              <circle className="wf-dot" r="3">
                <animateMotion dur="2.4s" repeatCount="indefinite" path={w.d} begin={`${(i % 3) * 0.45}s`} />
              </circle>
            )}
            <circle className={`wf-port${fromShown ? " shown" : ""}`} cx={w.a[0]} cy={w.a[1]} r="4" />
            <circle className={`wf-port${toShown ? " shown" : ""}`} cx={w.b[0]} cy={w.b[1]} r="4" />
          </g>
          );
        })}
      </svg>

      {nodes.map((n) => {
        const shown = st.shown.has(n.id);
        const running = st.running.has(n.id);
        const done = st.done[n.id] ?? 0;
        const isGate = n.kind === "gate";
        const gateLabel = st.gate === "waiting" ? "Waiting" : st.gate === "held" ? "On hold" : shown ? "Approved" : "";
        return (
          <div
            key={n.id}
            ref={(el) => { nodeEls.current[n.id] = el; }}
            className={`wf-node k-${n.kind}${shown ? " shown" : ""}${running ? " running" : ""}${n.compact ? " compact" : ""}`}
            style={{ left: `${n.x}%`, top: n.y, width: `${n.w}%` }}
          >
            <span className="wf-role">{ROLE[n.kind]}</span>
            <div className="wf-head">
              <span className="wf-ico">{n.file
                ? <FileGlyph name={n.file} />
                : <NodeIcon name={n.icon} shown={shown} running={running || (isGate && st.gate === "waiting")} />}</span>
              <span className="wf-ht">
                <span className="wf-type">{n.type}</span>
                <span className="wf-title">{n.title}</span>
              </span>
              {isGate
                ? gateLabel && <span className={`wf-pill gate gate-${st.gate}`}>{gateLabel}</span>
                : shown && <TimePill time={n.time} running={running} paused={paused} />}
            </div>
            {n.body && <div className="wf-body">{n.body}</div>}
            {n.items && (
              <ul className="wf-items">
                {n.items.map((it, i) => {
                  const state = i < done ? "done" : running && i === done ? "run" : "";
                  const mark = state === "done" ? "✓" : state === "run" ? SPIN[spin] : "·";
                  return (
                    <li key={i} className={`${state}${it.tone ? " t-" + it.tone : ""}`}>
                      <span className="wf-mark">{mark}</span>
                      <span>{it.text}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {isGate && shown && (
              // one fixed slot: the buttons and the record cross-fade in place, so the node never changes height
              <div className={`wf-gate g-${st.gate}`}>
                <div className="wf-gate-btns" aria-hidden={st.gate !== "waiting" && st.gate !== "idle"}>
                  <button type="button" className="wf-btn" data-approve disabled={st.gate !== "waiting"} onClick={() => approve(true)}>Approve</button>
                  <button type="button" className="wf-btn line" disabled={st.gate !== "waiting"} onClick={hold}>Hold</button>
                </div>
                <p className="wf-record">{st.gate === "held"
                  ? <>‖ On hold · the run waits <button type="button" onClick={replay}>replay</button></>
                  : <>✓ Approved by {approver} · recorded</>}</p>
              </div>
            )}
            {n.meta && <p className="wf-meta">{n.meta}</p>}
          </div>
        );
      })}
      {cursor !== "off" && (
        <div className={`wf-cur${cursor === "leave" ? " leave" : ""}`} ref={curRef} aria-hidden="true">
          <span className="wf-cur-arrow">
            <svg viewBox="0 0 20 22"><path d="M2.5 2.2 17.2 9.4l-6.4 1.9-3 6.3z" /></svg>
            <i className="wf-cur-ring" />
          </span>
          <span className="wf-cur-tag">Advocate</span>
        </div>
      )}
    </div>
  );
}
