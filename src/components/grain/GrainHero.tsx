// Grain hero, based on the layout of Originkit Hero 40.
// Two dithered hands reach for each other: the agent (robot, bottom-left) and the person who signs off (top-right).
// Layout follows the diagonal the hands make: headline in the empty top-left, copy + buttons in the empty bottom-right.
// The original Hero 40 is untouched in src/components/originkit/.
import BeamButton from "./BeamButton";
import { useEffect, useRef, useState } from "react";
import DitherHands from "./dither-hands";
import HowItRuns from "./HowItRuns";
import Sections from "./Sections";
import AsciiField from "./AsciiField";
import GrainMark from "./GrainMark";
import RunScrubber from "./RunScrubber";
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

type RGB = [number, number, number];
// The touch: spark colours per theme. On paper a warm orange glow; on black a pale, hot white.
const SPARK: Record<Theme, { color: RGB; core: RGB }> = {
  light: { color: [0.69, 0.55, 1.0], core: [0.97, 0.97, 1.0] },     // Siri: coloured lobes (in the shader), white-hot core
  dark: { color: [0.69, 0.55, 1.0], core: [1.0, 1.0, 1.0] },
};
// The portal into the next section: its background and the ASCII inside it (match --next-bg / --next-muted in the CSS)
const PORTAL: Record<Theme, { bg: RGB; glyph: RGB }> = {
  light: { bg: [0.039, 0.039, 0.039], glyph: [0.69, 0.55, 1.0] },   // black (How it runs), violet characters
  dark: { bg: [0.039, 0.039, 0.039], glyph: [0.65, 0.55, 0.98] },
};
// Dither tints per theme (RGB 0–1): shadow dots and highlight dots, in neutral greys
const TINTS: Record<Theme, { dark: RGB; light: RGB }> = {
  light: { dark: [0.1, 0.1, 0.1], light: [0.66, 0.66, 0.66] },
  // on near-black both tints sit higher, so the hands glow instead of turning muddy
  dark: { dark: [0.3, 0.3, 0.3], light: [0.94, 0.94, 0.94] },
};


// nav link → the section it points at (How it runs is the dark section after the portal)
const SPY: [string, string][] = [["#how", ".hw"], ["#capabilities", "#capabilities"], ["#uses", "#uses"], ["#trust", "#trust"], ["#faq", "#faq"], ["#contact", "#contact"]];

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === "dark" ? (
        // sun
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>
      ) : (
        // moon
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" /></svg>
      )}
    </button>
  );
}

