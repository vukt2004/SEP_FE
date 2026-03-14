import type { ChapterData } from "../landing.types";
import { palette } from "../landing.theme";
import { Orbit, ShieldCheck, Sparkles, Zap } from "lucide-react";

export const highlightCards = [
  {
    title: "Learn by seeing logic move",
    desc: "Drag and drop blocks and see each decision executed directly in the 2D world instead of having to imagine what the code is doing.",
    icon: Orbit,
    tone: palette.primary,
  },
  {
    title: "Clear feedback for beginners",
    desc: "Learners can immediately identify the correct path and strategic errors, and can correct them step by step without being overwhelmed by syntax.",
    icon: Sparkles,
    tone: palette.cyan,
  },
  {
    title: "From practice to competition",
    desc: "Start with individual challenges, then step into multiplayer rooms to compete on accuracy, speed, and efficiency.",
    icon: Zap,
    tone: palette.accent,
  },
  {
    title: "A safe start for new learners",
    desc: "QuackOrbit helps beginners approach programming logic through an intuitive, user-friendly experience with clear motivation for progress.",
    icon: ShieldCheck,
    tone: palette.yellow,
  },
] as const;

export const chapterData: ChapterData[] = [
  {
    id: "arrival",
    chapter: "Act I",
    eyebrow: "Discover",
    title: "Start with a world where programming logic becomes understandable 2D tasks",
    desc: "QuackOrbit opens up a more visual way of learning for beginners: you see the goals, obstacles, and outcomes of each decision right in the game world.",
    toneColor: palette.accent,
    points: [
      "Explore challenges through clear and visual 2D maps.",
      "Understand the objective of each level before starting to piece together logic.",
      "Transform the learning of abstract concepts into an observable experience.",
    ],
  },
  {
    id: "learning",
    chapter: "Act II",
    eyebrow: "Learn",
    title: "Combine blocks, run simulations, and understand why your solution works.",
    desc: "Instead of learning dry theory or jumping straight into code, learners build strategies with blocks and observe the direct results to understand sequence, condition, and loop in a more natural way.",
    toneColor: palette.primary,
    points: [
      "Learn sequence, condition, and loop through easy-to-use drag-and-drop operations.",
      "Observe agent movement to understand the relationship between decisions and outcomes.",
      "Experiment, make mistakes, and iterate without the pressure of syntax.",
    ],
  },
  {
    id: "competition",
    chapter: "Act III",
    eyebrow: "Compete",
    title: "When ready, learners can enter multiplayer mode to test their skills.",
    desc: "Multiplayer makes learning logic more enjoyable by introducing challenges into a gently competitive environment, where players not only need to solve problems correctly but also quickly and optimally.",
    toneColor: palette.accent,
    points: [
      "Create or join a room with other players.",
      "Compete based on correctness, speed, and efficiency.",
      "Transform the practice of logical thinking into an engaging experience with clear motivation and challenge.",
    ],
  },
];
