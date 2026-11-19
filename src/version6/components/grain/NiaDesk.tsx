// Nia's desk (v6, the "Nia" section): one scene where Nia works through three asks, so the section shows what she
// does instead of describing it. The asks play in order on their own while the desk is on screen; click any to jump.
//   1 · Sort what came in   four things arrive and Nia routes each one to the job it belongs to
//   2 · Draft the appeal    a letter writes itself, every claim carrying its source
//   3 · Send it to the payer Nia prepares the send and stops: a person approves (you, or the Advocate after a moment)
// Nia is the 3D one here (Nia3D): her face follows along (works, is pleased when a step lands, waits at the gate,
// hearts when approved), and she can be hovered, clicked and dragged.
// Case details are illustrative, like the rest of the page.
import { useEffect, useRef, useState } from "react";
import Nia3D from "@/version6/brand/Nia3D";
import type { NiaMood } from "./Nia";
import "./nia-desk.css";

export type NiaStep = 0 | 1 | 2;

const ASKS = ["Sort what came in", "Draft the appeal", "Send it to the payer"];
const STEP_MS = 4400;      // a working step, including its pause once done
const DONE_AT = 3000;      // when a working step's work has landed
const AUTO_APPROVE = 5200; // the Advocate approves if nobody does
const AFTER_SEND = 3400;   // pause on "sent" before starting over

const ITEMS = [
  { icon: "picture_as_pdf", t: "Bill from Northside Clinic", m: "PDF · $1,284", to: "Billing dispute" },
  { icon: "mail", t: "EOB from the payer", m: "Email · 2 pages", to: "Billing dispute" },
  { icon: "voicemail", t: "Voicemail from the patient", m: "Transcript · 0:48", to: "Case notes" },
  { icon: "description", t: "Plan document", m: "PDF · 64 pages", to: "Rules" },
];
// the letter: plain text with [source] chips
const LETTER: (string | { src: string })[][] = [
  ["Re: the claim denied for an out-of-network charge."],
  ["The visit was an emergency, which the plan covers at the in-network rate ", { src: "Plan §4.3" }, "."],
  ["The EOB lists the provider as out-of-network ", { src: "EOB p.2" }, "."],
  ["The bill charges the full out-of-network amount ", { src: "Bill p.1" }, "."],
  ["Please reprocess the claim at the in-network rate."],
];
const SAYS: [string, string][] = [
  ["Four new things came in. Sorting them…", "Sorted. Two belong to the billing dispute."],
  ["Drafting the appeal from the EOB and the plan…", "Draft ready. Every claim points to its source."],
  ["Ready to send. I'll wait for your OK.", "Sent, with the evidence attached."],
];

export default function NiaDesk({ onStep }: { onStep?: (s: NiaStep) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<NiaStep>(0);
  const [t, setT] = useState(0);                       // ms into the current step
  const [approved, setApproved] = useState<null | { by: "you" | "Advocate"; at: number }>(null);
  const [inView, setInView] = useState(false);
  const [small] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches);
  const reduce = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => { onStep?.(step); }, [step, onStep]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the clock: runs only while the desk is on screen
  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(() => setT((v) => v + 100), 100);
    return () => clearInterval(id);
  }, [inView]);

  const go = (s: NiaStep) => { setStep(s); setT(reduce.current ? DONE_AT : 0); setApproved(null); };
  const approve = (by: "you" | "Advocate") => setApproved((a) => a ?? { by, at: t });

  // advance: working steps move on by themselves; the send waits for an approval
  useEffect(() => {
    if (step < 2 && t >= STEP_MS) go((step + 1) as NiaStep);
    else if (step === 2 && !approved && t >= AUTO_APPROVE) approve("Advocate");
    else if (step === 2 && approved && t - approved.at >= AFTER_SEND) go(0);
  }, [t, step, approved]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = step < 2 ? t >= DONE_AT : !!approved;
  const mood: NiaMood = step === 2 ? (approved ? "love" : "idle") : done ? "happy" : "work";
  const say = SAYS[step][done ? 1 : 0];

  // per-step progress
  const itemsIn = Math.min(ITEMS.length, Math.floor(t / 520));          // 1 · items arriving
  const routed = (i: number) => t >= 520 * (i + 1) + 380;              //     … then routed
  const linesIn = Math.min(LETTER.length, Math.floor(t / 520) + 1);     // 2 · lines writing

  return (
    <div className="nd" ref={host}>
      <div className="nd-asks" role="tablist" aria-label="What Nia is doing">
        {ASKS.map((a, i) => (
          <button key={a} type="button" role="tab" aria-selected={step === i} className={step === i ? "on" : ""} onClick={() => go(i as NiaStep)}>
            <span className="nd-n">{i + 1}</span>{a}
            {step === i && <i className="nd-bar" style={{ transform: `scaleX(${step < 2 ? Math.min(1, t / STEP_MS) : approved ? 1 : Math.min(1, t / AUTO_APPROVE)})` }} />}
          </button>
        ))}
      </div>

      <div className="nd-desk">
        <div className="nd-nia">
          <Nia3D size={small ? 120 : 220} mood={mood} label="Nia, Grain's agent. Click her, or drag to spin." />
          <p className="nd-say" key={`${step}-${done}`} aria-live="polite">{say}</p>
        </div>

        <div className="nd-work" key={step}>
          {step === 0 && (
            <ul className="nd-items">
              {ITEMS.map((it, i) => (
                <li key={it.t} className={`${i < itemsIn ? "in" : ""}${routed(i) ? " routed" : ""}`}>
                  <span className="msym" aria-hidden="true">{it.icon}</span>
                  <span className="nd-it"><b>{it.t}</b><small>{it.m}</small></span>
                  <span className="nd-to">→ {it.to}</span>
                </li>
              ))}
            </ul>
          )}

          {step === 1 && (
            <article className="nd-doc">
              <header><b>Appeal · out-of-network charge</b><small>Draft · by Nia</small></header>
              {LETTER.map((line, i) => (
                <p key={i} className={i < linesIn ? "in" : ""}>
                  {line.map((part, j) => (typeof part === "string" ? <span key={j}>{part}</span> : <em key={j} className="nd-src">{part.src}</em>))}
                  {i === linesIn - 1 && !done && <i className="nd-caret" aria-hidden="true" />}
                </p>
              ))}
            </article>
          )}

          {step === 2 && (
            <div className={`nd-send${approved ? " sent" : ""}`}>
              <dl>
                <div><dt>To</dt><dd>Payer appeals desk</dd></div>
                <div><dt>Attached</dt><dd>Appeal letter · EOB · Plan excerpt</dd></div>
                <div><dt>Evidence</dt><dd>3 sources linked, checkpoint saved</dd></div>
              </dl>
              <div className="nd-gate">
                {approved ? (
                  <p className="nd-ok"><span className="nd-tick" aria-hidden="true" />Sent · approved by {approved.by}</p>
                ) : (
                  <>
                    <p><span className="nd-wait" aria-hidden="true" />Nia is waiting for your OK</p>
                    <button type="button" onClick={() => approve("you")}>Approve and send</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
