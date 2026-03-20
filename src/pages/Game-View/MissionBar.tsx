import type { CSSProperties } from "react";

interface MissionBarProps {
  goal: string;
  blockLimit: number | null;
  estimatedSteps?: number;
  timeLimitSeconds?: number;
  requiredBlocks: string[];
  allowedBlocks: string[];
  bannedBlocks?: string[];
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
  allowedBlocks,
  bannedBlocks,
  width,
  height,
}: MissionBarProps) {
  const formatGoal = (rawGoal: string): string => {
    // Keep this mapping in UI components so the game code can remain simple.
    if (rawGoal === "Reach Goal") return "Đưa nhân vật tới ô đích.";
    if (rawGoal === "Collect All Fruits and reach goal") return "Thu thập tất cả 🍎 rồi đưa nhân vật tới ô đích.";
    const m = rawGoal.match(/^Collect (\d+) Fruits and reach goal$/);
    if (m) return `Thu thập ${m[1]} 🍎 rồi đưa nhân vật tới ô đích.`;
    return rawGoal;
  };

  const requiredText = requiredBlocks.length > 0 ? requiredBlocks.join(", ") : "Không có";
  const allowedOrBanned = (() => {
    const hasAllowed = allowedBlocks.length > 0;
    const hasBanned = Boolean(bannedBlocks && bannedBlocks.length > 0);

    if (hasAllowed) {
      return { label: "Chỉ được dùng", value: allowedBlocks.join(", ") };
    }
    if (hasBanned) {
      return { label: "Bị cấm", value: bannedBlocks!.join(", ") };
    }
    return { label: "Khối", value: "Được dùng mọi block" };
  })();

  return (
    <div style={styles.container}>
      <Badge label="Mục tiêu" value={formatGoal(goal)} />
      {width && height && <Badge label="Kích thước" value={`${width}x${height}`} />}
      <Badge label="Giới hạn khối" value={blockLimit !== null ? `${blockLimit} khối` : "Không giới hạn"} />
      {typeof estimatedSteps === "number" && estimatedSteps > 0 && (
        <Badge label="Ước tính" value={`${estimatedSteps} bước`} />
      )}
      {typeof timeLimitSeconds === "number" && timeLimitSeconds > 0 && (
        <Badge label="Giới hạn thời gian" value={`${timeLimitSeconds} giây`} />
      )}
      <Badge label="Bắt buộc" value={requiredText} />
      <Badge label={allowedOrBanned.label} value={allowedOrBanned.value} />
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
