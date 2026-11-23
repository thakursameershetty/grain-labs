// /version6/articles, in the site's language: a dark stage like the landing hero ("Articles" over the 3D wireframe
// mark, foggy near the cursor, with the frosted veil behind the headline; topic chips as hairline pills with the
// travelling liquid pill), then a light sheet rising over it with big rounded corners (the hero → page seam)
// carrying the scattered spread Shiva asked for: rows alternate a big piece and a small one, three small ones,
// a small one and a big one, cards at different heights so it never reads as a grid. The chips filter it.
import { useEffect, useMemo, useRef, useState } from "react";
import Shell, { HOME } from "./Shell";
import ArticleCover from "./ArticleCover";
import VapourHero from "@/version6/brand/VapourHero";
import usePillList from "@/version6/components/grain/usePillList";
import { ARTICLES, CATEGORIES, type Article } from "./data";

const CHIP_PAD = { x: 0, y: 0 };

const ROWS = [[8, 4], [4, 4, 4], [5, 7], [4, 8], [4, 4, 4]];
const DROP = [[0, 72], [36, 0, 64], [56, 0], [0, 40], [48, 0, 24]];

type Placed = { a: Article; span: number; drop: number; size: "lg" | "md" | "sm" };
function lay(list: Article[]): Placed[][] {
  const rows: Placed[][] = [];
  let i = 0, r = 0;
  while (i < list.length) {
    let pattern = ROWS[r % ROWS.length];
    const left = list.length - i;
    if (left < pattern.length) pattern = left === 1 ? [7] : [7, 5];
    rows.push(pattern.map((span, k) => ({ a: list[i + k], span, drop: DROP[r % DROP.length][k] ?? 0, size: span >= 7 ? "lg" : span >= 5 ? "md" : "sm" })));
    i += pattern.length; r++;
  }
  return rows;
}

export function Card({ a, size = "sm", span, drop = 0, k = 0 }: { a: Article; size?: "lg" | "md" | "sm"; span?: number; drop?: number; k?: number }) {
  return (
    <a className={`ar-card ${size}`} href={`${HOME}/articles/${a.slug}`} style={{ gridColumn: span ? `span ${span}` : undefined, "--drop": `${drop}px`, "--k": k } as React.CSSProperties}>
      <ArticleCover kind={a.cover} className="ar-cover" />
      <span className="ar-meta"><b className="ar-topic">{a.category}</b><span>{a.read} read</span></span>
      <h2>{a.title}</h2>
      {size !== "sm" && <p className="ar-dek">{a.dek}</p>}
      <span className="ar-foot"><span>{a.date}</span><i>Read <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></i></span>
    </a>
  );
}

export default function ArticlesPage() {
  const [cat, setCat] = useState("All");
  const list = useMemo(() => (cat === "All" ? ARTICLES : ARTICLES.filter((a) => a.category === cat)), [cat]);
  const rows = useMemo(() => lay(list), [list]);
  const spread = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null), chipPill = useRef<HTMLSpanElement>(null);
  // the chips have their own outline: the pill sits exactly on it (no padding) and fills it, rather than ringing it
  usePillList(chips, chipPill, "button", CHIP_PAD);

  useEffect(() => { document.title = "Articles · Grain"; }, []);
  useEffect(() => {
    const el = spread.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute("data-in", ""); io.unobserve(e.target); } }), { threshold: 0.12 });
    el.querySelectorAll(".ar-card").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [rows]);

  return (
    <Shell>
      <section className="ar-stage" data-surface="dark">
        {/* the homepage's vapour stage behind the title, without the big mark: same warm atmosphere and drifting marks,
            so it reads as the same site while the title, intro and chips stay clean (the mark belongs to the home hero) */}
        <VapourHero className="ar-vapour vapour-hero" markAlpha={0} />
        <div className="ar-stage-center">
          <h1>Articles</h1>
          <p>Notes on running governed AI work: how Grain is built, and what it's like on the job.</p>
        </div>
        <div className="ar-chips" ref={chips} role="tablist" aria-label="Filter by topic">
          <span className="nav-pill ar-chip-pill" ref={chipPill} aria-hidden="true"><i className="np-sharp" /><i className="np-soft" /></span>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cat === c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </section>

      <section className="ar-sheet" data-surface="base">
        <div className="ar-spread" ref={spread} key={cat}>
          {rows.map((row, r) => (
            <div className="ar-row" key={r}>
              {row.map((p, k) => <Card key={p.a.slug} a={p.a} size={p.size} span={p.span} drop={p.drop} k={k} />)}
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
