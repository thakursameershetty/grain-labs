// Palette picker for comparing the v4 palettes live (same as ?palette=). It closes with the small × on its corner
// into a slim notch tucked against the left edge of the screen (showing the current palette's colours); click the
// notch to open it again. The open/closed choice is remembered for this browser.
// v6: the light/dark switch lives here too (moved out of the nav): first in the open picker, and on top of the
// closed notch, where it switches straight away (the dots below it open the picker).
import { useEffect, useState } from "react";
import { PALETTES, type Palette, type Theme } from "./useTheme";

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === "dark" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" /></svg>
  );
}

const KEY = "grain.palpick";

type Props = { palette: Palette; onChange: (p: Palette) => void; theme: Theme; onToggleTheme: () => void };

export default function PalettePicker({ palette, onChange, theme, onToggleTheme }: Props) {
  const [closed, setClosed] = useState(() => { try { return localStorage.getItem(KEY) === "closed"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem(KEY, closed ? "closed" : "open"); } catch { /* ignore */ } }, [closed]);
  const cur = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];
  const next = theme === "dark" ? "light" : "dark";

  return (
    <>
      <div className={`pal-notch${closed ? " on" : ""}`} aria-hidden={!closed}>
        <button type="button" className="pal-theme" onClick={onToggleTheme} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} tabIndex={closed ? 0 : -1}>
          <ThemeIcon theme={theme} />
        </button>
        <button type="button" className="pal-open" onClick={() => setClosed(false)}
          aria-label={`Colour palette: ${cur.name}. Open the palette picker`} tabIndex={closed ? 0 : -1}>
          {cur.dots.map((c) => <i key={c} style={{ background: c }} />)}
        </button>
      </div>
      <div className={`pal-pick${closed ? " off" : ""}`} role="group" aria-label="Theme and colour palette" aria-hidden={closed}>
        <button type="button" className="pal-theme" onClick={onToggleTheme} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} tabIndex={closed ? -1 : 0}>
          <ThemeIcon theme={theme} />
        </button>
        <i className="pal-sep" aria-hidden="true" />
        {PALETTES.map((p) => (
          <button key={p.id} type="button" aria-pressed={palette === p.id} onClick={() => onChange(p.id)} title={p.name} tabIndex={closed ? -1 : 0}>
            <span className="pal-dots" aria-hidden="true">{p.dots.map((c) => <i key={c} style={{ background: c }} />)}</span>
            <span>{p.name}</span>
          </button>
        ))}
        <button type="button" className="pal-x" onClick={() => setClosed(true)} aria-label="Hide the palette picker" tabIndex={closed ? -1 : 0}>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>
        </button>
      </div>
    </>
  );
}
