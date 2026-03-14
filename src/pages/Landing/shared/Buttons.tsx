import type { ReactNode } from "react";
import { palette } from "../landing.theme";

type ButtonProps = {
  children: ReactNode;
};

export function PrimaryButton({ children }: ButtonProps) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-semibold"
      style={{ background: palette.primary, color: "#fff" }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children }: ButtonProps) {
  return (
    <button
      className="rounded-2xl border px-6 py-3 text-base font-semibold"
      style={{ background: palette.surface, borderColor: palette.border, color: palette.text }}
    >
      {children}
    </button>
  );
}
