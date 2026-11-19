// v6 footer, simple (after orchestrator.inc): brand set large on the left with a muted line or two and a quiet
// "Start a workflow" link; three plain link columns on the right; a © line and one sentence along the bottom.
// No card, no hairlines, no glass bar. Behind it, soft pastel smoke pools at the bottom and drifts slowly
// (Gaussian clouds from the palette's colours, mostly paper); the pointer parts it a little. Content aligns with
// the nav (same max width and gutters). Brand and columns rise out of a soft blur the first time it's seen.
import { useEffect, useRef, useState } from "react";
import GrainMark from "./GrainMark";
import Nia from "./Nia";
import { HOME } from "@/version6/base";
import usePillList from "./usePillList";
import "./fog-footer.css";

const CONTACT = "https://www.grainlabs.ai/contact.html";
const EXPLORE: [string, string][] = [["How it runs", "#how"], ["Nia", "#nia"], ["Capabilities", "#capabilities"], ["Use cases", "#uses"], ["Trust", "#trust"]];
const FLEETS: [string, string][] = [
  ["Healthcare-bill advocacy", "advocacy-case-agent"], ["Franchise agreements", "franchise-agreement-agent"],
  ["Detention & demurrage", "dnd-dispute-agent"], ["Lien waivers", "lien-rights-sentinel"],
  ["Incident notification", "breach-notice-agent"], ["Contract-price audit", "case-price-audit"],
  ["Warranty claims", "warranty-claim-desk"], ["Retailer fines", "shipping-fine-recovery"],
];

