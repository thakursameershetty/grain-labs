// /version6/articles/<slug>, in the site's language: a dark stage (meta, two-line title, dek, byline over soft
// pastel glows), the light sheet rising over it with the cover straddling the seam, then the body in a reading column
// with a sticky contents list (a travelling pill on hover, a marker on the section you're in), a thin reading-progress
// line, and related pieces at the end.
import { useEffect, useRef, useState } from "react";
import Shell, { HOME } from "./Shell";
import ArticleCover from "./ArticleCover";
import { Card } from "./ArticlesPage";
import usePillList from "@/version6/components/grain/usePillList";
import { ARTICLES, bySlug, type Article, type Block } from "./data";

const anchor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Body({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p": return <p key={i}>{b.text}</p>;
          case "h2": return <h2 key={i} id={anchor(b.text)}>{b.text}</h2>;
          case "quote": return <blockquote key={i}><p>{b.text}</p></blockquote>;
          case "list": return <ul key={i}>{b.items.map((t) => <li key={t}>{t}</li>)}</ul>;
          case "callout": return <aside key={i} className="ap-callout"><b>{b.title}</b><p>{b.text}</p></aside>;
          case "figure": return <figure key={i}><ArticleCover kind={b.cover} className="ap-fig" /><figcaption>{b.caption}</figcaption></figure>;
        }
      })}
    </>
  );
}

export default function ArticlePage({ slug }: { slug: string }) {
  const a = bySlug(slug) as Article;
  const body = useRef<HTMLDivElement>(null);
  const toc = useRef<HTMLOListElement>(null), tocPill = useRef<HTMLSpanElement>(null);
  usePillList(toc, tocPill);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState("");
  const heads = a.body.filter((b): b is { t: "h2"; text: string } => b.t === "h2");
  const related = [...ARTICLES.filter((x) => x.slug !== a.slug && x.category === a.category), ...ARTICLES.filter((x) => x.slug !== a.slug && x.category !== a.category)].slice(0, 3);

  useEffect(() => { document.title = `${a.title} · Grain`; window.scrollTo(0, 0); }, [a]);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = body.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setProgress(Math.min(1, Math.max(0, (window.innerHeight * 0.35 - r.top) / Math.max(1, r.height - window.innerHeight * 0.3))));
      let cur = "";
      el.querySelectorAll("h2[id]").forEach((h) => { if (h.getBoundingClientRect().top < window.innerHeight * 0.3) cur = h.id; });
      setCurrent(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);

  return (
    <Shell>
      <div className="ap-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <section className="ap-stage" data-surface="dark" style={{ "--tint": `var(--${a.cover === "nia" ? "in" : "o3"})` } as React.CSSProperties}>
        <div className="ap-crumb">
          <a className="ap-back" href={`${HOME}/articles`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>All articles</a>
        </div>
        <header className="ap-head">
          <span className="ar-meta"><b className="ar-topic">{a.category}</b><span>{a.read} read</span><span>{a.date}</span></span>
          <h1>{a.title}</h1>
          <p className="ap-dek">{a.dek}</p>
          <span className="ap-by"><i className="ap-by-mark" aria-hidden="true" />Grain team</span>
        </header>
      </section>

      <section className="ar-sheet ap-sheet" data-surface="base">
        <ArticleCover kind={a.cover} className="ap-cover" />
        <div className="ap-layout">
          <div className="ap-body" ref={body}><Body blocks={a.body} /></div>
          {heads.length > 1 && (
            <nav className="ap-toc" aria-label="In this article">
              <p>In this article</p>
              <ol ref={toc}>
                <span className="nav-pill ap-toc-pill" ref={tocPill} aria-hidden="true"><i className="np-sharp" /><i className="np-soft" /></span>
                {heads.map((h) => (
                  <li key={h.text}><a href={`#${anchor(h.text)}`} className={current === anchor(h.text) ? "on" : ""}>{h.text}</a></li>
                ))}
              </ol>
            </nav>
          )}
        </div>

        <div className="ap-related" aria-labelledby="ap-more">
          <h2 id="ap-more">Keep reading</h2>
          <div className="ap-related-row">
            {related.map((r) => <Card key={r.slug} a={r} />)}
          </div>
        </div>
      </section>
    </Shell>
  );
}
