// "A finished packet" (v4): the five artifacts as a tidy stack of pages with index tabs. The selected page sits in
// front, fully readable; the others step back behind it so only their titles show, like tabs in a binder (click
// or hover a tab to bring it forward). Nia, who assembled the packet, peeks over the top corner: reading while
// the pages are dealt, hopping when a page comes forward. The inputs the front page was built from light up on
// the left, joined to it by one thin wire each; its evidence shows on the right like a receipt, signed by Nia.
// Cycles on its own; hover or click takes over. Phones: the stack and the evidence, no wires.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileGlyph } from "./Workflow";
import Nia from "./Nia";
import NiaPal from "./NiaPal";
import "./packet.css";

const INPUTS = ["statement-of-work.pdf", "kickoff-call-notes.md", "policy-library.pdf", "last-year-audit.xlsx", "client-contacts.csv", "timeline-rules.md"];
type St = "verified" | "derived" | "pending" | "review";
type Art = { f: string; title: string; kind: string; st: St; src: number[]; check: string; hash: string; by: string };
const ARTS: Art[] = [
  { f: "onboarding-brief.pdf", title: "Onboarding brief", kind: "PDF · 4 pages", st: "verified", src: [0, 1], check: "cp-07 · facts extracted", hash: "a91f…2c04", by: "Nia · brief profile v12" },
  { f: "implementation-plan.md", title: "Implementation plan", kind: "Plan · 3 phases", st: "derived", src: [0, 5], check: "cp-09 · drafts assembled", hash: "4be0…91d7", by: "Nia · planner profile v12" },
  { f: "security-questionnaire.xlsx", title: "Security questionnaire", kind: "Sheet · 112 answers", st: "verified", src: [2, 3], check: "cp-08 · facts extracted", hash: "e27c…0b5a", by: "Nia · security profile v6" },
  { f: "kickoff-email-draft.md", title: "Kickoff email", kind: "Email draft", st: "pending", src: [1, 4], check: "cp-10 · approval gate", hash: "77d1…c3e8", by: "Held for the account owner" },
  { f: "risk-exceptions-memo.pdf", title: "Risk exceptions", kind: "PDF · 2 pages", st: "review", src: [2, 3], check: "cp-09 · drafts assembled", hash: "0c5a…e611", by: "Flagged for a person" },
];
const ST: Record<St, string> = { verified: "Verified", derived: "Derived", pending: "Pending approval", review: "Needs review" };
const CYCLE_MS = 3600;
const PAGE_W = 272, PAGE_H = 288, TAB = 36;   // keep in step with packet.css

const L = ({ w, k = "" }: { w: number; k?: string }) => <i className={`pl ${k}`} style={{ width: `${w}%` }} />;
function Page({ i }: { i: number }) {
  switch (i) {
    case 0: return (
      <>
        <p className="pg-h">Onboarding brief</p><p className="pg-s">Northwind Health · 4 pages</p>
        <p className="pg-k">Scope</p><L w={96} /><L w={88} /><L w={62} />
        <p className="pg-k">Key dates</p><L w={90} /><L w={74} />
        <p className="pg-k">Contacts</p><L w={80} /><L w={54} />
      </>);
    case 1: return (
      <>
        <p className="pg-h">Implementation plan</p><p className="pg-s">3 phases · 6 weeks</p>
        {[["Wk 1", "Kickoff and access"], ["Wk 2–3", "Data migration"], ["Wk 4", "Security review"], ["Wk 5–6", "Go-live"]].map(([w, t], k) => (
          <div key={k} className="pg-task"><b className={k < 2 ? "done" : ""} /><span className="pg-wk">{w}</span><span>{t}</span></div>
        ))}
      </>);
    case 2: return (
      <>
        <p className="pg-h">Security questionnaire</p><p className="pg-s">112 answers</p>
        <div className="pg-grid">
          {["Q", "Answer", "1.1", "SSO via SAML", "1.2", "AES-256 at rest", "2.4", "SOC 2 Type II", "3.1", "30-day retention", "3.7", "EU region"].map((t, k) => <span key={k}>{t}</span>)}
        </div>
      </>);
    case 3: return (
      <>
        <p className="pg-h">Kickoff email</p><p className="pg-s">Draft · to the client</p>
        <p className="pg-mail"><span>To</span> ops@northwind.health</p>
        <p className="pg-mail"><span>Subject</span> Welcome to onboarding</p>
        <L w={94} /><L w={86} /><L w={90} /><L w={48} />
        <span className="pg-send">Send · waiting for approval</span>
      </>);
    default: return (
      <>
        <p className="pg-h">Risk exceptions</p><p className="pg-s">2 items for review</p>
        <L w={92} /><L w={70} />
        <p className="pg-flag">Data residency differs from the SOW</p>
        <L w={84} /><L w={60} />
        <p className="pg-flag">Audit finding still open from last year</p>
        <L w={78} />
      </>);
  }
}

