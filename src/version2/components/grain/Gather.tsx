// "Scattered → gathered → run": after the chaos, fan-in and hub references.
// Desktop: the section is pinned while you scroll through three beats:
//   1. work scattered across inboxes, PDFs, spreadsheets, portals, chats and voicemail
//   2. the sources line up and converge on Grain, with work travelling along each line
//   3. Grain fans out to the models it runs on
// Phones: a simple stacked version of the final state.
// Positions live in a 1200×720 box and are placed as percentages; the scroll writes them every frame.
import { useEffect, useRef, useState } from "react";
import SiriOrb from "./SiriOrb";
// provider marks: Lobe Icons (MIT), single-colour, so they take the text colour in both themes
import openaiSvg from "@/version2/assets/models/openai.svg?raw";
import anthropicSvg from "@/version2/assets/models/anthropic.svg?raw";
import glmSvg from "@/version2/assets/models/zhipu.svg?raw";
import metaSvg from "@/version2/assets/models/meta.svg?raw";
import mistralSvg from "@/version2/assets/models/mistral.svg?raw";
import qwenSvg from "@/version2/assets/models/qwen.svg?raw";
import deepseekSvg from "@/version2/assets/models/deepseek.svg?raw";
import "./gather.css";

const BW = 1200, BH = 720;
const HUB = { x: 600, y: 372, r: 54 };
type Kind = "mail" | "invoice" | "sheet" | "thread" | "portal" | "voice" | "eob" | "chat";
type Src = { label: string; icon: string; badge: string; kind: Kind; chaos: [number, number] };
// Scattered positions form a loose ring around the heading (which owns the centre), so nothing overlaps it.
// Index order is the final column order, chosen so cards travel without crossing each other.
// `badge` is a red notification count ("" = none).
const SOURCES: Src[] = [
  { label: "Inbox", icon: "mail", badge: "99+", kind: "mail", chaos: [258, 118] },
  { label: "invoice-0412.pdf", icon: "picture_as_pdf", badge: "", kind: "invoice", chaos: [600, 92] },
  { label: "rates-2026.xlsx", icon: "table", badge: "", kind: "sheet", chaos: [944, 120] },
  { label: "Re: Re: Fwd: pricing", icon: "mail", badge: "12", kind: "thread", chaos: [132, 372] },
  { label: "Payer portal", icon: "language", badge: "", kind: "portal", chaos: [1068, 380] },
  { label: "Voicemail", icon: "voicemail", badge: "3", kind: "voice", chaos: [256, 622] },
  { label: "EOB-march.pdf", icon: "picture_as_pdf", badge: "", kind: "eob", chaos: [600, 646] },
  { label: "Team chat", icon: "chat", badge: "412", kind: "chat", chaos: [946, 618] },
];

