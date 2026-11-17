// FAQ and Contact, in the page's language: rounded cards, soft surfaces, pills, Siri accents.
// FAQ answers only restate what Grain's own copy says (no claims we can't back).
// The contact form posts to FORM_ENDPOINT once one exists; until then it opens Grain's contact page.
import { useEffect, useRef, useState, type FormEvent } from "react";
import BeamButton from "./BeamButton";
import "./faq-contact.css";

const CONTACT = "https://www.grainlabs.ai/contact.html";
/** set to a form backend (e.g. a Formspree or HubSpot form URL) to receive submissions here */
const FORM_ENDPOINT = "";

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      es.filter((e) => e.isIntersecting).forEach((e, k) => {
        const n = e.target as HTMLElement;
        n.style.setProperty("--d", `${Math.min(k, 9) * 90}ms`);
        n.setAttribute("data-in", "");
        io.unobserve(n);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    el.querySelectorAll(".rv").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ───────────── FAQ ───────────── */
const FAQS: [string, string][] = [
  ["What does Grain actually do?",
   "Grain turns a request, its files and its rules into a tracked workflow. It routes the job to the right agent, runs the steps, pauses for the decisions a person should make, and hands back an output with its evidence attached."],
  ["How is this different from a chatbot?",
   "You get a finished packet, not a chat reply: review-ready documents, each carrying its source references, content hash, checkpoint and run details, ready to send or archive."],
  ["What happens when a step fails?",
   "Steps run with checkpoints and retries. When something breaks, like a portal timing out, the run resumes from its last known-good state instead of starting over."],
  ["Who approves what?",
   "Consequential steps pause for a named person. Grain does the legwork; your team makes the calls that matter, and every approval is recorded on the task."],
  ["Can we see where an output came from?",
   "Yes. Every deliverable links back to its runs, artifacts and lineage, so any claim in an output traces to the source it came from before anything ships."],
  ["How is sensitive data handled?",
   "Runtime logs leave out prompts, raw content and sensitive text. That detail lives in private journals, and opening one is itself recorded."],
  ["Which models does it run on?",
   "Models are set by each agent's profile. Profiles, skills, tools and models are versioned, so what runs is exactly what was approved."],
  ["How do we start?",
   "Bring one recurring job. Grain will take it in, route it, run it, and hand back an output you can inspect."],
];

export function Faq() {
  const ref = useReveal<HTMLElement>();
  const [open, setOpen] = useState(0);
  return (
    <section className="sx fq" id="faq" data-surface="base" ref={ref} aria-labelledby="fq-title">
      <div className="sx-wrap fq-grid">
        <div className="fq-intro">
          <h2 className="rv" id="fq-title">Questions, answered.</h2>
          <p className="sx-sub rv">What teams ask before their first run. For anything specific to your work, we'd rather walk through it with you.</p>
          <a className="fq-ask rv" href="#contact">Ask us something else <span aria-hidden="true">→</span></a>
        </div>
        <ul className="fq-list">
          {FAQS.map(([q, a], i) => {
            const on = open === i;
            return (
              <li key={q} className={`fq-item rv${on ? " on" : ""}`}>
                <button type="button" aria-expanded={on} aria-controls={`fq-a${i}`} onClick={() => setOpen(on ? -1 : i)}>
                  <span>{q}</span>
                  <i className="fq-plus" aria-hidden="true" />
                </button>
                <div className="fq-a" id={`fq-a${i}`} role="region"><div><p>{a}</p></div></div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Contact ───────────── */
const AREAS = ["Finance & claims", "Legal & contracts", "Operations", "Something else"];
const NEXT = [
  ["We look at the job with you", "Which requests come in, what files and rules they carry, and who signs off."],
  ["Grain runs it on your material", "The same steps, with checkpoints, approvals and evidence."],
  ["You review the packet", "Every output traced to its source before anything ships."],
];

export function Contact({ theme = "light" }: { theme?: "light" | "dark" }) {
  const ref = useReveal<HTMLElement>();
  const [area, setArea] = useState(AREAS[0]);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!FORM_ENDPOINT) { window.open(CONTACT, "_blank", "noopener"); return; }   // no backend yet: use Grain's contact page
    setState("sending");
    try {
      const r = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...data, area }) });
      setState(r.ok ? "sent" : "error");
    } catch { setState("error"); }
  };
  return (
    <section className="sx ct2" id="contact" data-surface="base" ref={ref} aria-labelledby="ct2-title">
      <div className="sx-wrap">
        <div className="ct2-card rv">
          <div className="ct2-left">
            <h2 id="ct2-title">Tell us about one job.</h2>
            <p className="sx-sub">Pick one your team repeats every week. We'll show you how Grain would run it, start to finish.</p>
            <ol className="ct2-next">
              {NEXT.map(([t, d], i) => (
                <li key={t}><span className="ct2-n">{i + 1}</span><span><b>{t}</b><span>{d}</span></span></li>
              ))}
            </ol>
            <p className="ct2-alt">Prefer email or a call? <a href={CONTACT}>Use the contact page →</a></p>
          </div>

          <form className="ct2-form" onSubmit={submit}>
            {state === "sent" ? (
              <div className="ct2-done" role="status">
                <span className="ct2-tick" aria-hidden="true">✓</span>
                <p><b>Thanks, it's with us.</b> We'll be in touch about your workflow.</p>
              </div>
            ) : (
              <>
                <div className="ct2-row">
                  <label><span>Name</span><input name="name" autoComplete="name" required /></label>
                  <label><span>Work email</span><input name="email" type="email" autoComplete="email" required /></label>
                </div>
                <label><span>Company</span><input name="company" autoComplete="organization" /></label>
                <fieldset>
                  <legend>Area</legend>
                  <div className="ct2-chips">
                    {AREAS.map((a) => (
                      <button key={a} type="button" className={a === area ? "on" : ""} aria-pressed={a === area} onClick={() => setArea(a)}>{a}</button>
                    ))}
                  </div>
                </fieldset>
                <label><span>The recurring job</span>
                  <textarea name="job" rows={4} placeholder="e.g. Every week we dispute retailer fines: we gather the PO, the ASN and the carrier proof, then file before the deadline." />
                </label>
                <div className="ct2-send">
                  <SubmitBeam theme={theme} busy={state === "sending"} />
                  {state === "error" && <p className="ct2-err" role="alert">Couldn't send that. Try again, or use the contact page.</p>}
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

/* the submit uses the same beam treatment as the other main buttons */
function SubmitBeam({ theme, busy }: { theme: "light" | "dark"; busy: boolean }) {
  return (
    <span className="ct2-submit">
      <BeamButton submit disabled={busy} theme={theme} className="ct2-btn">{busy ? "Sending…" : "Send"}</BeamButton>
    </span>
  );
}
