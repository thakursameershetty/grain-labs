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
