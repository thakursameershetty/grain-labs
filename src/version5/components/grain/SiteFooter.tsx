// Footer, in the site's own language: one rounded card (brand + CTA on the left, plain link columns on the
// right, a blueprint GRAIN in its own rounded panel, guarantees as pills along the bottom). Full page width.
import { useEffect, useRef, useState } from "react";
import GrainMark from "./GrainMark";
import BeamButton from "./BeamButton";
import "./site-footer.css";

const CONTACT = "https://www.grainlabs.ai/contact.html";
const EXPLORE: [string, string][] = [["How it runs", "#how"], ["Capabilities", "#capabilities"], ["Use cases", "#uses"], ["Trust", "#trust"]];
const FLEETS: [string, string][] = [
  ["Healthcare-bill advocacy", "advocacy-case-agent"], ["Franchise agreements", "franchise-agreement-agent"],
  ["Detention & demurrage", "dnd-dispute-agent"], ["Lien waivers", "lien-rights-sentinel"],
  ["Incident notification", "breach-notice-agent"], ["Contract-price audit", "case-price-audit"],
  ["Warranty claims", "warranty-claim-desk"], ["Retailer fines", "shipping-fine-recovery"],
];

export default function SiteFooter({ theme = "light" }: { theme?: "light" | "dark" }) {
  // the blueprint wordmark draws its outline in when it scrolls into view
  const word = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const el = word.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDrawn(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <footer className="sf" data-surface="base">
      <div className="sf-wrap">
        <div className="sf-card">
          <div className="sf-top">
            <div className="sf-brand">
              <a className="sf-logo" href="#top" aria-label="Grain home"><GrainMark className="sf-mark" />Grain</a>
              <p className="sf-tag">AI operations your team can trust to run.</p>
              <BeamButton className="sf-cta" href={CONTACT} theme={theme} size="sm" arrowSize={15}>Start a workflow</BeamButton>
            </div>
            <nav className="sf-cols" aria-label="Footer">
              <div>
                <p className="sf-k">Explore</p>
                <ul>{EXPLORE.map(([t, h]) => <li key={t}><a href={h}>{t}</a></li>)}</ul>
              </div>
              <div className="sf-fleets">
                <p className="sf-k">Fleets</p>
                <ul>{FLEETS.map(([t, f]) => <li key={f}><a href={`https://www.grainlabs.ai/use-cases/${f}.html`}>{t}</a></li>)}</ul>
              </div>
              <div>
                <p className="sf-k">Contact</p>
                <ul><li><a href={CONTACT}>Talk to us</a></li><li><a href="https://www.grainlabs.ai/">grainlabs.ai</a></li></ul>
              </div>
            </nav>
          </div>
          {/* the wordmark, drawn like a blueprint, in its own rounded panel */}
          <div className={`sf-word${drawn ? " drawn" : ""}`}>
            <i className="sf-ruler top" /><i className="sf-ruler bottom" />
            <b className="sf-plus tl" /><b className="sf-plus tr" /><b className="sf-plus bl" /><b className="sf-plus br" />
            <svg ref={word} viewBox="0 0 1000 210" role="img" aria-label="Grain">
              <g className="sf-guides">
                <line x1="20" y1="34" x2="980" y2="34" /><line x1="20" y1="105" x2="980" y2="105" /><line x1="20" y1="176" x2="980" y2="176" />
                {[118, 304, 500, 696, 882].map((x) => <line key={x} x1={x} y1="20" x2={x} y2="190" />)}
              </g>
              <text x="500" y="176" textAnchor="middle" textLength="930" lengthAdjust="spacingAndGlyphs">GRAIN</text>
            </svg>
          </div>
          <div className="sf-bottom">
            <ul className="sf-pills" aria-label="Every run is">
              <li>Governed</li><li>Durable</li><li>Approved</li><li>Inspectable</li>
            </ul>
            <p className="sf-copy">© 2026 Grain · Governed AI execution</p>
            <a className="sf-up" href="#top" aria-label="Back to top">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
