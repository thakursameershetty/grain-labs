import GrainHero from "@/components/grain/GrainHero";
import { useTheme } from "@/components/grain/useTheme";

export default function App() {
  const { theme, toggle } = useTheme();
  return <GrainHero theme={theme} onToggleTheme={toggle} />;
}
