export type Tone = "default" | "primary" | "accent" | "cyan";

export type ChapterData = {
  id: string;
  chapter: string;
  eyebrow: string;
  title: string;
  desc: string;
  toneColor: string;
  points: string[];
};
