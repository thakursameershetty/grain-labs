// Nia's stage (v6, the Nia section on wide screens). Nia is an actor here, not a picture: she pops in as a small 3D
// Nia beside "Meet Nia." when the headline shows, looks left and right, then hops down into the stage once it's on
// screen (and back up if you scroll back), then works through three acts, saying what she's doing as she does it:
//   1 · Sort    she hops to the inbox pile, picks up each card, carries it to the right folder and drops it in
//   2 · Draft   she dictates the appeal beside the letter; each citation flies out of the folder it came from
//   3 · Send    she prepares the send and says it needs a human; the Advocate's cursor comes in and clicks Approve
//              (or you do). She's delighted.
// Acts loop while the stage is on screen; the tabs jump to an act. Everything moves on springs/arcs, no linear tweens.
// Case details are illustrative, like the rest of the page.
import { useCallback, useEffect, useRef, useState } from "react";
import Nia3D, { type Expr, type NiaApi } from "@/version6/brand/Nia3D";
import InboxArtifact, { type ArtifactKind } from "./InboxArtifact";
import "./nia-stage.css";

export type NiaAct = 0 | 1 | 2;
const ACTS = ["Sort what came in", "Draft the appeal", "Send it to the payer"];
const SIZE = 150;                      // Nia's canvas on the stage

const ITEMS: { kind: ArtifactKind; t: string; to: number; say: string }[] = [
  { kind: "doc", t: "Plan document", to: 2, say: "And the plan document. That's our rulebook." },
  { kind: "voice", t: "Voicemail from the patient", to: 1, say: "A voicemail from the patient. Into the case notes." },
  { kind: "mail", t: "EOB from the payer", to: 0, say: "The payer's EOB. Same case." },
  { kind: "receipt", t: "Bill from Northside Clinic", to: 0, say: "A bill from Northside Clinic. That's the billing dispute." },
];   // last = top of the pile (picked first)
const FOLDERS = ["Billing dispute", "Case notes", "Rules"];
const LETTER: { text: string; src?: string; from?: number; say: string }[] = [
  { text: "Re: the claim denied for an out-of-network charge.", say: "Starting the appeal." },
  { text: "The visit was an emergency, which the plan covers at the in-network rate", src: "Plan §4.3", from: 2, say: "The plan covers emergencies in-network. Section 4.3." },
  { text: "The EOB lists the provider as out-of-network", src: "EOB p.2", from: 0, say: "But the EOB says out-of-network. Page two." },
  { text: "The bill charges the full out-of-network amount", src: "Bill p.1", from: 0, say: "And the bill charges the full amount." },
  { text: "Please reprocess the claim at the in-network rate.", say: "So: reprocess it at the in-network rate." },
];

