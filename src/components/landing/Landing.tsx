import { Features } from "./sections/Features";
import { HowItWorks } from "./sections/HowItWorks";
import { CTA } from "./sections/CTA";
import { Footer } from "./sections/Footer";
import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import { SocialProof } from "./sections/SocialProof";

export function Landing() {
  return (
    <div>
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