const hex = (h: string) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((h || "").trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const rand = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** the Nia link: the 2D mascot sits beside it and winks when you hover (or focus) the link or her */
function NiaLink({ href }: { href: string }) {
  const [wink, setWink] = useState(false);
  const on = () => setWink(true), off = () => setWink(false);
  return (
    <a href={href} className="ff-nia" onPointerEnter={on} onPointerLeave={off} onFocus={on} onBlur={off}>
      Nia<Nia size={22} mood={wink ? "wink" : "idle"} className="ff-nia-mark" />
    </a>
  );
}

/** one link column, with its own travelling pill (like the nav's) */
function Col({ title, links, at }: { title: string; links: [string, string][]; at: number }) {
  const list = useRef<HTMLDivElement>(null), pill = useRef<HTMLSpanElement>(null);
  usePillList(list, pill);
  const d = (ms: number) => ({ "--d": ms } as React.CSSProperties);
  return (
    <div className="ff-col">
      <h3 className="ff-r" style={d(at)}>{title}</h3>
      <div className="ff-list" ref={list}>
        <span className="nav-pill ff-pill" ref={pill} aria-hidden="true"><i className="np-sharp" /><i className="np-soft" /></span>
        <ul>
          {links.map(([t, h], li) => <li key={t} className="ff-r" style={d(at + 60 + li * 40)}>{t === "Nia" ? <NiaLink href={h} /> : <a href={h}>{t}</a>}</li>)}
        </ul>
      </div>
    </div>
  );
}

// home: the landing page URL when the footer sits on another page ("/" or "/version6/"); empty on the landing itself
export default function FogFooter({ home = "" }: { theme?: "light" | "dark"; home?: string }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setInView(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the smoke
  useEffect(() => {
    const el = root.current, cv = canvas.current, ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, visible = false, tones: number[][] = [];
    let px = -9999, py = -9999, ex = -9999, ey = -9999, clear = 0, inside = false;

    const read = () => {
      const cs = getComputedStyle(el), v = (n: string) => hex(cs.getPropertyValue(n).trim());
      const dark = !!el.closest('[data-theme="dark"]');
      const paper = v("--paper") ?? (dark ? [30, 25, 22] : [250, 247, 245]);
      const names = dark ? ["--lg-c", "--o2", "--o3", "--lg-c"] : ["--o4", "--lg-c", "--o2", "--o1", "--o3"];
      tones = names.map((n) => v(n) ?? [240, 191, 167]).map((c) => c.map((x, i) => Math.round(paper[i] + (x - paper[i]) * (dark ? 0.32 : 0.5))));
    };
    const fit = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    };
    const draw = (now: number) => {
      const t = reduced ? 0 : now / 1000;
      ex += (px - ex) * 0.12; ey += (py - ey) * 0.12;
      clear += ((inside ? 1 : 0) - clear) * 0.06;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      // soft clouds pooled along the bottom, each a stretched radial gradient drifting sideways and breathing
      for (let i = 0; i < 16; i++) {
        const c = tones[i % tones.length];
        const sp = 8 + rand(i, 1) * 18, span = W + 700;
        const cx = ((rand(i, 2) * span + t * sp * (i % 2 ? 1 : -1)) % span + span) % span - 350;
        const cy = H * (0.62 + rand(i, 3) * 0.42) + Math.sin(t * 0.3 + i) * 12;
        const rx = 260 + rand(i, 4) * 380, ry = rx * (0.28 + rand(i, 5) * 0.2);
        const a = 0.35 + rand(i, 6) * 0.35;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
        g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
        g.addColorStop(0.55, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.35})`);
        g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
        ctx.fillStyle = g; ctx.fillRect(cx - rx, cy - rx, rx * 2, rx * 2); ctx.restore();
      }
      // the pointer parts it a little
      if (clear > 0.01) {
        ctx.globalCompositeOperation = "destination-out";
        const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 180);
        g.addColorStop(0, `rgba(0,0,0,${0.75 * clear})`); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fillRect(ex - 200, ey - 200, 400, 400);
        ctx.globalCompositeOperation = "source-over";
      }
    };
    const loop = (now: number) => { raf = 0; if (!visible) return; draw(now); if (!reduced) raf = requestAnimationFrame(loop); };
    const wake = () => { if (!raf && visible) raf = requestAnimationFrame(loop); };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
      if (!inside) { ex = px; ey = py; }
      inside = true; wake();
    };
    const onLeave = () => { inside = false; };

    read(); fit();
    const ro = new ResizeObserver(() => { fit(); wake(); }); ro.observe(cv);
    const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? false; wake(); }); io.observe(el);
    const host = el.closest(".grain-hero");
    const mo = new MutationObserver(() => { read(); wake(); });
    if (host) mo.observe(host, { attributes: true, attributeFilter: ["data-theme", "data-palette"] });
    el.addEventListener("pointermove", onMove); el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect();
      el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const d = (ms: number) => ({ "--d": ms } as React.CSSProperties);
  const cols: { title: string; links: [string, string][] }[] = [
    { title: "Explore", links: [...EXPLORE.map(([t, h]): [string, string] => [t, `${home}${h}`]), ["Articles", `${HOME}/articles`]] },
    { title: "Fleets", links: FLEETS.map(([t, f]): [string, string] => [t, `https://www.grainlabs.ai/use-cases/${f}.html`]) },
    { title: "Contact", links: [["Talk to us", CONTACT], ["Start a workflow", CONTACT], ["grainlabs.ai", "https://www.grainlabs.ai/"]] },
  ];
  return (
    <footer ref={root} className={`ff${inView ? " ff-in" : ""}`} data-surface="base">
      <canvas ref={canvas} className="ff-smoke" aria-hidden="true" />
      <div className="ff-wrap">
        <div className="ff-top">
          <div className="ff-brand">
            <a className="ff-logo ff-r" style={d(100)} href={`${home}#top`} aria-label="Grain home"><GrainMark className="ff-mark" />Grain</a>
            <p className="ff-r" style={d(200)}>AI operations your team can trust to run.</p>
            <a className="ff-go ff-r" style={d(280)} href={CONTACT}>Start a workflow
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </a>
          </div>
          <nav className="ff-cols" aria-label="Footer">
            {cols.map((c, ci) => <Col key={c.title} title={c.title} links={c.links} at={240 + ci * 90} />)}
          </nav>
        </div>
        <div className="ff-bottom ff-r" style={d(900)}>
          <p className="ff-copy">© 2026 Grain</p>
          <p className="ff-about">Grain turns a request, its files and its rules into a tracked workflow. Agents do the work. Your people approve what matters, and every output carries its evidence.</p>
        </div>
      </div>
    </footer>
  );
}
