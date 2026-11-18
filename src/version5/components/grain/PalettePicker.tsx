// Palette picker for comparing the v4 palettes live (same as ?palette=). It closes with the small × on its corner
// into a slim notch tucked against the left edge of the screen (showing the current palette's colours); click the
// notch to open it again. The open/closed choice is remembered for this browser.
import { useEffect, useState } from "react";
import { PALETTES, type Palette } from "./useTheme";

const KEY = "grain.palpick";

export default function PalettePicker({ palette, onChange }: { palette: Palette; onChange: (p: Palette) => void }) {
  const [closed, setClosed] = useState(() => { try { return localStorage.getItem(KEY) === "closed"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem(KEY, closed ? "closed" : "open"); } catch { /* ignore */ } }, [closed]);
  const cur = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];

  return (
    <>
      <button type="button" className={`pal-notch${closed ? " on" : ""}`} onClick={() => setClosed(false)}
        aria-label={`Colour palette: ${cur.name}. Open the palette picker`} tabIndex={closed ? 0 : -1} aria-hidden={!closed}>
        {cur.dots.map((c) => <i key={c} style={{ background: c }} />)}
      </button>
      <div className={`pal-pick${closed ? " off" : ""}`} role="group" aria-label="Colour palette" aria-hidden={closed}>
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
