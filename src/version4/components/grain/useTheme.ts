import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "grain.theme";

/** Light by default. `?theme=dark` in the URL wins (handy for sending a link), then the saved choice. */
function initialTheme(): Theme {
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  if (fromUrl === "dark" || fromUrl === "light") return fromUrl;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* storage blocked: fall back to light */
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
    // keep the URL in sync so the current view can be shared as-is
    const url = new URL(window.location.href);
    url.searchParams.set("theme", theme);
    window.history.replaceState(null, "", url);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}

/* ───── v4: colour palettes, for comparing ───── */
export const PALETTES = [
  { id: "luxury", name: "Elegant Luxury", dots: ["#1e1916", "#b4482b", "#fef2c5"] },
  { id: "marshmallow", name: "Marshmallow", dots: ["#ff97cc", "#98cdff", "#cc99ff"] },
  { id: "logo", name: "Logo", dots: ["#C85636", "#E27A5F", "#F0BFA7"] },
] as const;
export type Palette = (typeof PALETTES)[number]["id"];
const PKEY = "grain.palette";
const isPalette = (v: unknown): v is Palette => PALETTES.some((p) => p.id === v);

/** Elegant Luxury by default. `?palette=` wins, then the saved choice. Kept in the URL so a link shares it. */
export function usePalette() {
  const [palette, setPalette] = useState<Palette>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("palette");
    if (isPalette(fromUrl)) return fromUrl;
    try { const saved = localStorage.getItem(PKEY); if (isPalette(saved)) return saved; } catch { /* blocked */ }
    return "luxury";
  });
  useEffect(() => {
    try { localStorage.setItem(PKEY, palette); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.set("palette", palette);
    window.history.replaceState(null, "", url);
  }, [palette]);
  return { palette, setPalette };
}
