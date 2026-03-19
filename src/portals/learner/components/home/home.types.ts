export type PlanetState = "ready" | "locked" | "new";

export type UserHud = {
  displayName: string;
  level: number;
  xp: number;
  xpToNext: number;
  stars: number;
  badgeLabel: string;
};

export type Planet = {
  id: "map" | "arena" | "community";
  title: string;
  subtitle: string;
  state: PlanetState;
  primaryCta: string;
  href: string;
};

export type ResumeState = {
  title: string;
  progressText: string;
  href: string;
};

export type RecommendationItem = {
  id: string;
  title: string;
  tag: string;
  difficulty: "Easy" | "Normal" | "Hard";
  href: string;
};

export type LearnerHomeVM = {
  hud: UserHud;
  resume: ResumeState;
  planets: Planet[];
  recommended: RecommendationItem[];
};
