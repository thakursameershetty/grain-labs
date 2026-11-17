// v2 hero: clean and minimal, one interactive object.
// The Block G as a dark-metal object stands in front of a huge Audiowide "GRAIN" (layout after the Matter template:
// headline top-left, copy top-right, a bobbing scroll arrow bottom-right).
// Scroll: the hero is pinned; the G turns edge-on to a sliver, the page dims to the How it runs surface,
// and one line of light draws down from the G into that section.
import BeamButton from "./BeamButton";
import { useEffect, useRef, useState } from "react";
import HowItRuns from "./HowItRuns";
import Sections from "./Sections";
import GrainMark from "./GrainMark";
import MarkObject from "@/version2/brand/MarkObject";
import { MARKS } from "@/version2/brand/marks";
import type { Theme } from "./useTheme";
import "./grain-hero.css";

const BLOCK = MARKS.find((m) => m.id === "block")!;

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

/** Scroll cue: a plain arrow that bobs gently, bottom-right. */
function ScrollArrow() {
  return (
    <a className="scroll-arrow" href="#how" aria-label="Scroll to see how it runs">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M6 13l6 6 6-6" /></svg>
    </a>
  );
}

export default function GrainHero({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  // "go" starts the entrance sequence on the first frame (nothing to wait for: the G renders immediately)
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(r); }, []);

  // Scroll progress through the pinned hero, 0–1. The G reads the ref every frame;
  // CSS reads --p for the dimming, the fades and the line. No React re-renders while scrolling.
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const box = scrollBoxRef.current;
      const root = rootRef.current;
      if (!box || !root) return;
      const r = box.getBoundingClientRect();
      const range = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / range));
      progress.current = p;
      root.style.setProperty("--p", p.toFixed(4));
      // once the pin has released, the nav comes back as a solid bar
      root.classList.toggle("past-hero", p >= 1 && r.bottom < window.innerHeight - 40);
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

      {/* tall box: the hero stays pinned while this scrolls past, and that scroll turns the G */}
      <div className="hero-scroll" ref={scrollBoxRef} data-surface="dark">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="bigword" aria-hidden="true">GRAIN</div>

          <MarkObject mark={BLOCK} className="hero-object" progress={progress} />
          <span className="hero-thread" aria-hidden="true" />

          {/* the hand-off: the How it runs heading sits above the line, then the section takes over */}
          <div className="hero-next">
            <h2>From request to reviewed output.</h2>
            <p className="next-lead">Every job becomes a tracked workflow, with task state, approvals and evidence attached from intake to delivery.</p>
          </div>

          <div className="hero-ui">
            <div className="hero-head">
              <h1 id="hero-title">
                <span className="headline-line headline-line-muted"><span className="rise">AI operations your team</span></span>
                <span className="headline-line"><span className="rise">can trust to run.</span></span>
              </h1>
            </div>

            <div className="hero-side">
              <p className="hero-copy">
                Grain turns a request, its files and its rules into a tracked workflow. Agents do the work. Your people approve what matters.
              </p>
              <div className="ctas">
                <BeamButton className="primary-cta" href={CONTACT} theme={theme}>Start a workflow</BeamButton>
                <a className="secondary-cta" href="#how">See how it runs</a>
              </div>
            </div>

            <ScrollArrow />
          </div>
        </section>
        {/* #how lands where the hand-off completes */}
        <span className="how-anchor" id="how" aria-hidden="true" />
      </div>

      <HowItRuns />
      <Sections theme={theme} />
    </div>
  );
}
