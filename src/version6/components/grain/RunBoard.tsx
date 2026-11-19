// The runs board (v4, round 2): a small stage where the runs are physically moved between lanes.
//   · Nia flies to a run, picks it up and carries it to its next lane; when it lands she is happy (^ ^ and a burst
//     of the logo's square dots), and when a run is done she gets heart eyes.
//   · Decisions are a person's: the "Advocate" hand cursor grabs a run out of "Needs you" and drags it to review.
//   · The visitor can do it too: drag a run out of "Needs you" (or press Approve). Nia thanks you with hearts.
//   · Hover Nia for love, click her for a spin.
// Cards are absolutely positioned from lane/slot geometry so they can travel between lanes; the actors move
// with the same duration and easing as the card they carry, so they move as one.
// Look (v6, after orchestrator.inc): a dark app window (title bar, a sidebar with the live list of runs and the
// fleets as filters, four hairline-divided columns with status dots, quiet dark cards with a coloured status foot).
import { useCallback, useEffect, useMemo, useRef, useState, type ForwardRefExoticComponent, type PointerEvent as RPointerEvent, type ReactNode, type RefAttributes } from "react";
import { SearchIcon } from "@/version6/components/ui/search";
import { ZapIcon } from "@/version6/components/ui/zap";
import { BoxIcon } from "@/version6/components/ui/box";
import { GaugeIcon } from "@/version6/components/ui/gauge";
import { PanelLeftOpenIcon } from "@/version6/components/ui/panel-left-open";
import { PlusIcon } from "@/version6/components/ui/plus";
import { BellIcon } from "@/version6/components/ui/bell";
import { SettingsIcon } from "@/version6/components/ui/settings";
import { LoaderPinwheelIcon } from "@/version6/components/ui/loader-pinwheel";
import { BadgeAlertIcon } from "@/version6/components/ui/badge-alert";
import { EyeIcon } from "@/version6/components/ui/eye";
import { CircleCheckIcon } from "@/version6/components/ui/circle-check";
import { ReceiptTextIcon } from "@/version6/components/ui/receipt-text";
import { GavelIcon } from "@/version6/components/ui/gavel";
import { BoxesIcon } from "@/version6/components/ui/boxes";
import { FileTextIcon } from "@/version6/components/ui/file-text";
import { ArchiveIcon } from "@/version6/components/ui/archive";
import Nia, { type NiaMood } from "./Nia";
import GrainMark from "./GrainMark";
import "./run-board.css";

type Lane = 0 | 1 | 2 | 3;
const LANES = [
  { id: "run", name: "Running" },
  { id: "need", name: "Needs you" },
  { id: "review", name: "In review" },
  { id: "done", name: "Done" },
] as const;

// icons: lucide-animated (motion), driven from here. Each plays when its row is hovered (`hot`), once when it appears
// (`once`: a run landing in a lane), or on a loop (`loop`: the Running spinner).
type Anim = { startAnimation: () => void; stopAnimation: () => void };
type IconC = ForwardRefExoticComponent<{ size?: number; className?: string } & RefAttributes<Anim>>;
function AI({ I, size = 16, className = "", hot = false, once = false, loop = false }: { I: IconC; size?: number; className?: string; hot?: boolean; once?: boolean; loop?: boolean }) {
  const r = useRef<Anim>(null);
  useEffect(() => {
    if (!once) return;
    r.current?.startAnimation();
    const t = setTimeout(() => r.current?.stopAnimation(), 1100);
    return () => clearTimeout(t);
  }, [once]);
  useEffect(() => { if (loop || hot) r.current?.startAnimation(); else if (!once) r.current?.stopAnimation(); }, [loop, hot, once]);
  return <I ref={r} size={size} className={`rb-ic ${className}`} aria-hidden="true" />;
}
/** a row (nav item, button) whose icon plays while it's hovered */
function Hot({ as: Tag = "li", I, size, className, children, iconClass }: { as?: "li" | "span" | "div"; I: IconC; size?: number; className?: string; iconClass?: string; children?: ReactNode }) {
  const [hot, setHot] = useState(false);
  return <Tag className={className} onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)}><AI I={I} size={size} hot={hot} className={iconClass} />{children}</Tag>;
}
const STATUS: IconC[] = [LoaderPinwheelIcon, BadgeAlertIcon, EyeIcon, CircleCheckIcon];
const GROUP_ICON: IconC[] = [ReceiptTextIcon, GavelIcon, BoxesIcon];
/** Approve: the check draws itself while hovered */
function ApproveBtn({ onApprove }: { onApprove: () => void }) {
  const [hot, setHot] = useState(false);
  return (
    <button type="button" className="rb-ok-btn" onPointerDown={(e) => e.stopPropagation()} onClick={onApprove}
      onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)} onFocus={() => setHot(true)} onBlur={() => setHot(false)}>
      <AI I={CircleCheckIcon} size={13} hot={hot} />Approve
    </button>
  );
}
const Chev = () => <svg viewBox="0 0 24 24" className="rb-chev" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;

