// v3 hero: the product, live. A centred headline over one dark product window where a real run plays and
// stops for the visitor's approval (LiveRun.tsx). Below it a soft seam into the dark How it runs intro.
// No pinned scroll, no 3D: the run is the interaction.
import BeamButton from "./BeamButton";
import { useEffect, useRef, useState } from "react";
import HowItRuns from "./HowItRuns";
import Sections from "./Sections";
import GrainMark from "./GrainMark";
import LiveRun from "./LiveRun";
import type { Theme } from "./useTheme";
import "./grain-hero.css";

const navigation = [
  { label: "How it runs", href: "#how" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Use cases", href: "#uses" },
  { label: "Trust", href: "#trust" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const CONTACT = "https://www.grainlabs.ai/contact.html";

// nav link → the section it points at
const SPY: [string, string][] = [["#how", ".hw"], ["#capabilities", "#capabilities"], ["#uses", "#uses"], ["#trust", "#trust"], ["#faq", "#faq"], ["#contact", "#contact"]];

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" /></svg>
      )}
    </button>
  );
}

export default function GrainHero({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  // "go" starts the entrance sequence on the first frame
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(r); }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const root = rootRef.current;
      if (!root) return;
      // once you scroll, the nav becomes a solid bar
      root.classList.toggle("past-hero", window.scrollY > 24);
      // which section is under the nav decides its colours
      let surface = "base";
      root.querySelectorAll<HTMLElement>("[data-surface]").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.top <= 60 && b.bottom > 60) surface = el.dataset.surface || "base";
      });
      if (root.dataset.surface !== surface) root.dataset.surface = surface;
      // which section you're reading: its nav link gets the active pill
      const line = window.innerHeight * 0.35;
      let current = "";
      SPY.forEach(([href, sel]) => {
        const el = root.querySelector<HTMLElement>(sel);
        if (!el) return;
        const b = el.getBoundingClientRect();
        if (b.top <= line && b.bottom > line) current = href;
      });
      root.querySelectorAll<HTMLAnchorElement>(".desktop-nav a").forEach((a) => {
        const on = a.getAttribute("href") === current;
        a.classList.toggle("on", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className={`grain-hero intro${go ? " go" : ""}`} data-theme={theme}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Grain home">
          <GrainMark />
          Grain
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a key={item.label} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <BeamButton className="header-cta" href={CONTACT} size="sm" rest={0.7} theme={theme} arrowSize={14}>Start a workflow</BeamButton>
        </div>
      </header>

      <section className="hero lr-hero" id="top" aria-labelledby="hero-title">
        <div className="lr-head">
          <h1 id="hero-title">
            <span className="headline-line headline-line-muted"><span className="rise">AI operations your team</span></span>
            <span className="headline-line"><span className="rise">can trust to run.</span></span>
          </h1>
          <p className="hero-copy">
            Grain turns a request, its files and its rules into a tracked workflow. Agents do the work. Your people approve what matters.
          </p>
          <div className="ctas">
            <BeamButton className="primary-cta" href={CONTACT} theme={theme}>Start a workflow</BeamButton>
            <a className="secondary-cta" href="#how">See how it runs</a>
          </div>
        </div>
        <div className="lr-wrap"><LiveRun /></div>
      </section>

      {/* the page eases into the dark How it runs surface, which introduces itself */}
      <div className="seam seam-in" aria-hidden="true" />
      <section className="hw-intro" id="how" data-surface="dark" aria-labelledby="how-title">
        <h2 id="how-title">From request to reviewed output.</h2>
        <p>Every job becomes a tracked workflow, with task state, approvals and evidence attached from intake to delivery.</p>
      </section>

      <HowItRuns />
      <Sections theme={theme} />
    </div>
  );
}
