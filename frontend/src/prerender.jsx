import HomePage from "./components/HomePage";
import ThemeFrame from "./components/ThemeFrame";
export default function PrerenderHome() {
  return (
    <ThemeFrame>
      <HomePage />
    </ThemeFrame>
  );
}