type Group = "Finance & claims" | "Legal & contracts" | "Operations";
type Run = {
  id: string; title: string; group: Group; steps: number;
  run: string; need: string | null; review: string; done: string;
  who?: string;          // who a decision waits on (initials)
  srcs: number;          // sources attached by review
  saved: string;         // time saved, shown when done
};
const RUNS: Run[] = [
  { id: "bill", title: "Patient bill advocacy", group: "Finance & claims", steps: 6, run: "Reading the bill and EOB", need: "Approve the appeal letter", who: "DR", review: "Appeal checked against the EOB", srcs: 6, done: "Appeal sent", saved: "3h 20m" },
  { id: "price", title: "Contract-price audit", group: "Operations", steps: 5, run: "Checking 312 invoice lines", need: null, review: "4 overcharges, each with its line", srcs: 4, done: "Credit request sent", saved: "5h" },
  { id: "warranty", title: "Warranty claim recovery", group: "Operations", steps: 5, run: "Matching the repair order", need: "Approve the claim packet", who: "MK", review: "Window closes in 9 days", srcs: 5, done: "Claim filed", saved: "1h 40m" },
  { id: "lien", title: "Lien waiver exchange", group: "Legal & contracts", steps: 4, run: "Chasing two subcontractors", need: null, review: "Waivers match the pay app", srcs: 7, done: "Pay cycle closed", saved: "2h 10m" },
  { id: "fine", title: "Retailer fine recovery", group: "Finance & claims", steps: 5, run: "Rebuilding the shipment timeline", need: "Approve the dispute", who: "JS", review: "Proof of delivery attached", srcs: 3, done: "Dispute filed", saved: "2h 45m" },
  { id: "dd", title: "Demurrage dispute", group: "Finance & claims", steps: 4, run: "Recomputing free time", need: null, review: "2 charges void, math attached", srcs: 4, done: "Dispute filed", saved: "1h 15m" },
  { id: "franchise", title: "Franchise agreement", group: "Legal & contracts", steps: 6, run: "Assembling state addenda", need: "Approve the final packet", who: "AL", review: "Compliant in 3 states", srcs: 9, done: "Packet sent to counsel", saved: "6h" },
  { id: "incident", title: "Incident notification matrix", group: "Legal & contracts", steps: 5, run: "Mapping 50 state deadlines", need: "Approve the notice wording", who: "PV", review: "GDPR 72h clock tracked", srcs: 8, done: "Notices scheduled", saved: "4h 30m" },
  { id: "vendor", title: "Vendor onboarding", group: "Operations", steps: 4, run: "Collecting the W-9 and COI", need: null, review: "Insurance limits verified", srcs: 3, done: "Vendor approved", saved: "50m" },
  { id: "charge", title: "Chargeback response", group: "Finance & claims", steps: 4, run: "Pulling order and delivery logs", need: null, review: "Evidence bundle complete", srcs: 5, done: "Response submitted", saved: "1h 05m" },
];
const GROUPS: Group[] = ["Finance & claims", "Legal & contracts", "Operations"];
const BY_ID = Object.fromEntries(RUNS.map((r) => [r.id, r]));
const START: [string, Lane][] = [
  ["price", 0], ["dd", 0], ["franchise", 0],
  ["bill", 1], ["incident", 1],
  ["warranty", 2], ["lien", 2], ["vendor", 2],
  ["fine", 3], ["charge", 3],
];
const AGO = ["just now", "1m ago", "3m ago", "6m ago", "12m ago", "25m ago"];