export default function GrainHero({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  // "go" starts the text sequence. It is triggered by the hands image loading,
  // with a fallback so the text never stays hidden if the image is slow or fails.
  const [go, setGo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 2500);
    return () => clearTimeout(t);
  }, []);

  // Scroll progress through the pinned hero, 0–1. The shader reads the ref every frame;
  // CSS reads --p to fade the text out as the hands meet. No React re-renders while scrolling.
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const revealRef = useRef<HTMLDivElement>(null);
  // the portal's inner layers (living ASCII, step preview) only run once it is open
  const [portalOpen, setPortalOpen] = useState(false);
  const openRef = useRef(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const box = scrollBoxRef.current;
      if (!box) return;
      const r = box.getBoundingClientRect();
      const range = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / range));
      progress.current = p;
      const root = rootRef.current;
      if (!root) return;
      root.style.setProperty("--p", p.toFixed(4));
      const open = openRef.current ? p > 0.5 : p > 0.58;   // a little hysteresis so it doesn't flicker
      if (open !== openRef.current) { openRef.current = open; setPortalOpen(open); }
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
      {/* Site-wide nav (fixed). Over the hero it floats on the page; it steps aside while the portal
          opens, then returns as a solid bar in the colours of whichever section is underneath. */}
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Grain home">
        <GrainMark />
        Grain
      </a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {navigation.map((item) => (
          <a key={item.label} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <BeamButton className="header-cta" href={CONTACT} size="sm" rest={0.7} theme={theme} arrowSize={14}>Start a workflow</BeamButton>
      </div>
    </header>
      {/* tall box: the hero stays pinned while this scrolls past, and that scroll drives the touch */}
      {/* data-surface: once the pin releases, what is left on screen is the portal (inverse surface) */}
      <div className="hero-scroll" ref={scrollBoxRef} data-surface="dark">
      <section className="hero" id="top">
        {/* the big blocky word behind the hands (Zen Dots), like "ROBO" in the reference Shiva liked */}
        <div className="bigword" aria-hidden="true">
          {"GRAIN".split("").map((ch, i) => (
            <span key={i} style={{ ["--i" as string]: i }}>{ch}</span>
          ))}
        </div>

        <div className="dither-layer" aria-hidden="true">
          {/* intro: the hands slide in from opposite corners and reach toward each other (~2.8s);
              the text is timed in grain-hero.css to arrive as they settle */}
          <DitherHands
            image={{ src: "/grain/hands.png", alt: "" }}
            dark={TINTS[theme].dark}
            light={TINTS[theme].light}
            cutout // hands.png has a real transparent background (see public/grain/hands-source.png for the original)
            intro
            onIntroStart={() => setGo(true)}
            // resting sway: Originkit's default is 82 (strong); 28 keeps a gentle breathing motion.
            // Speed also sets how far the image bends, so lowering it calms both.
            waveSpeed={28}
            // the touch: scrolling closes the gap, then a spark and an ASCII ripple
            scrollRef={progress}
            revealRef={revealRef}
            nextBg={PORTAL[theme].bg}
            nextGlyph={PORTAL[theme].glyph}
            sparkColor={SPARK[theme].color}
            sparkCore={SPARK[theme].core}
          />
        </div>


        {/* the text fades back as the hands meet (see .hero-ui in the CSS) */}
        <div className="hero-ui">
        {/* top-left, above the robot hand */}
        <div className="hero-head">
          <h1 id="hero-title">
            <span className="headline-line headline-line-muted"><span className="rise">AI operations your team</span></span>
            <span className="headline-line"><span className="rise">can trust to run.</span></span>
          </h1>
        </div>

        {/* bottom-right, below the human hand */}
        <div className="hero-side">
          <p className="hero-copy">
            Grain turns a request, its files and its rules into a tracked workflow. Agents do the work. Your people approve what matters.
          </p>
          <div className="ctas">
            <BeamButton className="primary-cta" href={CONTACT} theme={theme}>Start a workflow</BeamButton>
            <a className="secondary-cta" href="#how">
              See how it runs
            </a>
          </div>
        </div>

        <footer className="hero-footer">
          <a className="scroll-cue" href="#how">
            scroll <span aria-hidden="true">↓</span>
          </a>
        </footer>
        </div>

        {/* The next section opens through the ripple: this layer is clipped to the ring's circle
            (--rx/--ry/--rr come from dither-hands.tsx every frame). By the end of the scroll it fills
            the screen, and the section simply continues below in the same colours. */}
        <div className={`next-reveal${portalOpen ? " open" : ""}`} ref={revealRef}>
          {/* the portal stays alive after it opens: its ASCII keeps drifting, faint and clear of the text */}
          {portalOpen && <AsciiField className="nr-ascii" calm={[0.22, 0.78]} />}
          {/* a preview of what's next: a vertical scrubber through the five steps, bottom-right */}
          <RunScrubber running={portalOpen} />
          <div className="next-reveal-in">
            <h2>From request to reviewed output.</h2>
            <p className="next-lead">Every job becomes a tracked workflow, with task state, approvals and evidence attached from intake to delivery.</p>
          </div>
        </div>
      </section>
        {/* #how lands exactly where the opening completes, so "See how it runs" scrolls through the whole touch */}
        <span className="how-anchor" id="how" aria-hidden="true" />
      </div>

      {/* the rest of "How it runs" continues straight on from the portal, in the same colours */}
      <HowItRuns />

      {/* What Grain hands back · Capabilities · Use cases · Trust · CTA · Footer */}
      <Sections theme={theme} />
    </div>
  );
}
