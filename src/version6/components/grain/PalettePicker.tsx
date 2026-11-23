// Palette picker for comparing the v4 palettes live (same as ?palette=), with the light/dark switch (v6) and the
// hero's "Mist" size slider. A review dock: the × on its top-right corner hides it for this visit (it fades away, no
// notch left behind); nothing is remembered, so a refresh brings it back.
import { useState } from "react";
import { PALETTES, type Palette, type Theme } from "./useTheme";

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === "dark" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" /></svg>
  );
}

type Props = {
  palette: Palette; onChange: (p: Palette) => void; theme: Theme; onToggleTheme: () => void;
  /** the hover mist blob's size: a slider at the end of the picker */
  mist?: { value: number; min: number; max: number; def: number; onChange: (v: number) => void };
};

export default function PalettePicker({ palette, onChange, theme, onToggleTheme, mist }: Props) {
  // hidden for this visit once the × is pressed; a refresh brings it back
  const [closed, setClosed] = useState(false);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <>
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
        {mist && (
          <>
            <i className="pal-sep" aria-hidden="true" />
            <label className="pal-mist" title="Size of the mist blob when you hover the logo">
              <span>Mist</span>
              <input type="range" min={mist.min} max={mist.max} step={0.01} value={mist.value}
                onChange={(e) => mist.onChange(parseFloat(e.target.value))} tabIndex={closed ? -1 : 0}
                aria-label="Mist blob size" />
            </label>
            {/* reset shows up only once the slider has moved off its default */}
            {mist.value !== mist.def && (
              <button type="button" className="pal-reset" onClick={() => mist.onChange(mist.def)}
                aria-label="Reset mist size" title="Reset mist size" tabIndex={closed ? -1 : 0}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
              </button>
            )}
          </>
        )}
        <button type="button" className="pal-x" onClick={() => setClosed(true)} aria-label="Hide this dock (a refresh brings it back)" title="Hide (a refresh brings it back)" tabIndex={closed ? -1 : 0}>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>
        </button>
      </div>
    </>
  );
}
