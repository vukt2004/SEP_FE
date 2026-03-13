import Container from "../shared/Container";
import { palette } from "../landing.theme";

export default function LandingFooter() {
  return (
    <footer
      className="border-t px-6 py-8"
      style={{ borderColor: palette.border, background: palette.surface }}
    >
      <Container className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="text-lg font-semibold" style={{ color: palette.text }}>
            QuackOrbit
          </div>
          <div className="mt-1 text-sm" style={{ color: palette.muted }}>
            A 2D game-based platform for learning programming logic.
          </div>
        </div>

        <div className="flex gap-6 text-sm" style={{ color: palette.text2 }}>
          <a href="#arrival">Discover</a>
          <a href="#learning">Learn</a>
          <a href="#competition">Compete</a>
          <a href="#finale">Start</a>
        </div>
      </Container>
    </footer>
  );
}
