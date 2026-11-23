// v6 hero (rebuilt 2026-11-18 after Shiva's review of v4, which said the 3D boxy mark looked dated).
// 2026-11-23: the stage is now a straight port of the "dry-ice vapour" demo (VapourHero): navy → azure atmosphere in
// both themes, the Grain mark as a big ice-white vapour glyph that parts into smoke puffs under the pointer and
// re-condenses, tiny marks drifting up. The mark fills most of the stage; one short line of small text sits under it.
// No big GRAIN word. Opening: Loader builds the 2D mark and flies it into the nav, then the vapour mark condenses in.
// Scroll: the hero is pinned; the mark evaporates into rising smoke, the stage turns dark and How it runs introduces itself.
// Theme switch lives in the palette notch (bottom-left), not the nav.
// Nav: NavPill, one pill that stretches like liquid between tabs and goes soft-edged while it moves.
import { HOME } from "@/version6/base";
import { useEffect, useRef, useState } from "react";
import HowItRuns from "./HowItRuns";
import NavPill from "./NavPill";
import useLiquidGlass from "./useLiquidGlass";
import Sections from "./Sections";
import GrainMark from "./GrainMark";
import VapourHero from "@/version6/brand/VapourHero";
import Loader from "./Loader";
import PalettePicker from "./PalettePicker";
import type { Palette, Theme } from "./useTheme";
import "./grain-hero.css";
import "./palette.css";

// the opening plays on every visit, except for people who ask for less motion
const PLAY_INTRO = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MIST_KEY = "grain.mist", MIST_MIN = 0.08, MIST_MAX = 0.4, MIST_DEFAULT = 0.2;

const navigation = [
  { label: "How it runs", href: "#how" },
  { label: "Nia", href: "#nia" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Use cases", href: "#uses" },
  { label: "Trust", href: "#trust" },
  { label: "Articles", href: `${HOME}/articles` },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
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
  // hover mist blob radius (stage heights), tuned from the palette picker's slider and remembered in this browser
  const [mist, setMist] = useState(() => {
    let v = NaN;
    try { v = parseFloat(localStorage.getItem(MIST_KEY) ?? ""); } catch { /* ignore */ }
    return Number.isFinite(v) ? Math.min(MIST_MAX, Math.max(MIST_MIN, v)) : MIST_DEFAULT;
  });
  useEffect(() => { try { localStorage.setItem(MIST_KEY, String(mist)); } catch { /* ignore */ } }, [mist]);
  useEffect(() => {
    if (PLAY_INTRO) return;
    const r = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // Scroll progress through the pinned hero, 0–1 (eased, see below). The vapour reads the ref every frame;
  // CSS reads --p for the fades and the hand-off. No React re-renders while scrolling.
  const rootRef = useRef<HTMLDivElement>(null);
  // the glass under the nav: a lens wave with a colour fringe, melted into the progressive blur (Chromium)
  useLiquidGlass(rootRef, ".site-header .top-glass");
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  // an invisible copy of the How it runs heading, laid out where the real one lands: the mist condenses into it
  const nextGhost = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let raf = 0;
    // the hand-off is driven by an eased progress, not the raw scroll: each wheel notch or trackpad flick would
    // otherwise jump the dissolve and the heading forward in steps. `shown` glides to `target` (time constant ~0.16s)
    // and feeds --p, the canvas and the nav fade.
    let target = 0, shown = 0, glideRaf = 0, last = 0;
    const applyShown = () => {
      const root = rootRef.current;
      if (!root) return;
      progress.current = shown;
      root.style.setProperty("--p", shown.toFixed(4));
      // the nav steps aside while the hero hands over. Opacity only while it's actually fading: any filter or
      // opacity below 1 on the header would cut the glass bar off from the page behind it.
      const hdr = root.querySelector<HTMLElement>(".site-header");
      if (hdr) {
        const o = Math.min(1, Math.max(0, (0.8 - shown) * 6));
        const visible = o >= 1 || root.classList.contains("past-hero");
        hdr.style.opacity = visible ? "" : o.toFixed(3);
        hdr.style.pointerEvents = visible || o > 0.05 ? "" : "none";
      }
    };
    const glide = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      shown += (target - shown) * (1 - Math.exp(-dt / 0.16));
      if (Math.abs(target - shown) < 0.0004) shown = target;
      applyShown();
      glideRaf = shown === target ? 0 : requestAnimationFrame(glide);
    };
    const kickGlide = () => { if (!glideRaf) { last = performance.now(); glideRaf = requestAnimationFrame(glide); } };
    const update = () => {
      raf = 0;
      const box = scrollBoxRef.current;
      const root = rootRef.current;
      if (!box || !root) return;
      const r = box.getBoundingClientRect();
      const range = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / range));
      target = p;
      kickGlide();
      // once the pin has released, the nav comes back as a solid bar
      root.classList.toggle("past-hero", p >= 1 && r.bottom < window.innerHeight - 40);
      // light theme: the stage turns dark for the hand-off into How it runs; past this point the nav reads it as dark
      // the vapour stage is dark in both themes (after the demo), so the nav over the hero always reads it as dark
      if (!root.hasAttribute("data-hero-dark")) root.setAttribute("data-hero-dark", "");
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
    // a page opened part-way down (reload, anchor) starts in place rather than gliding from the top
    shown = target; applyShown();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(glideRaf);
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
      <PalettePicker palette={palette} onChange={onPalette} theme={theme} onToggleTheme={onToggleTheme}
        mist={{ value: mist, min: MIST_MIN, max: MIST_MAX, def: MIST_DEFAULT, onChange: setMist }} />
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
          <VapourHero className="hero-object vapour-hero" blobSize={mist} progress={progress} textRef={nextGhost} />

          {/* the hand-off: the mark dissolves into mist, its particles fly onto the How it runs heading and condense
              into it (in the canvas), then the real heading takes over. The ghost is the layout the mist aims at. */}
          <div className="hero-next hero-next-ghost" aria-hidden="true">
            <h2 ref={nextGhost}>From request to reviewed output.</h2>
            <p className="next-lead">Every job becomes a tracked workflow, with task state, approvals and evidence attached from intake to delivery.</p>
          </div>
          <div className="hero-next">
            <h2>From request to reviewed output.</h2>
            <p className="next-lead">Every job becomes a tracked workflow, with task state, approvals and evidence attached from intake to delivery.</p>
          </div>

          <div className="hero-ui">
            <div className="hero-center">
              {/* one short line under the big mark (Shiva, 2026-11-23); wording to be refined */}
              <h1 id="hero-title" className="hero-line">
                <span className="headline-line"><span className="rise">AI operations you can trust</span></span>
              </h1>
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
