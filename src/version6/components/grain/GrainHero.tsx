// v6 hero (rebuilt 2026-11-18 after Shiva's review of v4, which said the 3D boxy mark looked dated):
// a stage in the page's theme (paper in light, near-black in dark). The Grain mark is a thin 3D wireframe (WireMark) that sways slowly and goes soft
// and foggy around the cursor; the headline sits centred over it; outlined pills along the bottom.
// No big GRAIN word. Opening: Loader builds the 2D mark and flies it into the nav, then the wireframe draws in.
// Scroll: the hero is pinned; the wireframe turns, grows and fogs out, and How it runs introduces itself.
// Theme switch lives in the palette notch (bottom-left), not the nav.
// Nav: NavPill, one pill that stretches like liquid between tabs and goes soft-edged while it moves.
import { HOME } from "@/version6/base";
import { useEffect, useRef, useState } from "react";
import HowItRuns from "./HowItRuns";
import NavPill from "./NavPill";
import useLiquidGlass from "./useLiquidGlass";
import Sections from "./Sections";
import GrainMark from "./GrainMark";
import WireMark from "@/version6/brand/WireMark";
import Loader from "./Loader";
import PalettePicker from "./PalettePicker";
import type { Palette, Theme } from "./useTheme";
import "./grain-hero.css";
import "./palette.css";

// the opening plays on every visit, except for people who ask for less motion
const PLAY_INTRO = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const navigation = [
  { label: "How it runs", href: "#how" },
  { label: "Nia", href: "#nia" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Use cases", href: "#uses" },
  { label: "Trust", href: "#trust" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
  { label: "Articles", href: `${HOME}/articles` },
];

const CONTACT = "https://www.grainlabs.ai/contact.html";

// nav link → the section it points at
const SPY: [string, string][] = [["#how", ".hw"], ["#nia", "#nia"], ["#capabilities", "#capabilities"], ["#uses", "#uses"], ["#trust", "#trust"], ["#faq", "#faq"], ["#contact", "#contact"]];

/** Scroll cue: a plain arrow that bobs gently, bottom-right. */
function ScrollArrow() {
  return (
    <a className="scroll-arrow" href="#how" aria-label="Scroll to see how it runs">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M6 13l6 6 6-6" /></svg>
    </a>
  );
}

type HeroProps = { theme: Theme; onToggleTheme: () => void; palette: Palette; onPalette: (p: Palette) => void };

export default function GrainHero({ theme, onToggleTheme, palette, onPalette }: HeroProps) {
  // "go" starts the hero's entrance: when the loader hands over, or on the first frame without it
  const [go, setGo] = useState(false);
  const [loading, setLoading] = useState(PLAY_INTRO);
  useEffect(() => {
    if (PLAY_INTRO) return;
    const r = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // Scroll progress through the pinned hero, 0–1. The G reads the ref every frame;
  // CSS reads --p for the dimming, the fades and the line. No React re-renders while scrolling.
  const rootRef = useRef<HTMLDivElement>(null);
  // the glass under the nav: a lens wave with a colour fringe, melted into the progressive blur (Chromium)
  useLiquidGlass(rootRef, ".site-header .top-glass");
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
      // light theme: the stage turns dark for the hand-off into How it runs; past this point the nav reads it as dark
      if (root.hasAttribute("data-hero-dark") !== p > 0.32) root.toggleAttribute("data-hero-dark", p > 0.32);
      // the nav steps aside while the hero hands over. Opacity only while it's actually fading: any filter or
      // opacity below 1 on the header would cut the glass bar off from the page behind it.
      const hdr = root.querySelector<HTMLElement>(".site-header");
      if (hdr) {
        const o = Math.min(1, Math.max(0, (0.8 - p) * 6));
        const shown = o >= 1 || root.classList.contains("past-hero");
        hdr.style.opacity = shown ? "" : o.toFixed(3);
        hdr.style.pointerEvents = shown || o > 0.05 ? "" : "none";
      }
      // which section is under the nav decides its colours
      let surface = "base";
      root.querySelectorAll<HTMLElement>("[data-surface]").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.top <= 60 && b.bottom > 60) {
          surface = el.dataset.surface || "base";
          // light theme: the hero stage turns dark for the hand-off, so the nav over it should read it as dark
          if (el === scrollBoxRef.current && root.hasAttribute("data-hero-dark")) surface = "dark";
        }
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
    <div ref={rootRef} className={`grain-hero intro${go ? " go" : ""}${PLAY_INTRO ? " with-loader" : ""}${loading ? " is-loading" : ""}`} data-theme={theme} data-palette={palette}>
      {loading && (
        <Loader
          target={() => rootRef.current?.querySelector(".site-header .brand .logo-mark") ?? null}
          onReveal={() => setGo(true)}
          onDone={() => setLoading(false)}
        />
      )}
      <PalettePicker palette={palette} onChange={onPalette} theme={theme} onToggleTheme={onToggleTheme} />
      <header className="site-header">
        {/* no bar: content scrolling under the header bends through a soft lens (colour fringe), blurs progressively and melts into the page colour (no edge) */}
        <div className="top-blur" aria-hidden="true"><s className="top-glass" data-glass="band" /><i /><i /><i /><i /><i /><i /><b /></div>
        {/* logo left; tabs, theme and the CTA right */}
        <div className="nav-bar">
          <a className="brand" href="#top" aria-label="Grain home">
            <GrainMark pulse />
            Grain
          </a>
          <NavPill items={navigation} />
          <div className="header-actions">
            <a className="pill pill-sm header-cta" href={CONTACT}>Start a workflow
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </a>
          </div>
        </div>
      </header>

      {/* tall box: the hero stays pinned while this scrolls past, and that scroll turns the G */}
      <div className="hero-scroll" ref={scrollBoxRef} data-surface={theme === "dark" ? "dark" : "base"}>
        <section className="hero" id="top" aria-labelledby="hero-title">
          <WireMark className="hero-object" progress={progress} start={go} scale={0.6} veil=".hero-center" />
          <span className="hero-thread" aria-hidden="true" />

          {/* the hand-off: the How it runs heading sits above the line, then the section takes over */}
          <div className="hero-next">
            <h2>From request to reviewed output.</h2>
            <p className="next-lead">Every job becomes a tracked workflow, with task state, approvals and evidence attached from intake to delivery.</p>
          </div>

          <div className="hero-ui">
            <div className="hero-center">
              <h1 id="hero-title">
                <span className="headline-line headline-line-muted"><span className="rise">AI operations your team</span></span>
                <span className="headline-line"><span className="rise">can trust to run.</span></span>
              </h1>
              <p className="hero-copy">
                Grain turns a request, its files and its rules into a tracked workflow. Agents do the work. Your people approve what matters.
              </p>
            </div>

            <div className="hero-pills">
              <a className="pill pill-solid" href={CONTACT}>Start a workflow
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
              </a>
              <a className="pill" href="#how">See how it runs</a>
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