// geometry (px, inside the board)
const PAD = 0, GAP = 0, INSET = 14, HEAD = 62, CARD_H = 136, CGAP = 10, MAX_IN_LANE = 4;
const BOARD_H = HEAD + MAX_IN_LANE * (CARD_H + CGAP) + 8;

type Card = { id: string; lane: Lane; seq: number };
type Pos = { x: number; y: number };
type Held = Pos & { id: string; dur: number; by: "nia" | "hand" | "you" };
type Bit = { id: number; kind: "heart" | "dot"; x: number; y: number; dx: number; dy: number; c: string; s: number };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const LOGO = ["#C85636", "#E27A5F", "#F0BFA7"];
const inLane = (cs: Card[], l: Lane) => cs.filter((c) => c.lane === l).sort((a, b) => a.seq - b.seq);

export type BoardEvent = "placed" | "card" | "needs";

export default function RunBoard({ onEvent }: { onEvent?: (e: BoardEvent) => void }) {
  const inner = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1100);
  const [cards, setCards] = useState<Card[]>(() => START.map(([id, lane], i) => ({ id, lane, seq: i })));
  const cardsRef = useRef(cards);
  const seq = useRef(START.length);
  const [held, setHeld] = useState<Held | null>(null);
  const heldRef = useRef(held);
  const [nia, setNia] = useState({ x: 0, y: -44, dur: 0, mood: "idle" as NiaMood, tilt: 0, spin: 0 });
  const [hand, setHand] = useState({ x: 0, y: 0, dur: 0, grab: false, on: false });
  const [bits, setBits] = useState<Bit[]>([]);
  const bitId = useRef(0);
  const userBusy = useRef(false);
  const waited = useRef<Record<string, number>>({});
  const turn = useRef(0);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<Group | "all">("all");
  const emit = useRef(onEvent);
  useEffect(() => { cardsRef.current = cards; heldRef.current = held; emit.current = onEvent; });

  // ── geometry
  const laneW = (W - PAD * 2 - GAP * 3) / 4;
  const cardW = laneW - INSET * 2;
  const laneX = useCallback((l: number) => PAD + l * (laneW + GAP), [laneW]);
  const slot = useCallback((l: number, k: number): Pos => ({ x: laneX(l) + INSET, y: HEAD + k * (CARD_H + CGAP) }), [laneX]);
  const posOf = useCallback((cs: Card[], id: string): Pos => {
    const c = cs.find((x) => x.id === id)!;
    return slot(c.lane, inLane(cs, c.lane).findIndex((x) => x.id === id));
  }, [slot]);
  const niaOn = useCallback((p: Pos) => ({ x: p.x + cardW - 40, y: p.y - 40 }), [cardW]);     // on the card's top-right corner
  const handOn = useCallback((p: Pos) => ({ x: p.x + cardW * 0.46, y: p.y + 30 }), [cardW]);  // fingers on the card

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);
  // Nia waits at home, peeking over the board's top edge above "Done"
  const homeSet = useRef(false);
  useEffect(() => {
    if (homeSet.current || W < 200) return;
    homeSet.current = true;
    setNia((n) => ({ ...n, x: W - 84, y: -46 }));
  }, [W]);

  // ── little effects: hearts and the logo's square dots
  const burst = useCallback((at: Pos, kind: "heart" | "dot", n: number) => {
    const add: Bit[] = Array.from({ length: n }, (_, k) => {
      const a = kind === "heart" ? -Math.PI / 2 + (k - (n - 1) / 2) * 0.45 : (k / n) * Math.PI * 2;
      const r = (kind === "heart" ? 40 : 36) + Math.random() * 16;
      return {
        id: ++bitId.current, kind, x: at.x, y: at.y, dx: Math.cos(a) * r, dy: Math.sin(a) * r - (kind === "heart" ? 12 : 0),
        c: LOGO[k % 3], s: kind === "heart" ? 12 + Math.random() * 5 : 5 + Math.random() * 4,
      };
    });
    setBits((b) => [...b, ...add]);
    const ids = new Set(add.map((x) => x.id));
    setTimeout(() => setBits((b) => b.filter((x) => !ids.has(x.id))), 1300);
  }, []);
  const centre = (p: Pos) => ({ x: p.x + 30, y: p.y + 26 });

  const commit = useCallback((id: string, to: Lane) => {
    seq.current += 1;
    const s = seq.current;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, lane: to, seq: s } : c)));
    waited.current[id] = 0;
  }, []);

  // ── the director: one move at a time, while the board is on screen
  useEffect(() => {
    if (!live || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const wait = async (ms: number) => { await sleep(ms); while (alive && userBusy.current) await sleep(200); return alive; };

    const niaMove = async (id: string, to: Lane) => {
      const cs = cardsRef.current;
      const from = posOf(cs, id);
      const target = slot(to, inLane(cs, to).length);
      emit.current?.("placed");
      const a = niaOn(from), b = niaOn(target);
      setNia((n) => ({ ...n, ...a, dur: 720, mood: "work", tilt: Math.sign(a.x - n.x) * 10 }));
      if (!(await wait(780)) || heldRef.current) return;
      setHeld({ id, ...from, dur: 0, by: "nia" });
      if (!(await wait(240))) return;
      setNia((n) => ({ ...n, ...b, dur: 980, tilt: Math.sign(target.x - from.x) * 12 }));
      setHeld({ id, ...target, dur: 980, by: "nia" });
      if (!(await wait(1020))) return;
      commit(id, to);
      setHeld(null);
      const done = to === 3;
      setNia((n) => ({ ...n, dur: 300, mood: done ? "love" : "happy", tilt: 0 }));
      burst(centre(b), done ? "heart" : "dot", done ? 5 : 8);
      if (to === 1) emit.current?.("needs");
      if (!(await wait(1100))) return;
      setNia((n) => ({ ...n, mood: "idle" }));
    };

    const handApprove = async (id: string) => {
      const cs = cardsRef.current;
      const from = posOf(cs, id);
      const target = slot(2, inLane(cs, 2).length);
      emit.current?.("needs");
      setHand({ x: W + 30, y: BOARD_H - 30, dur: 0, grab: false, on: true });
      if (!(await wait(60))) return;
      setHand((h) => ({ ...h, ...handOn(from), dur: 820 }));
      if (!(await wait(880))) return;
      if (heldRef.current) { setHand((h) => ({ ...h, on: false })); return; }
      setHand((h) => ({ ...h, grab: true }));
      setHeld({ id, ...from, dur: 0, by: "hand" });
      if (!(await wait(260))) return;
      setHand((h) => ({ ...h, ...handOn(target), dur: 960 }));
      setHeld({ id, ...target, dur: 960, by: "hand" });
      if (!(await wait(1000))) return;
      commit(id, 2);
      setHeld(null);
      setHand((h) => ({ ...h, grab: false }));
      setNia((n) => { burst(centre(n), "heart", 4); return { ...n, mood: "love", dur: 300 }; });   // Nia is grateful
      if (!(await wait(380))) return;
      setHand((h) => ({ ...h, x: W + 30, y: h.y + 60, dur: 700 }));
      if (!(await wait(800))) return;
      setHand((h) => ({ ...h, on: false }));
      setNia((n) => ({ ...n, mood: "idle" }));
    };

    (async () => {
      if (!(await wait(700))) return;
      while (alive) {
        const cs = cardsRef.current;
        // a decision that has waited a while: the advocate takes it
        const needs = inLane(cs, 1);
        needs.forEach((c) => { waited.current[c.id] = (waited.current[c.id] ?? 0) + 1; });
        const due = needs.find((c) => waited.current[c.id] > 2);
        if (due && inLane(cs, 2).length < MAX_IN_LANE) await handApprove(due.id);
        else {
          // otherwise Nia moves the next run in turn (never into a full lane, never one waiting on a person)
          for (let k = 0; k < RUNS.length; k++) {
            const r = RUNS[(turn.current + k) % RUNS.length];
            const c = cs.find((x) => x.id === r.id)!;
            if (c.lane === 1) continue;
            const to = (c.lane === 0 ? (r.need ? 1 : 2) : c.lane === 2 ? 3 : 0) as Lane;
            if (inLane(cs, to).length >= MAX_IN_LANE) continue;
            turn.current = (turn.current + k + 1) % RUNS.length;
            await niaMove(r.id, to);
            break;
          }
        }
        if (!(await wait(700))) return;
      }
    })();
    return () => { alive = false; };
  }, [live, posOf, slot, commit, burst, niaOn, handOn, W]);

  // ── the visitor can drag a decision across
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const local = (e: RPointerEvent) => { const r = inner.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: RPointerEvent, id: string) => {
    if (heldRef.current) return;
    const p = posOf(cardsRef.current, id), m = local(e);
    drag.current = { id, dx: m.x - p.x, dy: m.y - p.y };
    userBusy.current = true;
    inner.current?.setPointerCapture(e.pointerId);
    setHeld({ id, ...p, dur: 0, by: "you" });
    emit.current?.("needs");
  };
  const onMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const m = local(e);
    setHeld({ id: d.id, x: m.x - d.dx, y: m.y - d.dy, dur: 0, by: "you" });
  };
  const approveByYou = (id: string) => {
    userBusy.current = true;
    const target = slot(2, inLane(cardsRef.current, 2).length);
    setHeld({ id, ...target, dur: 420, by: "you" });
    setTimeout(() => {
      commit(id, 2); setHeld(null); userBusy.current = false;
      setNia((n) => { burst(centre(n), "heart", 6); return { ...n, mood: "love", spin: n.spin + 1 }; });
      setTimeout(() => setNia((n) => ({ ...n, mood: "idle" })), 1400);
    }, 440);
  };
  const onUp = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const m = local(e);
    if (m.x > laneX(2) - 20 && inLane(cardsRef.current, 2).length < MAX_IN_LANE) approveByYou(d.id);
    else { setHeld(null); userBusy.current = false; }
  };

  // ── Nia's own reactions
  const lastLove = useRef(0);
  const loveNia = () => {
    if (heldRef.current?.by === "nia" || performance.now() - lastLove.current < 1200) return;
    lastLove.current = performance.now();
    setNia((n) => { burst(centre(n), "heart", 3); return { ...n, mood: "love" }; });
    setTimeout(() => setNia((n) => (n.mood === "love" ? { ...n, mood: "idle" } : n)), 1300);
  };
  const spinNia = () => {
    if (heldRef.current?.by === "nia") return;
    setNia((n) => { burst(centre(n), "dot", 10); return { ...n, mood: "happy", spin: n.spin + 1 }; });
    setTimeout(() => setNia((n) => (n.mood === "happy" ? { ...n, mood: "idle" } : n)), 1100);
  };

  const counts = useMemo(() => [0, 1, 2, 3].map((l) => cards.filter((c) => c.lane === l).length), [cards]);
  // the sidebar's run list: most recently moved first, each with its lane's status glyph
  const recent = useMemo(() => [...cards].sort((a, b) => b.seq - a.seq), [cards]);
  const latest = held ? BY_ID[held.id] : BY_ID[recent[0].id];

  return (
    <div className="rb" role="region" aria-label="Example board of runs">
      <div className="rb-bar-top">
        <span className="rb-lights" aria-hidden="true"><i /><i /><i /></span>
        <Hot as="span" I={PanelLeftOpenIcon} className="rb-tool rb-dim" />
        <span className="rb-app"><GrainMark />Grain</span>
        <span className="rb-crumb">Board</span>
        <span className="rb-now" aria-live="off"><Nia size={16} working />{latest.title}</span>
        <Hot as="span" I={PlusIcon} size={14} className="rb-new">Run</Hot>
        <Hot as="span" I={BellIcon} size={17} className="rb-tool rb-dim rb-bell" />
      </div>
      <div className="rb-body">
        <aside className="rb-side" aria-label="Board navigation">
          <ul className="rb-nav">
            <Hot I={SearchIcon}>Search<kbd>⌘K</kbd></Hot>
            <Hot I={ZapIcon}>Automations</Hot>
            <Hot I={BoxIcon}>Packets</Hot>
            <Hot I={GaugeIcon}>Usage</Hot>
          </ul>
          <p className="rb-sh">Runs <Chev /></p>
          <ul className="rb-runs">
            {recent.slice(0, 7).map((c) => (
              <li key={c.id} className={`l-${LANES[c.lane].id}`}>
                <AI key={c.lane} I={STATUS[c.lane]} size={15} className="rb-st" loop={c.lane === 0} once={c.lane !== 0} />
                <span>{BY_ID[c.id].title}</span>
                <small>{AGO[(c.seq + c.id.length) % AGO.length].replace(" ago", "").replace("just now", "now")}</small>
              </li>
            ))}
          </ul>
          <p className="rb-sh">Fleets</p>
          <div className="rb-fleets" role="group" aria-label="Filter runs by fleet">
            {(["all", ...GROUPS] as const).map((g, k) => (
              <button key={g} type="button" aria-pressed={filter === g} onClick={() => setFilter(g)}>
                <i className={`rb-ft g${k - 1}`}>{g === "all" ? "A" : g[0]}</i>
                {g === "all" ? "All runs" : g}
                <span>{g === "all" ? cards.length : cards.filter((c) => BY_ID[c.id].group === g).length}</span>
              </button>
            ))}
          </div>
          <Hot as="div" I={SettingsIcon} className="rb-me" iconClass="rb-dim rb-gear"><i>DR</i>Dana Reyes</Hot>
        </aside>

        <div className="rb-main">
          <div className="rb-scroll">
            <div className="rb-inner" ref={inner} style={{ height: BOARD_H }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <i className="rb-headline" aria-hidden="true" />
              {LANES.map((l, i) => (
                <div key={l.id} className={`rb-lane l-${l.id}${held?.by === "you" && i === 2 ? " drop" : ""}`} style={{ left: laneX(i), width: laneW }}>
                  <div className="rb-lh">
                    <i className="rb-dot" aria-hidden="true" />
                    <span className="rb-ln">{l.name}</span>
                    <span className="rb-n">{counts[i]}</span>
                  </div>
                </div>
              ))}

              {cards.map((c) => {
                const r = BY_ID[c.id];
                const isHeld = held?.id === c.id;
                const p = isHeld && held ? held : posOf(cards, c.id);
                const dur = isHeld && held ? held.dur : 520;
                const text = c.lane === 0 ? r.run : c.lane === 1 ? r.need : c.lane === 2 ? r.review : r.done;
                const g = GROUPS.indexOf(r.group);
                return (
                  <div
                    key={c.id}
                    className={`rb-card l-${LANES[c.lane].id}${isHeld && held ? ` held by-${held.by}` : ""}${filter !== "all" && r.group !== filter ? " dim" : ""}`}
                    style={{ width: cardW, height: CARD_H, transform: `translate(${p.x}px, ${p.y}px)`, transitionDuration: `${dur}ms` }}
                    onPointerDown={c.lane === 1 ? (e) => onDown(e, c.id) : undefined}
                    onPointerEnter={() => emit.current?.("card")}
                  >
                    <div className="rb-ci">
                      <div className="rb-head">
                        <i className={`rb-gi g${g}`}><AI I={GROUP_ICON[g]} size={14} /></i>
                        <p className="rb-ct">{r.title}</p>
                      </div>
                      <div className="rb-cs"><AI I={FileTextIcon} size={13} className="rb-doc" />{text}</div>
                      <div className="rb-cf">
                        {c.lane === 0 && <>
                          <div className="rb-stat"><AI I={LoaderPinwheelIcon} size={13} loop />Step {2 + (c.id.length % (r.steps - 2))}/{r.steps}</div>
                          <span className="rb-bar" style={{ ["--dl" as string]: `${(c.id.length % 5) * -0.9}s` }}><i /></span>
                        </>}
                        {c.lane === 1 && <>
                          <div className="rb-stat">Waiting on <b className="rb-av">{r.who}</b></div>
                          <ApproveBtn onApprove={() => !heldRef.current && approveByYou(c.id)} />
                        </>}
                        {c.lane === 2 && <>
                          <div className="rb-stat">{r.srcs} sources checked</div>
                          <span className="rb-srcs" aria-hidden="true">{Array.from({ length: Math.min(4, r.srcs) }, (_, k) => <i key={k} />)}</span>
                        </>}
                        {c.lane === 3 && <div className="rb-stat"><AI I={CircleCheckIcon} size={13} once />Saved {r.saved}</div>}
                        <span className="rb-ago">{AGO[(c.seq + c.id.length) % AGO.length]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          {/* the advocate's hand */}
          <div className={`rb-hand${hand.on ? " on" : ""}${hand.grab ? " grab" : ""}`} style={{ transform: `translate(${hand.x}px, ${hand.y}px)`, transitionDuration: `${hand.dur}ms` }} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              {hand.grab
                ? <><path d="M18 11.5V9a2 2 0 0 0-4 0v1.4" /><path d="M14 10V8a2 2 0 0 0-4 0v2" /><path d="M10 9.9V9a2 2 0 0 0-4 0v5" /><path d="M6 14a2 2 0 0 0-4 0" /><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0" /></>
                : <><path d="M18 11V6a2 2 0 0 0-4 0" /><path d="M14 10V4a2 2 0 0 0-4 0v2" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></>}
            </svg>
            <span className="rb-tag">Advocate</span>
          </div>

          {/* Nia */}
          <button
            type="button"
            className={`rb-nia${held?.by === "nia" ? " carrying" : ""}`}
            style={{ transform: `translate(${nia.x}px, ${nia.y}px)`, transitionDuration: `${nia.dur}ms` }}
            onPointerEnter={loveNia} onClick={spinNia}
            aria-label="Nia, Grain's agent. Click to say hi."
          >
            <span className="rb-nia-tilt" style={{ transform: `rotate(${nia.tilt}deg)` }}>
              <span className={`rb-nia-spin${nia.spin ? " go" : ""}`} key={nia.spin}><Nia size={60} mood={nia.mood} /></span>
            </span>
          </button>

          {bits.map((b) => (
            <i key={b.id} className={`rb-bit ${b.kind}`} aria-hidden="true"
              style={{ left: b.x, top: b.y, ["--dx" as string]: `${b.dx}px`, ["--dy" as string]: `${b.dy}px`, ["--c" as string]: b.c, ["--s" as string]: `${b.s}px` }} />
          ))}
            </div>
          </div>
          <Hot as="div" I={ArchiveIcon} size={15} className="rb-foot">Archived runs <span>20</span><em><b>{counts[1]}</b> need you · <b>{counts[0]}</b> running · <b>{counts[3]}</b> done today</em></Hot>
        </div>
      </div>
    </div>
  );
}