/* Small, plain replicas of the real things. Text is real where it reads; the rest is soft grey lines. */
const L = ({ w, k = "" }: { w: number; k?: string }) => <i className={`rl ${k}`} style={{ width: `${w}%` }} />;
function Replica({ kind }: { kind: Kind }) {
  switch (kind) {
    case "mail": return (
      <div className="rp rp-mail rp-stack">
        <div className="rp-row"><b className="rp-av">DR</b><span className="rp-from">Dana Ruiz</span><span className="rp-time">9:41</span></div>
        <p className="rp-subj">Is this bill right?</p><L w={92} /><L w={64} />
      </div>);
    case "invoice": return (
      <div className="rp rp-doc">
        <div className="rp-row"><span className="rp-h">Invoice</span><span className="rp-tag pdf">PDF</span></div>
        <p className="rp-sub">#0412 · Due Apr 30</p>
        <div className="rp-li"><L w={44} /><span>$840.00</span></div>
        <div className="rp-li"><L w={36} /><span>$400.00</span></div>
        <div className="rp-li tot"><span>Total</span><span>$1,240.00</span></div>
      </div>);
    case "sheet": return (
      <div className="rp rp-sheet">
        <div className="rp-grid">
          {["", "A", "B", "C", "1", "Code", "2025", "2026", "2", "99213", "112", "118", "3", "99214", "164", "171", ].map((t, i) => <span key={i}>{t}</span>)}
        </div>
        <p className="rp-sheet-tab">rates_v7_FINAL(2)</p>
      </div>);
    case "thread": return (
      <div className="rp rp-mail">
        <p className="rp-subj">Re: Re: Fwd: pricing</p>
        <p className="rp-sub">Ops, Billing, you +4</p>
        <div className="rp-quote"><L w={88} /><L w={70} /><div className="rp-quote"><L w={76} /><L w={52} /></div></div>
      </div>);
    case "portal": return (
      <div className="rp rp-portal">
        <div className="rp-bar"><i /><i /><i /><span>portal.payer.com</span></div>
        <div className="rp-pbody">
          <p className="rp-err">Session timed out</p>
          <L w={80} /><span className="rp-field" /><span className="rp-btn">Sign in again</span>
        </div>
      </div>);
    case "voice": return (
      <div className="rp rp-voice">
        <div className="rp-row"><span className="rp-from">Unknown caller</span><span className="rp-time">Yesterday</span></div>
        <div className="rp-wave"><b className="rp-play" />{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ height: `${22 + Math.abs(Math.sin(i * 1.7)) * 70}%` }} />)}<span>0:47</span></div>
        <p className="rp-tx">“Hi, it's Dana again, about the March bill…”</p>
      </div>);
    case "eob": return (
      <div className="rp rp-doc">
        <div className="rp-row"><span className="rp-h">Explanation of benefits</span></div>
        <p className="rp-sub">March 14 · Claim 88213</p>
        <div className="rp-li"><span>Billed</span><span>$1,240</span></div>
        <div className="rp-li"><span>Plan paid</span><span>$910</span></div>
        <div className="rp-li tot"><span>You owe</span><span>$330</span></div>
      </div>);
    case "chat": return (
      <div className="rp rp-chat">
        <p className="rp-bub">who has the latest rates sheet?</p>
        <p className="rp-bub me">v7 final, I think</p>
        <p className="rp-bub">that's not the final one</p>
      </div>);
  }
}
const ENDPOINT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>';
type Model = { name: string; note: string; marks: string[] };
const MODELS: Model[] = [
  { name: "OpenAI", note: "GPT models", marks: [openaiSvg] },
  { name: "Anthropic", note: "Claude models", marks: [anthropicSvg] },
  { name: "GLM", note: "Zhipu AI", marks: [glmSvg] },
  { name: "Open-weight", note: "Llama, Mistral, Qwen…", marks: [metaSvg, mistralSvg, qwenSvg, deepseekSvg] },
  { name: "Your own endpoint", note: "Any compatible API", marks: [ENDPOINT_SVG] },
];
const Marks = ({ m }: { m: Model }) => (
  <span className={`ga-marks${m.marks.length > 1 ? " many" : ""}`}>
    {m.marks.map((svg, i) => <span key={i} className="ga-mark" dangerouslySetInnerHTML={{ __html: svg }} />)}
  </span>
);
const COL_X = 148, COL_Y0 = 132, COL_GAP = 68;
const MOD_X = 1052, MOD_Y0 = 212, MOD_GAP = 80;
const CARD_W = 184;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => { const c = clamp(v); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
type Pt = [number, number];
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
};
// a fan-in wire from a card's right edge (wherever the card is right now) into the hub
const inPath = (x: number, y: number): [Pt, Pt, Pt, Pt] => [[x + CARD_W / 2 + 2, y], [x + CARD_W / 2 + 170, y], [HUB.x - HUB.r - 150, HUB.y], [HUB.x - HUB.r - 6, HUB.y]];
const outPath = (y: number): [Pt, Pt, Pt, Pt] => [[HUB.x + HUB.r + 4, HUB.y], [HUB.x + HUB.r + 160, HUB.y], [MOD_X - 106 - 150, y], [MOD_X - 106, y]];
const d = (c: [Pt, Pt, Pt, Pt]) => `M ${c[0][0]} ${c[0][1]} C ${c[1][0]} ${c[1][1]}, ${c[2][0]} ${c[2][1]}, ${c[3][0]} ${c[3][1]}`;

