import type { CSSProperties } from "react";

interface MissionBarProps {
  goal: string;
  blockLimit: number | null;
  estimatedSteps?: number;
  timeLimitSeconds?: number;
  requiredBlocks: string[];
  forbiddenBlocks: string[];
  width?: number;
  height?: number;
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.badge}>
      <span style={styles.badgeLabel}>{label}:</span>
      <span style={styles.badgeValue}>{value}</span>
    </div>
  );
}

export function MissionBar({
  goal,
  blockLimit,
  estimatedSteps,
  timeLimitSeconds,
  requiredBlocks,
  forbiddenBlocks,
  width,
  height,
}: MissionBarProps) {
  const requiredText = requiredBlocks.length > 0 ? requiredBlocks.join(", ") : "None";
  const forbiddenText = forbiddenBlocks.length > 0 ? forbiddenBlocks.join(", ") : "None";

  return (
    <div style={styles.container}>
      <Badge label="Goal" value={goal} />
      {width && height && <Badge label="Size" value={`${width}x${height}`} />}
      <Badge label="Limit" value={blockLimit !== null ? `${blockLimit} blocks` : "No limit"} />
      {typeof estimatedSteps === "number" && estimatedSteps > 0 && (
        <Badge label="Estimated" value={`${estimatedSteps} steps`} />
      )}
      {typeof timeLimitSeconds === "number" && timeLimitSeconds > 0 && (
        <Badge label="Time Limit" value={`${timeLimitSeconds}s`} />
      )}
      <Badge label="Required" value={requiredText} />
      <Badge label="Forbidden" value={forbiddenText} />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "10px 12px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-2)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid color-mix(in srgb, var(--primary) 32%, var(--border))",
    background: "color-mix(in srgb, var(--primary) 16%, var(--surface))",
    fontSize: "11px",
    maxWidth: "100%",
  },
  badgeLabel: {
    color: "var(--text-2)",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeValue: {
    color: "var(--text)",
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
