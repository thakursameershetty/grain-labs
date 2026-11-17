// Use cases. Every fleet shares one anatomy (ledger → gate → reviewer → outbound), so it's shown once, in a
// strip above the grid; hovering a card fills that strip with the fleet's own steps. Each card leads with a
// small replica of the document that fleet actually works on, which plays a little on hover.
import { useRef, useState, type ReactNode } from "react";
import { ArrowUpRightIcon } from "@/version2/components/ui/arrow-up-right";
import { LayersIcon } from "@/version2/components/ui/layers";
import { ShieldCheckIcon } from "@/version2/components/ui/shield-check";
import { ScanTextIcon } from "@/version2/components/ui/scan-text";
import { SendIcon } from "@/version2/components/ui/send";
import "./use-cases.css";

type Anim = { startAnimation: () => void; stopAnimation: () => void };
const USES = [
  { i: "Healthcare", g: "Finance & claims", t: "Patient healthcare-bill advocacy", d: "Months-long cases built from bills, EOBs and collection letters, with appeal and charity-care clocks.", f: "advocacy-case-agent", s: ["Match charges to the EOB", "Check appeal rules", "Review the appeal", "Send to the insurer"] },
  { i: "Franchising", g: "Legal & contracts", t: "Franchise agreement assembly", d: "Deal documents become a state-compliant agreement packet.", f: "franchise-agreement-agent", s: ["Pull the deal terms", "Check state law", "Review the clauses", "Send for signing"] },
  { i: "Logistics", g: "Finance & claims", t: "Detention & demurrage disputes", d: "Rebuilds free-time math and voids defective container charges inside the 30-day window.", f: "dnd-dispute-agent", s: ["Rebuild free time", "Check the 30-day window", "Review the dispute", "File with the carrier"] },
  { i: "Construction", g: "Legal & contracts", t: "Lien waiver exchange & deadlines", d: "Waivers chased every pay cycle and matched to pay apps against per-state lien deadlines.", f: "lien-rights-sentinel", s: ["Match pay apps", "Check lien deadlines", "Review the waivers", "Chase signatures"] },
  { i: "Legal & privacy", g: "Legal & contracts", t: "Incident notification matrix", d: "One discovery date mapped against GDPR's 72 hours, HIPAA, 50 state statutes and contract clocks.", f: "breach-notice-agent", s: ["Map every clock", "Check the statutes", "Review the notices", "Send the notices"] },
  { i: "Food service", g: "Operations", t: "Supplier contract-price audit", d: "Checks 300 invoice lines a week against the contracted price list, inside the dispute window.", f: "case-price-audit", s: ["Match 300 lines", "Check contract prices", "Review overcharges", "Send the dispute"] },
  { i: "Equipment dealers", g: "Operations", t: "Warranty claim recovery", d: "Files each warranty repair correctly before the window closes.", f: "warranty-claim-desk", s: ["Match the repairs", "Check warranty rules", "Review the claim", "File the claim"] },
  { i: "Consumer brands", g: "Finance & claims", t: "Retailer fine recovery", d: "A third of retailer compliance fines are wrong. Dispute them before the 30–90 day deadline.", f: "shipping-fine-recovery", s: ["Match the fines", "Check the rulebook", "Review the disputes", "Send the disputes"] },
];
const GROUPS = ["All", "Finance & claims", "Legal & contracts", "Operations"];
const ANATOMY: { n: string; d: string; I: typeof LayersIcon }[] = [
  { n: "Ledger", d: "Cross-checks every source", I: LayersIcon },
  { n: "Gate", d: "Checks the written rulebook", I: ShieldCheckIcon },
  { n: "Reviewer", d: "A second agent reviews the work", I: ScanTextIcon },
  { n: "Outbound", d: "Sent once a person approves", I: SendIcon },
];

