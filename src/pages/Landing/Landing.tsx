import { chapterData } from "./data/landing.data";
import { palette } from "./landing.theme";
import ChapterSection from "./sections/ChapterSection";
import FinaleSection from "./sections/FinaleSection";
import HeroSection from "./sections/HeroSection";
import IntroHighlightsSection from "./sections/IntroHighlightsSection";
import LandingFooter from "./sections/LandingFooter";
import LandingHeader from "./sections/LandingHeader";

export default function LandingPage() {
  return (
    <div
      style={{ background: palette.bg, color: palette.text }}
      className="min-h-screen overflow-x-hidden"
    >
      <LandingHeader />
      <HeroSection />
      <IntroHighlightsSection />

      {chapterData.map((chapter) => (
        <ChapterSection key={chapter.id} chapter={chapter} />
      ))}

      <FinaleSection />
      <LandingFooter />
    </div>
  );
}