function Logo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ga-logo">
      <path d="M3 21V3h18v18H9V9h6v6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Gather() {
  const sec = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(() => matchMedia("(max-width: 900px)").matches);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const inLines = useRef<(SVGPathElement | null)[]>([]);
  const outLines = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const outDots = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const mq = matchMedia("(max-width: 900px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (narrow) return;
    const el = sec.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, visible = false;
    const t0 = performance.now();

    const draw = () => {
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
      // One thing at a time: the heading leaves, then the cards gather, then the wires draw, then the models.
      const h = smooth((p - 0.08) / 0.12);      // heading out (blurs away before anything moves)
      const a = smooth((p - 0.16) / 0.3);       // cards converge into the column
      const w = smooth((p - 0.48) / 0.12);      // wires draw from each card into the hub
      const hub = smooth((p - 0.42) / 0.12);    // the hub arrives once the centre is clear
      const b = smooth((p - 0.62) / 0.24);      // fan out to the models
      const time = reduce ? 0 : (performance.now() - t0) / 1000;
      el.style.setProperty("--h", h.toFixed(3));
      el.style.setProperty("--a", a.toFixed(3));
      el.style.setProperty("--w", w.toFixed(3));
      el.style.setProperty("--hub", hub.toFixed(3));
      el.style.setProperty("--b", b.toFixed(3));

      SOURCES.forEach((s, i) => {
        // each card leaves a beat after the one above it
        // Each card first settles into its own row, then slides along it into the column. Rows are 68
        // apart, so cards never pass over each other on the way.
        const k = clamp((p - 0.16 - i * 0.006) / 0.26);
        const ai = smooth(k), ky = smooth(k / 0.5), kx = smooth((k - 0.35) / 0.65);
        const bob = (1 - ky) * Math.sin(time * 0.8 + i * 1.7) * 5;
        const x = lerp(s.chaos[0], COL_X, kx), y = lerp(s.chaos[1], COL_Y0 + i * COL_GAP, ky) + bob;
        const c = cards.current[i];
        if (c) {
          c.style.left = `${(x / BW) * 100}%`; c.style.top = `${(y / BH) * 100}%`;
          c.style.setProperty("--tilt", `${((1 - ai) * (((i * 5) % 7) - 3) * 1.1).toFixed(2)}deg`);
          c.style.setProperty("--ai", ai.toFixed(3));
        }
        const curve = inPath(x, y);
        const line = inLines.current[i];
        if (line) { line.setAttribute("d", d(curve)); line.style.strokeDashoffset = `${1 - w}`; }
        // a dot of work travelling along each line once it has drawn in
        const dot = dots.current[i];
        if (dot) {
          const tt = (time * 0.3 + i * 0.137) % 1;
          const [dx, dy] = bez(...curve, tt);
          dot.setAttribute("cx", dx.toFixed(1)); dot.setAttribute("cy", dy.toFixed(1));
          dot.style.opacity = String(smooth((w - 0.85) / 0.15) * smooth(tt / 0.1) * smooth((1 - tt) / 0.1));
        }
      });
      MODELS.forEach((_, i) => {
        const line = outLines.current[i];
        if (line) line.style.strokeDashoffset = `${1 - b}`;
        const dot = outDots.current[i];
        if (dot) {
          const tt = (time * 0.36 + i * 0.21) % 1;
          const [dx, dy] = bez(...outPath(MOD_Y0 + i * MOD_GAP), tt);
          dot.setAttribute("cx", dx.toFixed(1)); dot.setAttribute("cy", dy.toFixed(1));
          dot.style.opacity = String(smooth((b - 0.85) / 0.15) * smooth(tt / 0.08) * smooth((1 - tt) / 0.08));
        }
      });
      raf = visible ? requestAnimationFrame(draw) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(el);
    draw();
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [narrow]);

  if (narrow) {
    return (
      <section className="sx ga narrow" data-surface="base" aria-labelledby="ga-title">
        <div className="sx-wrap">
          <h2 id="ga-title">Your work is scattered. <em>Grain gathers it.</em></h2>
          <div className="ga-list">
            {SOURCES.map((s) => (
              <div key={s.label} className="ga-card"><span className="msym">{s.icon}</span><span>{s.label}</span>{s.badge && <b className="ga-badge">{s.badge}</b>}</div>
            ))}
          </div>
          <div className="ga-hub-m"><SiriOrb size={76}><Logo /></SiriOrb><p>One place to take it in, run it and govern it.</p></div>
          <p className="ga-runs">Runs on the models you choose</p>
          <div className="ga-models">{MODELS.map((m) => <span key={m.name} className="ga-model"><Marks m={m} />{m.name}</span>)}</div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sec} className="ga" data-surface="base" aria-labelledby="ga-title">
      <div className="ga-stage">
        <div className="ga-box" style={{ aspectRatio: `${BW} / ${BH}` }}>
          <svg className="ga-lines" viewBox={`0 0 ${BW} ${BH}`} aria-hidden="true">
            <defs>
              {/* wires gather light toward the hub, and leave it carrying the hub's colours */}
              <linearGradient id="ga-g-in" gradientUnits="userSpaceOnUse" x1={COL_X + CARD_W / 2} y1="0" x2={HUB.x - HUB.r} y2="0">
                <stop offset="0" stopColor="var(--g-line)" /><stop offset=".55" stopColor="var(--g-accent)" stopOpacity=".55" /><stop offset="1" stopColor="var(--g-accent)" />
              </linearGradient>
              <linearGradient id="ga-g-out" gradientUnits="userSpaceOnUse" x1={HUB.x + HUB.r} y1="0" x2={MOD_X - 106} y2="0">
                <stop offset="0" stopColor="var(--g-cyan)" /><stop offset="1" stopColor="var(--g-line)" />
              </linearGradient>
            </defs>
            {SOURCES.map((s, i) => <path key={i} ref={(el) => { inLines.current[i] = el; }} className="ga-in" pathLength={1} d={d(inPath(s.chaos[0], s.chaos[1]))} />)}
            {MODELS.map((_, i) => <path key={i} ref={(el) => { outLines.current[i] = el; }} className="ga-out" pathLength={1} d={d(outPath(MOD_Y0 + i * MOD_GAP))} />)}
            {SOURCES.map((_, i) => <circle key={i} ref={(el) => { dots.current[i] = el; }} className="ga-dot" r="3.4" />)}
            {MODELS.map((_, i) => <circle key={i} ref={(el) => { outDots.current[i] = el; }} className="ga-dot out" r="3.4" />)}
          </svg>

          {/* beat 1 headline, then beat 2–3 caption */}
          <div className="ga-title one">
            <h2 id="ga-title">Repetitive work is <em>scattered.</em></h2>
            <div className="ga-facts">
              <span>Requests arrive by email, portal, chat and phone.</span>
              <span>The facts live in PDFs and spreadsheets.</span>
              <span>Someone stitches it together by hand.</span>
            </div>
          </div>
          <div className="ga-title two">
            <p className="ga-cap-a">Grain gathers it into one run</p>
            <p className="ga-cap-b">…and runs it on the models you choose</p>
          </div>

          {SOURCES.map((s, i) => (
            <div key={s.label} ref={(el) => { cards.current[i] = el; }} className="ga-card" data-k={i} style={{ left: `${(s.chaos[0] / BW) * 100}%`, top: `${(s.chaos[1] / BH) * 100}%` }}>
              {/* scattered: the real-looking thing; gathered: a compact chip (they cross-fade) */}
              <Replica kind={s.kind} />
              <span className="ga-chip"><span className="msym">{s.icon}</span><span className="ga-card-t">{s.label}</span></span>
              {s.badge && <b className="ga-badge">{s.badge}</b>}
            </div>
          ))}

          <div className="ga-hub-wrap" style={{ left: `${(HUB.x / BW) * 100}%`, top: `${(HUB.y / BH) * 100}%` }}>
            <SiriOrb size={120} className="ga-orb"><Logo /></SiriOrb>
            <span className="ga-hub-label">Grain</span>
          </div>

          {MODELS.map((m, i) => (
            <div key={m.name} className="ga-model" style={{ left: `${(MOD_X / BW) * 100}%`, top: `${((MOD_Y0 + i * MOD_GAP) / BH) * 100}%`, ["--i" as string]: i }}>
              <Marks m={m} />
              <span className="ga-model-t"><span className="ga-model-n">{m.name}</span><span className="ga-model-k">{m.note}</span></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