/* ── the eight illustrations: small, plain replicas of the real documents ── */
const Row = ({ l, r, k = "" }: { l: ReactNode; r: ReactNode; k?: string }) => <div className={`ua-row ${k}`}><span>{l}</span><span>{r}</span></div>;
function Art({ i }: { i: number }) {
  switch (i) {
    case 0: return (
      <div className="ua-doc">
        <p className="ua-h">Itemized statement</p>
        <Row l="Room and board" r="$2,140.00" />
        <Row l="Lab panel" r="$418.00" />
        <Row l="Lab panel" r="$418.00" k="bad strike" />
        <Row l="Pharmacy" r="$96.40" />
        <span className="ua-tag bad">Duplicate charge</span>
      </div>);
    case 1: return (
      <div className="ua-doc">
        <p className="ua-h">Franchise agreement</p>
        <p className="ua-sub">State of California · Rev. 2026</p>
        <i className="ua-l" style={{ width: "92%" }} /><i className="ua-l" style={{ width: "80%" }} /><i className="ua-l" style={{ width: "86%" }} />
        <div className="ua-sign">
          <svg viewBox="0 0 120 30" aria-hidden="true"><path className="ua-scribble" d="M4 22c8-14 14-16 16-8s-4 10 2 4 10-14 14-10-2 12 6 8 10-10 16-6 4 8 12 4 14-8 22-6 10 4 16 2" /></svg>
          <span>Franchisee</span>
        </div>
        <span className="ua-seal ok">State check ✓</span>
      </div>);
    case 2: return (
      <div className="ua-doc">
        <p className="ua-h">Detention invoice</p>
        <p className="ua-sub">MSKU 482193-0 · Port of Oakland</p>
        <Row l="Free time" r="4 days" />
        <Row l="Detention · 6 days × $150" r="$900.00" k="strike-h" />
        <Row l="Corrected · 2 days" r="$300.00" k="ok-h" />
        <span className="ua-stamp">Void</span>
      </div>);
    case 3: return (
      <div className="ua-cal">
        <div className="ua-cal-h"><span>Lien deadlines · May</span><span className="ua-tag wait">3 waivers out</span></div>
        <div className="ua-cal-g">
          {Array.from({ length: 21 }, (_, d) => <span key={d} className={d === 16 ? "due" : d === 9 || d === 12 ? "got" : ""}>{d + 1}</span>)}
        </div>
      </div>);
    case 4: return (
      <div className="ua-doc ua-clocks">
        <p className="ua-h">Discovered May 2 · 09:14</p>
        {[["GDPR", "72 h", 72], ["HIPAA", "60 d", 30], ["California", "45 d", 42], ["Contract · Acme", "5 d", 88]].map(([n, t, p]) => (
          <div key={n as string} className="ua-clock"><span>{n}</span><b><i style={{ ["--p" as string]: `${p}%` }} /></b><span>{t}</span></div>
        ))}
      </div>);
    case 5: return (
      <div className="ua-doc ua-audit">
        <div className="ua-row ua-th"><span>Item</span><span>Invoiced</span><span>Contract</span></div>
        <div className="ua-row"><span>Chicken breast</span><span>$3.42</span><span>$3.42</span></div>
        <div className="ua-row bad"><span>Russet potatoes</span><span>$4.18</span><span>$3.90</span></div>
        <div className="ua-row"><span>Fryer oil</span><span>$28.60</span><span>$28.60</span></div>
        <div className="ua-row bad"><span>Romaine</span><span>$2.75</span><span>$2.40</span></div>
        <i className="ua-scan" />
      </div>);
    case 6: return (
      <div className="ua-doc">
        <p className="ua-h">Warranty claim</p>
        <p className="ua-sub">Repair order 10442 · Excavator 320</p>
        <Row l="Part" r="Hydraulic pump" />
        <Row l="Labor" r="6.5 h" />
        <span className="ua-tag wait ua-window">Window closes in 9 days</span>
        <span className="ua-stamp ok">Filed</span>
      </div>);
    default: return (
      <div className="ua-doc">
        <p className="ua-h">Compliance fine</p>
        <p className="ua-sub">Retailer chargeback · PO 88213</p>
        <Row l="Late ASN" r="$500.00" />
        <Row l="Carton label" r="$250.00" />
        <Row l="Proof of on-time ASN" r="attached" k="ok-h" />
        <span className="ua-stamp bad">Disputed</span>
      </div>);
  }
}

function Card({ u, k, onHover }: { u: (typeof USES)[number]; k: number; onHover: (i: number | null) => void }) {
  const arrow = useRef<Anim>(null);
  const idx = USES.indexOf(u);
  return (
    <a className={`ua-card t-${GROUPS.indexOf(u.g)}`} style={{ ["--k" as string]: k }} href={`https://www.grainlabs.ai/use-cases/${u.f}.html`}
      onPointerEnter={() => { onHover(idx); arrow.current?.startAnimation(); }}
      onPointerLeave={() => { onHover(null); arrow.current?.stopAnimation(); }}
      onFocus={() => onHover(idx)} onBlur={() => onHover(null)}>
      <div className="ua-art" aria-hidden="true"><Art i={idx} /></div>
      <div className="ua-body">
        <span className="ua-ind">{u.i}</span>
        <h3>{u.t}</h3>
        <p>{u.d}</p>
        <span className="ua-foot"><span className="ua-fleet">{u.f}</span><ArrowUpRightIcon ref={arrow} size={16} /></span>
      </div>
    </a>
  );
}

export default function UseCasesGrid({ head }: { head: ReactNode }) {
  const [g, setG] = useState("All");
  const [hover, setHover] = useState<number | null>(null);
  const icons = useRef<(Anim | null)[]>([]);
  const list = USES.filter((u) => g === "All" || u.g === g);
  const hu = hover === null ? null : USES[hover];
  const setH = (i: number | null) => {
    setHover(i);
    if (i !== null) icons.current.forEach((ic, j) => window.setTimeout(() => ic?.startAnimation(), j * 220));
  };
  return (
    <>
      {head}
      {/* the shared anatomy, shown once */}
      <div className={`ua-anatomy rv${hu ? " live" : ""}`}>
        <div className="ua-an-top">
          <p>Every fleet runs the same four steps</p>
          <p className="ua-an-who" key={hu?.f ?? "all"}>{hu ? hu.f : "Hover a use case to see its steps"}</p>
        </div>
        <ol>
          {ANATOMY.map((a, j) => (
            <li key={a.n} style={{ ["--s" as string]: j }}>
              <span className="ua-an-ico"><a.I ref={(el: Anim | null) => { icons.current[j] = el; }} size={18} /></span>
              <span className="ua-an-t">
                <b>{a.n}</b>
                <span key={hu?.f ?? "all"}>{hu ? hu.s[j] : a.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="ua-filters rv" role="tablist" aria-label="Filter use cases">
        {GROUPS.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={g === x} className={g === x ? "on" : ""} onClick={() => setG(x)}>{x}</button>
        ))}
      </div>
      <div className="ua-grid" key={g}>{list.map((u, k) => <Card key={u.f} u={u} k={k} onHover={setH} />)}</div>
    </>
  );
}
