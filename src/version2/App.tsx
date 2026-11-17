import GrainHero from "@/version2/components/grain/GrainHero";
import { useTheme } from "@/version2/components/grain/useTheme";

export default function App() {
  const { theme, toggle } = useTheme();
  return <GrainHero theme={theme} onToggleTheme={toggle} />;
}
