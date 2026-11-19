// v6 routes (at / or under /version6): the landing page; …/articles → the articles index; …/articles/<slug> → one
// article (unknown slugs fall back to the index). Each page is its own chunk.
import { Suspense, lazy } from "react";
import GrainHero from "@/version6/components/grain/GrainHero";
import { usePalette, useTheme } from "@/version6/components/grain/useTheme";
import { bySlug } from "@/version6/articles/data";

const ArticlesPage = lazy(() => import("@/version6/articles/ArticlesPage"));
const ArticlePage = lazy(() => import("@/version6/articles/ArticlePage"));

function Landing() {
  const { theme, toggle } = useTheme();
  const { palette, setPalette } = usePalette();
  return <GrainHero theme={theme} onToggleTheme={toggle} palette={palette} onPalette={setPalette} />;
}

export default function App() {
  const m = /^(?:\/version6)?\/articles(?:\/([^/]+))?\/?$/.exec(window.location.pathname);
  if (!m) return <Landing />;
  const slug = m[1] && bySlug(m[1]) ? m[1] : null;
  return <Suspense fallback={null}>{slug ? <ArticlePage slug={slug} /> : <ArticlesPage />}</Suspense>;
}
