import GrainHero from "@/version3/components/grain/GrainHero";
import { useTheme } from "@/version3/components/grain/useTheme";

export default function App() {
  const { theme, toggle } = useTheme();
  return <GrainHero theme={theme} onToggleTheme={toggle} />;
}
