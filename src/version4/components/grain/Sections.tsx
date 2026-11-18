// The sections after "How it runs": What Grain hands back · Capabilities · Use cases · Trust · CTA · Footer.
// Each has one interaction in the site's language (live, ASCII, evidence-driven):
//   Packet       — assembles on scroll; a lineage graph wires every artifact to the inputs it came from
//   Capabilities — cursor spotlight + tilt; a terminal line types an example event on hover
//   Use cases    — each card runs its fleet (ledger → gate → reviewer → outbound) on hover
//   Trust        — pillars light up the audit-log lines they guarantee; a private journal decodes on request
//   CTA          — a living ASCII field that follows the cursor (AsciiField.tsx)
// Copy comes from grainlabs.ai (headings verbatim, body lightly edited); case details are illustrative.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BoxIcon } from "@/version4/components/ui/box";
import { CheckIcon } from "@/version4/components/ui/check";
import { SendIcon } from "@/version4/components/ui/send";
import { ArchiveIcon } from "@/version4/components/ui/archive";
import AsciiField from "./AsciiField";
import CapCards from "./CapCards";
import SiriOrb from "./SiriOrb";
import Gather from "./Gather";
import PacketStage from "./PacketStage";
import UseCasesGrid from "./UseCases";
import TrustGrid from "./TrustGrid";
import RunBoard, { type BoardEvent } from "./RunBoard";
import BeamButton from "./BeamButton";
import SiteFooter from "./SiteFooter";
import { Faq, Contact } from "./FaqContact";
import "./sections.css";

const CONTACT = "https://www.grainlabs.ai/contact.html";
type Anim = { startAnimation: () => void; stopAnimation: () => void };

/** reveal children as they scroll into view, staggered in reading order */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        const batch = es.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        batch.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        batch.forEach((n, k) => {
          n.style.setProperty("--d", `${Math.min(k, 9) * 90}ms`);
          n.setAttribute("data-in", "");   // an attribute, not a class: React re-renders rewrite className and would drop it
          io.unobserve(n);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    el.querySelectorAll(".rv").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

// kicker is only a note of what the section is; the small labels above headings were removed by request
function Head({ title, sub, center }: { kicker?: string; title: ReactNode; sub?: string; center?: boolean }) {
  return (
    <div className={`sx-head${center ? " center" : ""}`}>
      <h2 className="rv">{title}</h2>
      {sub && <p className="sx-sub rv">{sub}</p>}
    </div>
  );
}

/* Icon tiles set into a headline (Mobbin-style): a small squircle of Siri light with a white animated icon.
   They pop in one after another when the heading reveals, play their icon, and play it again on hover. */

// `side`: which side the tile makes room on. "tail" = before a word (space after), "lead" = before punctuation.
function Tile({ tone, k, icon: Icon, label, side }: { tone: string; k: number; icon: typeof BoxIcon; label: string; side: "lead" | "tail" }) {
  const el = useRef<HTMLSpanElement>(null);
  const ico = useRef<Anim>(null);
  useEffect(() => {
    const n = el.current;
    if (!n) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      window.setTimeout(() => ico.current?.startAnimation(), 2100 + k * 280);   // once the tile has arrived
      window.setTimeout(() => n.setAttribute("data-arrived", ""), 2500 + k * 280);   // from now on, hover is quick both ways
    }, { threshold: 0.6 });
    io.observe(n);
    return () => io.disconnect();
  }, [k]);
  return (
    <span className={`it it-${tone} ${side}`} ref={el} style={{ ["--k" as string]: k }} role="img" aria-label={label}
      onMouseEnter={() => ico.current?.startAnimation()}>
      <Icon ref={ico as never} size={28} />
    </span>
  );
}

/* ───────────────────────── 1 · What Grain hands back: the packet ───────────────────────── */
function Packet() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="sx sx-packet" data-surface="base" ref={ref} aria-labelledby="pk-title">
      <div className="sx-wrap pk-grid">
        <div className="pk-intro">
          <Head center title={
            <span id="pk-title" className="pk-h">
              {/* the text reads whole first; the tiles then open up room for themselves */}
              <span className="pk-line">A finished <Tile side="tail" tone="orb" k={0} icon={BoxIcon} label="" />packet</span>{" "}
              <span className="pk-line">your team can review<Tile side="lead" tone="violet" k={1} icon={CheckIcon} label="" />,</span>{" "}
              <span className="pk-line">send<Tile side="lead" tone="cyan" k={2} icon={SendIcon} label="" />, or archive<Tile side="lead" tone="rasp" k={3} icon={ArchiveIcon} label="" />.</span>
            </span>}
            sub="Each artifact carries its source references, origin, content fingerprint, checkpoint and run details. The output is a packet, not a chat response." />
          <p className="pk-hint rv">Hover a page to trace it back to its sources.</p>
        </div>

        <div className="rv" style={{ width: "100%", display: "grid", justifyItems: "center" }}><PacketStage /></div>
      </div>
    </section>
  );
}

