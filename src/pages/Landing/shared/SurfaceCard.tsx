import type { ReactNode } from "react";
import { palette } from "../landing.theme";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-[30px] border ${className}`}
      style={{ background: palette.surface, borderColor: palette.border }}
    >
      {children}
    </div>
  );
}

export function PanelCard({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-[28px] border ${className}`}
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      {children}
    </div>
  );
}
