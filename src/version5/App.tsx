import GrainHero from "@/version5/components/grain/GrainHero";
import { usePalette, useTheme } from "@/version5/components/grain/useTheme";

export default function App() {
  const { theme, toggle } = useTheme();
  const { palette, setPalette } = usePalette();
  return <GrainHero theme={theme} onToggleTheme={toggle} palette={palette} onPalette={setPalette} />;
}