/* ───────────────────────── 2 · Capabilities: spotlight + live terminal line ───────────────────────── */
function Capabilities() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="sx sx-caps" id="capabilities" data-surface="base" ref={ref} aria-labelledby="cp-title">
      <div className="sx-wrap">
        <Head center kicker="Capabilities" title={<span id="cp-title">Built for work your business <em>repeats.</em></span>}
          sub="Four things Grain does on every job, with governance and improvement running underneath all of them." />
        <CapCards />
      </div>
    </section>
  );
}

/* ───────────────────────── 3 · Use cases ───────────────────────── */
function UseCases() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="sx sx-uses" id="uses" data-surface="base" ref={ref} aria-labelledby="uc-title">
      <div className="sx-wrap">
        <UseCasesGrid head={
          <div className="ua-headrow">
            <h2 className="rv" id="uc-title">Start with a workflow your team already runs.</h2>
            <p className="sx-sub rv">Eight agent fleets, one anatomy. Each one works on its own kind of document, and every one of them follows the same four steps.</p>
          </div>} />
      </div>
    </section>
  );
}

/* ───────────────────────── 4 · Trust: five guarantees, each shown working ───────────────────────── */
function Trust() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="sx sx-trust" id="trust" data-surface="inverse" ref={ref} aria-labelledby="tr-title">
      <div className="sx-wrap">
        <div className="tg-headrow">
          <h2 className="rv" id="tr-title"><span>Governed execution,</span><span>not a black box.</span></h2>
          <p className="sx-sub rv">The controls a CTO asks about, explained so a CEO can sign off. Every capability is granted, every run is evidenced, every output is traceable.</p>
        </div>
        <TrustGrid />
      </div>
    </section>
  );
}

/* ───────────────────────── v4 · The board: every run, sorted by what it needs from you ─────────────────────────
   Content pass after orchestrator.inc: a two-line headline, a live board where Nia and the Advocate carry runs
   between lanes, and three captions underneath that light up when their moment happens on the board. */
const BOARD_POINTS: { e: BoardEvent; t: string; d: string }[] = [
  { e: "placed", t: "Placed by the run, not by hand", d: "Nia moves each run the moment its state changes. Nobody updates a status." },
  { e: "card", t: "One card per run", d: "The request, the agent on it and the packet it is building, in one place." },
  { e: "needs", t: "Needs you, first", d: "Decisions land in one lane. Drag one across to approve it; everything else keeps running." },
];
function Board() {
  const ref = useReveal<HTMLElement>();
  const [on, setOn] = useState<BoardEvent>("placed");
  return (
    <section className="sx sx-board" data-surface="base" ref={ref} aria-labelledby="bd-title">
      <div className="sx-wrap">
        <div className="bd-head">
          <h2 className="rv" id="bd-title"><span>Every run, sorted by</span><span>what it <em>needs from you</em>.</span></h2>
          <p className="sx-sub rv">Grain works the queue. You open the runs that need a decision and leave the rest alone.</p>
        </div>
        <div className="rv"><RunBoard onEvent={setOn} /></div>
        <ol className="bd-points">
          {BOARD_POINTS.map((p) => (
            <li key={p.e} className={`rv${on === p.e ? " on" : ""}`}><b>{p.t}</b><span>{p.d}</span></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────── 5 · CTA + footer ───────────────────────── */
function Cta() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="sx sx-cta" data-surface="base" ref={ref}>
      <div className="sx-wrap">
        <div className="ct-box rv">
          <AsciiField className="ct-ascii" />
          <SiriOrb size="min(56vw, 640px)" className="ct-orb" />
          <h2>Run the work your team repeats every week.</h2>
          <p className="sx-sub">Bring one recurring job. Grain will take it in, route it, run it, and hand back an output you can inspect.</p>
          <div className="ct-actions">
            <BeamButton className="ct-btn" href={CONTACT} theme="dark" arrowSize={17}>Start a workflow</BeamButton>
            <a className="ct-link" href="#contact">Talk to us</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Sections({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <>
      {/* How it runs (dark) into the page: the light page rises over it as a rounded sheet (no fade) */}
      <div className="seam" aria-hidden="true" />
      <Packet />
      <Board />
      {/* scattered sources → Grain → the models it runs on */}
      <Gather />
      <Capabilities />
      <UseCases />
      <Trust />
      <Faq />
      <Contact theme={theme} />
      <Cta />
      <SiteFooter theme={theme} />
    </>
  );
}
