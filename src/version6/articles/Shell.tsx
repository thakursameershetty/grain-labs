// The frame for pages outside the landing page (Articles): the same nav (logo · tabs · CTA over the progressive blur
// and lens), palette/theme notch and footer, with the section tabs pointing back to the landing page.
import { useEffect, useRef, type ReactNode } from "react";
import NavPill from "@/version6/components/grain/NavPill";
import GrainMark from "@/version6/components/grain/GrainMark";
import PalettePicker from "@/version6/components/grain/PalettePicker";
import FogFooter from "@/version6/components/grain/FogFooter";
import useLiquidGlass from "@/version6/components/grain/useLiquidGlass";
import { usePalette, useTheme } from "@/version6/components/grain/useTheme";
import "@/version6/components/grain/grain-hero.css";
import "@/version6/components/grain/palette.css";
import "@/version6/components/grain/sections.css";
import "./articles.css";

import { HOME } from "@/version6/base";
export { HOME };
const CONTACT = "https://www.grainlabs.ai/contact.html";
const NAV = [
  { label: "How it runs", href: `${HOME}/#how` },
  { label: "Nia", href: `${HOME}/#nia` },
  { label: "Capabilities", href: `${HOME}/#capabilities` },
  { label: "Use cases", href: `${HOME}/#uses` },
  { label: "Trust", href: `${HOME}/#trust` },
  { label: "Articles", href: `${HOME}/articles` },
  { label: "FAQ", href: `${HOME}/#faq` },
  { label: "Contact", href: `${HOME}/#contact` },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { palette, setPalette } = usePalette();
  const root = useRef<HTMLDivElement>(null);
  useLiquidGlass(root, ".site-header .top-glass");
  // which surface is under the nav (dark stage or the light sheet) decides its colours, as on the landing page
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      let surface = "base";
      el.querySelectorAll<HTMLElement>("main [data-surface]").forEach((s) => {
        const b = s.getBoundingClientRect();
        if (b.top <= 40 && b.bottom > 40) surface = s.dataset.surface || "base";
      });
      if (el.dataset.surface !== surface) el.dataset.surface = surface;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={root} className="grain-hero past-hero ar-page" data-theme={theme} data-palette={palette}>
      <PalettePicker palette={palette} onChange={setPalette} theme={theme} onToggleTheme={toggle} />
      <header className="site-header">
        <div className="top-blur" aria-hidden="true"><s className="top-glass" data-glass="band" /><i /><i /><i /><i /><i /><i /><b /></div>
        <div className="nav-bar">
          <a className="brand" href={`${HOME}/`} aria-label="Grain home"><GrainMark />Grain</a>
          <NavPill items={NAV} active={`${HOME}/articles`} />
          <div className="header-actions">
            <a className="pill pill-sm header-cta" href={CONTACT}>Start a workflow
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </a>
          </div>
        </div>
      </header>
      <main className="ar-main">{children}</main>
      <FogFooter theme={theme} home={`${HOME}/`} />
    </div>
  );
}
