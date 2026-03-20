import { Target, ShieldAlert, Boxes, ListChecks, X, Play } from "lucide-react";
import type { CSSProperties } from "react";

interface LevelMissionModalProps {
  isOpen: boolean;
  levelTitle: string;
  goal: string;
  blockLimit: number | null;
  requiredBlocks: string[];
  allowedBlocks: string[];
  onStart: () => void;
  onClose?: () => void;
}

export function LevelMissionModal({
  isOpen,
  levelTitle,
  goal,
  blockLimit,
  requiredBlocks,
  allowedBlocks,
  onStart,
  onClose,
}: LevelMissionModalProps) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Map Mission</h2>
          {onClose && (
            <button style={styles.closeButton} onClick={onClose} aria-label="Close mission modal">
              <X size={18} />
            </button>
          )}
        </div>
        <p style={styles.levelTitle}>{levelTitle}</p>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Target size={16} />
            <p style={styles.label}>Goal</p>
          </div>
          <p style={styles.value}>{goal}</p>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Boxes size={16} />
            <p style={styles.label}>Block Limit</p>
          </div>
          <p style={styles.value}>{blockLimit !== null ? `${blockLimit} blocks` : "No limit"}</p>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <ShieldAlert size={16} />
            <p style={styles.label}>Required Blocks</p>
          </div>
          <p style={styles.value}>
            {requiredBlocks.length > 0 ? requiredBlocks.join(", ") : "None"}
          </p>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <ListChecks size={16} />
            <p style={styles.label}>Allowed Blocks</p>
          </div>
          <p style={styles.value}>
            {allowedBlocks.length > 0 ? allowedBlocks.join(", ") : "All blocks allowed"}
          </p>
        </div>

        <button style={styles.startButton} onClick={onStart}>
          <Play size={16} /> Start Level
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(2, 6, 23, 0.65)",
    backdropFilter: "blur(4px)",
    padding: "16px",
  },
  modal: {
    width: "min(560px, 100%)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    boxShadow: "0 20px 40px rgba(2, 6, 23, 0.45)",
    padding: "20px",
    color: "var(--text)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
    gap: "12px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 800,
    color: "var(--text)",
  },
  closeButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    padding: 0,
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-2)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  levelTitle: {
    margin: "4px 0 14px",
    fontSize: "13px",
    color: "var(--text-2)",
    fontWeight: 600,
  },
  section: {
    marginBottom: "10px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid color-mix(in srgb, var(--primary) 25%, var(--border))",
    background: "color-mix(in srgb, var(--surface-2) 86%, var(--primary) 14%)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "var(--primary)",
    marginBottom: "4px",
  },
  label: {
    margin: 0,
    fontSize: "12px",
    color: "var(--text-2)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  value: {
    margin: "4px 0 0",
    fontSize: "14px",
    color: "var(--text)",
    fontWeight: 700,
  },
  startButton: {
    marginTop: "8px",
    width: "100%",
    border: "1px solid var(--primary)",
    background: "var(--primary)",
    color: "#fff",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
  },
};