type Pt = { x: number; y: number };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export default function NiaStage({ onAct, anchor }: { onAct?: (a: NiaAct) => void; anchor: string }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const actor = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const approveBtn = useRef<HTMLButtonElement>(null);
  const folderEls = useRef<(HTMLDivElement | null)[]>([]);
  const chipEls = useRef<(HTMLElement | null)[]>([]);
  const pileEls = useRef<(HTMLLIElement | null)[]>([]);
  const carryEl = useRef<HTMLDivElement>(null);
  const nia = useRef<NiaApi | null>(null);

  const [act, setAct] = useState<NiaAct>(0);
  const [picked, setPicked] = useState<number[]>([]);           // items off the pile
  const [carry, setCarry] = useState<number | null>(null);      // item in Nia's hands
  const [counts, setCounts] = useState([0, 0, 0]);
  const [bump, setBump] = useState(-1);
  const [openF, setOpenF] = useState(-1);                        // folder with its flap open
  const [fresh, setFresh] = useState(-1);                        // folder whose newest sheet is sliding in
  const [panel, setPanel] = useState<"none" | "doc" | "send">("none");
  const [lines, setLines] = useState(0);
  const [chips, setChips] = useState<number[]>([]);             // letter lines whose source chip has landed
  const [sent, setSent] = useState<null | "Advocate" | "you">(null);
  const [bubble, setBubble] = useState("");
  const [home, setHome] = useState(true);                        // sitting by the headline

  const pos = useRef<Pt & { s: number }>({ x: 0, y: 0, s: 0.45 });
  const run = useRef(0);                                         // bumps to cancel a running script
  const approveNow = useRef<((by: "you") => void) | null>(null);

  useEffect(() => { onAct?.(act); }, [act, onAct]);

  /* ── geometry: stage fractions → coordinates in the root (Nia's positioning box) ── */
  const S = useCallback((fx: number, fy: number, dy = 0): Pt => {
    const r = root.current!.getBoundingClientRect(), s = stage.current!.getBoundingClientRect();
    return { x: s.left - r.left + s.width * fx, y: s.top - r.top + s.height * fy + dy };
  }, []);
  const centreOf = useCallback((el: Element | null | undefined, dx = 0, dy = 0): Pt => {
    const r = root.current!.getBoundingClientRect(), b = el!.getBoundingClientRect();
    return { x: b.left - r.left + b.width / 2 + dx, y: b.top - r.top + b.height / 2 + dy };
  }, []);
  const homeSpot = useCallback(() => {
    const a = document.querySelector(anchor);
    if (!a) return { x: 0, y: 0, s: 0.45 };
    // the seat is a zero-height mark on the text baseline. At scale 1 her front tile is ~84px tall with its bottom
    // edge 42px below her centre, and her body sits ~6px left of centre (the back tile pokes out low-left).
    // Scale her front tile to the height of a capital, and stand that bottom edge on the baseline like a letter.
    const r = root.current!.getBoundingClientRect(), b = a.getBoundingClientRect();
    const font = parseFloat(getComputedStyle(a).fontSize) || 64;
    const sc = Math.max(0.3, (font * 0.8) / 84);
    return { x: b.left - r.left + b.width / 2 + 6 * sc, y: b.bottom - r.top - 42 * sc, s: sc };
  }, [anchor]);
  const place = useCallback((p: Pt & { s: number }) => {
    pos.current = p;
    const el = actor.current;
    if (!el) return;
    el.style.transform = `translate3d(${p.x - SIZE / 2}px, ${p.y - SIZE / 2}px, 0) scale(${p.s})`;
    // on the right half of the stage her speech bubble opens to the left, so it never covers the folders
    const st = stage.current, r = root.current;
    if (st && r) el.classList.toggle("flip", p.x > st.getBoundingClientRect().left - r.getBoundingClientRect().left + st.clientWidth * 0.55);
  }, []);
  const toClient = useCallback((p: Pt) => { const r = root.current!.getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; }, []);

  /** an arc from where she is to `to`, landing with a squash (and a little settle bounce) */
  const hop = useCallback((to: Pt & { s?: number }, ms = 620, h = 70, settle = false) => new Promise<void>((done) => {
    const from = { ...pos.current }, s1 = to.s ?? from.s;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { place({ x: to.x, y: to.y, s: s1 }); done(); return; }
    nia.current?.squash(-0.35);   // a little crouch to push off
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms), e = ease(t);
      place({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - h * 4 * t * (1 - t), s: from.s + (s1 - from.s) * e });
      if (t < 1) { requestAnimationFrame(step); return; }
      nia.current?.squash(0.8);
      if (!settle) { done(); return; }
      // one small bounce where she lands
      const t1 = performance.now(), base = { ...pos.current };
      const b = (n: number) => { const u = Math.min(1, (n - t1) / 360); place({ ...base, y: base.y - 16 * 4 * u * (1 - u) }); if (u < 1) requestAnimationFrame(b); else { nia.current?.squash(0.45); done(); } };
      requestAnimationFrame(b);
    };
    requestAnimationFrame(step);
  }), [place]);

  /** she says something: typed out while her mouth moves */
  const say = useCallback(async (text: string, id: number, expr?: Expr) => {
    if (expr) nia.current?.expr(expr);
    nia.current?.talk(true);
    for (let i = 1; i <= text.length; i++) {
      if (run.current !== id) return;
      setBubble(text.slice(0, i));
      await sleep(text[i - 1] === "." || text[i - 1] === "," ? 120 : 28);
    }
    await sleep(160);
    nia.current?.talk(false);
  }, []);

  /* ── the acts ── */
  const reset = useCallback((a: NiaAct) => {
    setAct(a); setCarry(null); setBump(-1); setSent(null); setBubble("");
    setPicked(a === 0 ? [] : ITEMS.map((_, i) => i));
    setCounts(a === 0 ? [0, 0, 0] : [2, 1, 1]);
    setPanel(a === 1 ? "doc" : a === 2 ? "send" : "none");
    setLines(0); setChips([]);
    if (cursor.current) cursor.current.style.opacity = "0";
  }, []);

  const play = useCallback(async (start: NiaAct) => {
    const id = ++run.current;
    const alive = () => run.current === id;
    let a = start;
    reset(a);
    while (alive()) {
      if (a === 0) {
        nia.current?.gaze(null);
        await hop({ ...S(0.5, 0.52), s: 1 }, 560, 50);
        await say("Four new things came in. Let me sort them.", id, "happy");
        await sleep(300);
        for (let k = ITEMS.length - 1; k >= 0 && alive(); k--) {
          const it = ITEMS[k], card = pileEls.current[k];
          nia.current?.expr("focus");
          if (card) nia.current?.gaze(toClient(centreOf(card)));
          // land just above the top edge of whatever it is (a tall page, a slim voice note…)
          const ch = card?.getBoundingClientRect().height ?? 60;
          await hop({ ...centreOf(card, 0, -ch / 2 - 48), s: 1 }, 520, 60);
          if (!alive()) break;
          setPicked((p) => [...p, k]); setCarry(k);
          const f = folderEls.current[it.to], icon = f?.querySelector(".nf-icon") ?? f;
          nia.current?.gaze(icon ? toClient(centreOf(icon)) : null);
          nia.current?.expr("idle");
          const talking = say(it.say, id);
          // she lands right beside the folder icon, at its height, so the card goes from her hands straight in
          await hop({ ...centreOf(icon, -118, 8), s: 1 }, 680, 80);
          if (!alive()) break;
          await fileInto(it.to);
          nia.current?.expr("happy", 500);
          await talking;
          await sleep(250);
        }
        if (!alive()) break;
        nia.current?.gaze(null);
        await say("All sorted. Now the appeal.", id, "wink");
        await sleep(900);
        a = 1; setAct(1);
      } else if (a === 1) {
        setPanel("doc"); setLines(0); setChips([]);
        await hop({ ...S(0.14, 0.6), s: 1 }, 600, 60, true);
        nia.current?.expr("focus");
        for (let j = 0; j < LETTER.length && alive(); j++) {
          const L = LETTER[j];
          setLines(j + 1);
          const talking = say(L.say, id, j === 0 ? "focus" : "idle");
          await sleep(60);
          const chip = chipEls.current[j];
          if (chip) nia.current?.gaze(toClient(centreOf(chip)));
          if (L.src && L.from !== undefined) { await flyChip(L.from, j); setChips((c) => [...c, j]); }
          await talking;
          await sleep(220);
        }
        if (!alive()) break;
        nia.current?.gaze(null);
        await say("Done. Every claim points to its source.", id, "happy");
        await sleep(1000);
        a = 2; setAct(2);
      } else {
        setPanel("send"); setSent(null);
        await hop({ ...S(0.14, 0.6), s: 1 }, 300, 30, true);
        await say("Ready to send. This one needs a human.", id, "think");
        if (!alive()) break;
        nia.current?.expr("wait");
        nia.current?.gaze(toClient(S(1, 1.05)));   // looking at where someone will come from
        // the Advocate's cursor comes in and approves, unless you get there first
        const by = await new Promise<"you" | "Advocate">((resolve) => {
          approveNow.current = () => resolve("you");
          void (async () => {
            await sleep(700);
            const c = cursor.current, btn = approveBtn.current;
            if (!c || !btn || !alive()) return;
            const from = S(1.02, 1.08), to = centreOf(btn, 18, 10);
            c.style.opacity = "1";
            const t0 = performance.now(), ms = 1300;
            await new Promise<void>((r) => {
              const f = (n: number) => {
                const t = Math.min(1, (n - t0) / ms), e = ease(t);
                const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - 40 * Math.sin(Math.PI * t);
                c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                nia.current?.gaze(toClient({ x, y }));
                if (t < 1 && alive()) requestAnimationFrame(f); else r();
              };
              requestAnimationFrame(f);
            });
            await sleep(260);
            c.classList.add("press"); btn.classList.add("press");
            await sleep(160);
            c.classList.remove("press"); btn.classList.remove("press");
            resolve("Advocate");
          })();
        });
        approveNow.current = null;
        if (!alive()) break;
        setSent(by);
        nia.current?.expr("surprised", 450);
        await sleep(450);
        nia.current?.expr("love"); nia.current?.hearts(5); nia.current?.squash(0.6);
        await say("Sent, with the evidence attached.", id);
        window.setTimeout(() => { if (cursor.current) cursor.current.style.opacity = "0"; }, 600);
        await sleep(2600);
        a = 0; reset(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S, centreOf, hop, reset, say, toClient]);

  /** the card in Nia's hands is filed: it arcs to the folder's mouth, shrinks to a sheet and slides in behind the
      flap (which tips open for it), then the folder settles with one more sheet in it */
  const fileInto = async (to: number) => {
    const c = carryEl.current, f = folderEls.current[to]?.querySelector(".nf-icon") ?? folderEls.current[to], r = root.current;
    if (!c || !f || !r) { setCarry(null); setCounts((v) => v.map((n, i) => (i === to ? n + 1 : n))); return; }
    const rr = r.getBoundingClientRect(), cr = c.getBoundingClientRect(), fr = f.getBoundingClientRect();
    const w = c.offsetWidth, h = c.offsetHeight;
    const clone = c.cloneNode(true) as HTMLElement;
    // it leaves her hands as its own element: drop the "hanging under Nia" placement, the animation positions it
    clone.className = "ns-filing";   // the artifact inside keeps its own look
    clone.style.cssText = `left:0;top:0;width:${w}px;transform:none`;
    r.appendChild(clone);
    setCarry(null);
    setOpenF(to);
    const x0 = cr.left - rr.left + cr.width / 2 - w / 2, y0 = cr.top - rr.top + cr.height / 2 - h / 2;
    const tx = fr.left - rr.left + fr.width / 2 - w / 2, ty = fr.top - rr.top + 14 - h / 2;
    await clone.animate([
      { transform: `translate(${x0}px, ${y0}px) rotate(-3deg) scale(.86)` },
      { transform: `translate(${(x0 + tx) / 2}px, ${Math.min(y0, ty) - 46}px) rotate(5deg) scale(.66)`, offset: 0.55 },
      { transform: `translate(${tx}px, ${ty}px) rotate(0deg) scale(.36, .34)` },
    ], { duration: 460, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" }).finished.catch(() => {});
    // into the folder: the sheet inside takes over from the card, sliding down behind the flap
    setCounts((v) => v.map((n, i) => (i === to ? n + 1 : n)));
    setFresh(to);
    await clone.animate([
      { transform: `translate(${tx}px, ${ty}px) scale(.36, .34)`, opacity: 1 },
      { transform: `translate(${tx}px, ${ty + 20}px) scale(.32, .22)`, opacity: 0 },
    ], { duration: 220, easing: "ease-in", fill: "forwards" }).finished.catch(() => {});
    clone.remove();
    setBump(to);
    await sleep(240);
    setOpenF(-1); setFresh(-1);
    window.setTimeout(() => setBump(-1), 260);
  };

  /** a source chip flies out of its folder into the letter line */
  const flyChip = async (from: number, line: number) => {
    const f = folderEls.current[from], target = chipEls.current[line], r = root.current;
    if (!f || !target || !r) return;
    const a = centreOf(f), b = centreOf(target);
    const fly = document.createElement("em");
    fly.className = "ns-src ns-fly"; fly.textContent = LETTER[line].src ?? "";
    r.appendChild(fly);
    const w = fly.offsetWidth, h = fly.offsetHeight;
    const anim = fly.animate([
      { transform: `translate(${a.x - w / 2}px, ${a.y - h / 2}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${(a.x + b.x) / 2 - w / 2}px, ${Math.min(a.y, b.y) - 70}px) scale(1.1)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${b.x - w / 2}px, ${b.y - h / 2}px) scale(1)`, opacity: 1 },
    ], { duration: 650, easing: "cubic-bezier(.3,.7,.3,1)" });
    await anim.finished.catch(() => {});
    fly.remove();
  };

  /* ── entrance: she pops in beside "Meet Nia." when the headline shows, looks left and right, then (once the stage
     is on screen) hops down into it and gets to work. Stage scrolled back below the fold: she hops home. ── */
  useEffect(() => {
    const st = stage.current, an = document.querySelector(anchor);
    if (!st || !an) return;
    place(homeSpot());
    const el = actor.current;
    el?.classList.add("pre");
    let appeared = false, ready = false, inStage = false, stageOn = false, cancelled = false;
    // while she's sitting in the headline she follows her seat every frame: the headline slides up as it reveals,
    // and fonts / resizes can move it, so a seat measured once would leave her floating off the line
    let seated = false, follow = 0;
    const track = () => { if (seated) place(homeSpot()); follow = requestAnimationFrame(track); };
    follow = requestAnimationFrame(track);
    const lookAt = (dx: number, dy = 0) => {
      const r = actor.current!.getBoundingClientRect();
      nia.current?.gaze({ x: r.left + r.width / 2 + dx, y: r.top + r.height / 2 + dy });
    };
    const enter = () => {
      if (!ready || !stageOn || inStage || cancelled) return;
      inStage = true; seated = false; setHome(false);
      nia.current?.gaze(null); nia.current?.expr("happy", 700);
      void hop({ ...S(0.5, 0.52), s: 1 }, 950, 150, true).then(() => { if (inStage) void play(0); });
    };
    const intro = async () => {
      // pop in: grow from nothing with an overshoot, then a squash as she "lands" in her seat
      el?.classList.remove("pre");
      const t0 = performance.now();
      await new Promise<void>((r) => {
        const f = (n: number) => {
          const t = Math.min(1, (n - t0) / 520);
          const k = t < 1 ? 1 + Math.sin(t * Math.PI * 1.25) * (1 - t) * 0.5 : 1;   // springy overshoot
          const live = homeSpot();
          place({ ...live, s: live.s * Math.min(1.25, t * 1.6) * (t < 1 ? k : 1) });
          if (t < 1) requestAnimationFrame(f); else r();
        };
        requestAnimationFrame(f);
      });
      seated = true;
      nia.current?.expr("surprised", 600); nia.current?.squash(0.5);
      await sleep(700);
      // a look around: left, right, back to you
      nia.current?.expr("think"); nia.current?.turn(-0.6); lookAt(-420, 20); await sleep(850);
      nia.current?.turn(0.6); lookAt(420, 20); await sleep(850);
      nia.current?.turn(0); nia.current?.gaze(null); nia.current?.expr("wink", 700); await sleep(700);
      nia.current?.expr("idle");
      ready = true;
      enter();
    };
    const ioHead = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !appeared) { appeared = true; void intro(); }
    }, { threshold: 1, rootMargin: "0px 0px -12% 0px" });
    ioHead.observe(an);
    const ioStage = new IntersectionObserver(([e]) => {
      stageOn = e.isIntersecting && e.intersectionRatio >= 0.25;
      if (stageOn) { enter(); return; }
      if (!e.isIntersecting && inStage && e.boundingClientRect.top > 0) {
        // the stage went back below the fold: she goes home to the headline
        inStage = false; run.current++; setBubble(""); setCarry(null);
        nia.current?.gaze(null); nia.current?.expr("happy", 600);
        void hop(homeSpot(), 800, 120, true).then(() => { setHome(true); if (!inStage) seated = true; });
      } else if (!e.isIntersecting && inStage) {
        run.current++; inStage = false;   // scrolled past: pause; she stays put
      }
    }, { threshold: [0, 0.25] });
    ioStage.observe(st);
    const onResize = () => { if (!inStage) place(homeSpot()); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true; cancelAnimationFrame(follow); ioHead.disconnect(); ioStage.disconnect(); window.removeEventListener("resize", onResize);
      // run is a cancel counter, not a DOM ref: bumping it on unmount stops any script that is still going
      // eslint-disable-next-line react-hooks/exhaustive-deps
      run.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = (a: NiaAct) => { if (!home) void play(a); };

  return (
    <div className="ns" ref={root}>
      <div className="nd-asks" role="tablist" aria-label="What Nia is doing">
        {ACTS.map((t, i) => (
          <button key={t} type="button" role="tab" aria-selected={act === i} className={act === i ? "on" : ""} onClick={() => jump(i as NiaAct)}>
            <span className="nd-n">{i + 1}</span>{t}
          </button>
        ))}
      </div>

      <div className="ns-stage" ref={stage}>
        {/* 1 · the inbox pile and the job folders */}
        <p className="ns-label" style={{ left: "6%", top: "9%", opacity: panel === "none" ? 1 : 0 }}>Inbox</p>
        <ul className="ns-pile" style={{ opacity: panel === "none" ? 1 : 0 }}>
          {ITEMS.map((it, i) => (
            <li key={it.t} ref={(n) => { pileEls.current[i] = n; }} className={picked.includes(i) ? "gone" : ""} style={{ "--i": i } as React.CSSProperties}>
              <InboxArtifact kind={it.kind} />
            </li>
          ))}
        </ul>
        <div className="ns-folders">
          {FOLDERS.map((f, i) => (
            <div key={f} ref={(n) => { folderEls.current[i] = n; }} className={`ns-folder${bump === i ? " bump" : ""}${openF === i ? " open" : ""}`}>
              <span className="nf-icon" aria-hidden="true">
                <i className="nf-back" />
                <span className="nf-papers">
                  {Array.from({ length: Math.min(3, counts[i]) }, (_, k) => (
                    <i key={k} className={`nf-sheet${fresh === i && k === Math.min(3, counts[i]) - 1 ? " new" : ""}`} style={{ "--k": k } as React.CSSProperties} />
                  ))}
                </span>
                <i className="nf-front" />
              </span>
              <span className="nf-label"><b>{f}</b><small>{counts[i]} {counts[i] === 1 ? "item" : "items"}</small></span>
            </div>
          ))}
        </div>

        {/* 2 · the letter */}
        <article className={`ns-panel ns-doc${panel === "doc" ? " on" : ""}`} aria-hidden={panel !== "doc"}>
          <header><b>Appeal · out-of-network charge</b><small>Draft · by Nia</small></header>
          {LETTER.map((L, j) => (
            <p key={j} className={j < lines ? "in" : ""}>
              {L.text}
              {L.src && <em ref={(n) => { chipEls.current[j] = n; }} className={`ns-src${chips.includes(j) ? " in" : ""}`}>{L.src}</em>}
              {L.src && "."}
            </p>
          ))}
        </article>

        {/* 3 · the send, waiting on a person */}
        <div className={`ns-panel ns-send${panel === "send" ? " on" : ""}${sent ? " sent" : ""}`} aria-hidden={panel !== "send"}>
          <dl>
            <div><dt>To</dt><dd>Payer appeals desk</dd></div>
            <div><dt>Attached</dt><dd>Appeal letter · EOB · Plan excerpt</dd></div>
            <div><dt>Evidence</dt><dd>3 sources linked, checkpoint saved</dd></div>
          </dl>
          <div className="ns-gate">
            {sent ? (
              <p className="ns-ok"><span className="ns-tick" aria-hidden="true" />Sent · approved by {sent}</p>
            ) : (
              <>
                <p><span className="ns-wait" aria-hidden="true" />Needs a person's OK</p>
                <button type="button" ref={approveBtn} onClick={() => approveNow.current?.("you")}>Approve and send</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nia herself (and what she's holding / saying), positioned over everything above */}
      <div className={`ns-actor${home ? " home" : ""}`} ref={actor}>
        {bubble && !home && <p className="ns-bubble" aria-live="polite">{bubble}</p>}
        <Nia3D size={SIZE} api={nia} label="Nia, Grain's agent. Click her, or drag to spin." />
        {carry !== null && (
          <div className="ns-carry" ref={carryEl}>
            <InboxArtifact kind={ITEMS[carry].kind} />
          </div>
        )}
      </div>

      {/* the Advocate's cursor */}
      <div className="ns-cursor" ref={cursor} aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M4 2.5l15.5 9.2-6.8 1.7-3.6 6.1z" /></svg>
        <span>Advocate</span>
      </div>
    </div>
  );
}
