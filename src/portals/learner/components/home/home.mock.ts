import type { LearnerHomeVM } from "./home.types";

export const mockStudentHome: LearnerHomeVM = {
  hud: {
    displayName: "Test Learner",
    level: 7,
    xp: 320,
    xpToNext: 500,
    stars: 128,
    badgeLabel: "Rookie Explorer",
  },
  resume: {
    title: "Loops: For/While – Mission 3",
    progressText: "Progress: 60%",
    href: "/app/home", // Phase 1 giữ tạm, Phase 2 đổi sang route mission thật
  },
  planets: [
    {
      id: "map",
      title: "Game Mode",
      subtitle: "Solo missions • Learn-by-playing",
      state: "ready",
      primaryCta: "Resume",
      href: "/app/home",
    },
    {
      id: "arena",
      title: "Competitive Arena",
      subtitle: "PvP rooms • Leaderboards",
      state: "new",
      primaryCta: "Join Match",
      href: "/app/home",
    },
    {
      id: "community",
      title: "Community & Marketplace",
      subtitle: "Play & share user-made content",
      state: "locked",
      primaryCta: "Browse",
      href: "/app/home",
    },
  ],
  recommended: [
    {
      id: "r1",
      title: "Conditions: If/Else Basics",
      tag: "Core",
      difficulty: "Easy",
      href: "/app/home",
    },
    {
      id: "r2",
      title: "Loops: Nested Patterns",
      tag: "Practice",
      difficulty: "Normal",
      href: "/app/home",
    },
    {
      id: "r3",
      title: "Functions: Parameters & Return",
      tag: "Next",
      difficulty: "Normal",
      href: "/app/home",
    },
  ],
};
