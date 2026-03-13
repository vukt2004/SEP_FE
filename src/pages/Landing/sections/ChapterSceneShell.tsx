import type { ReactNode } from "react";
import { SurfaceCard } from "../shared/SurfaceCard";

type ChapterSceneShellProps = {
  children: ReactNode;
};

export default function ChapterSceneShell({ children }: ChapterSceneShellProps) {
  return (
    <SurfaceCard className="p-6 shadow-[0_28px_80px_rgba(0,0,0,0.26)]">{children}</SurfaceCard>
  );
}
