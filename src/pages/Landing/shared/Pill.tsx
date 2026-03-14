import type { ReactNode } from "react";
import type { Tone } from "../landing.types";
import { palette } from "../landing.theme";

type PillProps = {
  children: ReactNode;
  tone?: Tone;
};

function toneStyles(tone: Tone) {
  return {
    default: {
      background: palette.surface2,
      color: palette.text2,
      borderColor: palette.border,
    },
    primary: {
      background: "rgba(37,99,235,0.14)",
      color: palette.primary,
      borderColor: "rgba(37,99,235,0.35)",
    },
    accent: {
      background: "rgba(249,115,22,0.14)",
      color: palette.accent,
      borderColor: "rgba(249,115,22,0.35)",
    },
    cyan: {
      background: "rgba(6,182,212,0.14)",
      color: palette.cyan,
      borderColor: "rgba(6,182,212,0.35)",
    },
  }[tone];
}

export default function Pill({ children, tone = "default" }: PillProps) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium"
      style={toneStyles(tone)}
    >
      {children}
    </span>
  );
}