export default function PacketStage() {
  const [sel, setSel] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [dealt, setDealt] = useState(0);          // pages that have landed in the stack
  const [live, setLive] = useState(false);
  const active = hover ?? sel;
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const inEls = useRef<(HTMLLIElement | null)[]>([]);
  const [wires, setWires] = useState<{ d: string; x1: number; y1: number; x2: number; i: number }[]>([]);
  const reduce = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // deal the pages in when the stack comes into view, then start cycling
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!live || dealt > ARTS.length) return;
    if (reduce) { setDealt(ARTS.length + 1); return; }
    const id = window.setTimeout(() => setDealt((d) => d + 1), dealt === 0 ? 200 : 260);
    return () => clearTimeout(id);
  }, [live, dealt, reduce]);
  useEffect(() => {
    if (!live || hover !== null || dealt <= ARTS.length || reduce) return;
    const id = window.setTimeout(() => setSel((s) => (s + 1) % ARTS.length), CYCLE_MS);
    return () => clearTimeout(id);
  }, [live, hover, sel, dealt, reduce]);

  // wires: from each source input's right edge to the lifted page's left edge (where it will be)
  const measure = useCallback(() => {
    const r = root.current, s = stage.current;
    if (!r || !s) return;
    const rr = r.getBoundingClientRect(), sr = s.getBoundingClientRect();
    const pageW = Math.min(PAGE_W, sr.width * 0.92);
    const x2 = sr.left - rr.left + sr.width / 2 - pageW / 2;
    const y2 = sr.bottom - rr.top - PAGE_H * 0.55;
    setWires(ARTS[active].src.map((i) => {
      const n = inEls.current[i];
      if (!n) return null;
      const nr = n.getBoundingClientRect();
      const x1 = nr.right - rr.left + 6, y1 = nr.top - rr.top + nr.height / 2;
      const mx = x1 + (x2 - x1) * 0.55;
      return { d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, x1, y1, x2, i };
    }).filter(Boolean) as { d: string; x1: number; y1: number; x2: number; i: number }[]);
  }, [active]);
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (root.current) ro.observe(root.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  const a = ARTS[active];
  const ready = dealt > ARTS.length;
  const n = ARTS.length;
  return (
    <div className="pkx" ref={root}>

      <svg className="pkx-wires" aria-hidden="true">
        {ready && wires.map((w) => (
          <g key={`${active}-${w.i}`}>
            <path d={w.d} />
            <circle r="2.6" cx={w.x1} cy={w.y1} />
          </g>
        ))}
      </svg>

      <div className="pkx-cols">
        <div className="pkx-inputs">
          <p className="pkx-h">Inputs</p>
          <ul>
            {INPUTS.map((f, i) => (
              <li key={f} ref={(el) => { inEls.current[i] = el; }} className={ready && a.src.includes(i) ? "lit" : ""}>
                <FileGlyph name={f} /><span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pkx-stage" ref={stage} onMouseLeave={() => setHover(null)}
          style={{ ["--pw" as string]: `${PAGE_W}px`, ["--ph" as string]: `${PAGE_H}px`, ["--tab" as string]: `${TAB}px` }}>
          {/* Nia peeks over the front page's corner; the page hides its lower half */}
          <div className="pkx-nia">
            <NiaPal size={58} mood={ready ? "idle" : "work"} celebrate={ready ? active : undefined} label="Nia put this packet together" />
          </div>
          {ARTS.map((x, i) => {
            const depth = (i - active + n) % n;            // 0 = front, then back through the stack
            const on = ready && i === active;
            return (
              <button
                key={x.f} type="button"
                className={`pkx-page p${i}${i < dealt ? " in" : ""}${on ? " on" : ""}${depth === n - 1 ? " last" : ""}`}
                style={{ ["--d" as string]: depth, zIndex: 30 - depth * 2 }}
                onMouseEnter={() => ready && setHover(i)} onFocus={() => ready && setHover(i)} onBlur={() => setHover(null)}
                onClick={() => setSel(i)} aria-pressed={i === sel} aria-label={`${x.title}, ${ST[x.st]}`}
              >
                <span className={`pkx-st st-${x.st}`}>{ST[x.st]}</span>
                <Page i={i} />
                <span className="pkx-file"><FileGlyph name={x.f} /><span className="pkx-fn">{x.f}</span></span>
              </button>
            );
          })}
        </div>

        <div className="pkx-ev" key={a.f} aria-live="polite">
          <p className="pkx-h">Evidence</p>
          <p className="pkx-ev-t">{a.title}</p>
          <p className="pkx-ev-k">{a.kind}</p>
          <dl>
            <dt>Sources</dt>
            <dd className="pkx-srcs">{a.src.map((i) => <span key={i}><FileGlyph name={INPUTS[i]} />{INPUTS[i]}</span>)}</dd>
            <dt>Checkpoint</dt><dd>{a.check}</dd>
            <dt>Fingerprint</dt><dd className="pkx-hash"><FingerprintMark />{a.hash}</dd>
            <dt>Made by</dt><dd className="pkx-by">{a.by.startsWith("Nia") && <Nia size={20} />}{a.by}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

function FingerprintMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4M14 13.12c0 2.38 0 6.38-1 8.88M17.29 21.02c.12-.6.43-2.3.5-3.02M2 12a10 10 0 0 1 18-6M2 16h.01M21.8 16c.2-2 .131-5.354 0-6M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2M8.65 22c.21-.66.45-1.32.57-2M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}
