import React from "react";

type MetricResult = {
  time: number;
  steps: number;
  blocks: number;
};

type MetricLimits = {
  timeLimit: number;
  stepEstimated: number;
  blockLimit: number;
};

function calculateStars(result: MetricResult, limits: MetricLimits): number {
  let stars = 0;

  if (result.time <= limits.timeLimit) stars++;
  if (result.steps <= limits.stepEstimated) stars++;
  if (result.blocks <= limits.blockLimit) stars++;

  return stars;
}

interface GameResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWin: boolean;
  stepCount: number;
  blocksUsed: number;
  elapsedTime: number;
  fruitsCollected: number;
  timeLimitSeconds: number | null;
  stepEstimated: number | null;
  blockLimit: number | null;
  onReset: () => void;
  onBackToMenu: () => void;
}

export const GameResultsModal: React.FC<GameResultsModalProps> = ({
  isOpen,
  onClose,
  isWin,
  stepCount,
  blocksUsed,
  elapsedTime,
  fruitsCollected,
  timeLimitSeconds,
  stepEstimated,
  blockLimit,
  onReset,
  onBackToMenu,
}) => {
  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const hasTimeLimit = typeof timeLimitSeconds === "number" && timeLimitSeconds > 0;
  const hasStepEstimated = typeof stepEstimated === "number" && stepEstimated > 0;
  const hasBlockLimit = typeof blockLimit === "number" && blockLimit > 0;

  const numericLimits: MetricLimits = {
    timeLimit: hasTimeLimit ? (timeLimitSeconds as number) : Number.POSITIVE_INFINITY,
    stepEstimated: hasStepEstimated ? (stepEstimated as number) : Number.POSITIVE_INFINITY,
    blockLimit: hasBlockLimit ? (blockLimit as number) : Number.POSITIVE_INFINITY,
  };

  const stars = calculateStars(
    {
      time: elapsedTime,
      steps: stepCount,
      blocks: blocksUsed,
    },
    numericLimits,
  );

  const subtitle =
    stars === 3 ? "Perfect!" : stars === 2 ? "Great job!" : stars === 1 ? "Good effort!" : "Try again!";

  const timePassed = elapsedTime <= numericLimits.timeLimit;
  const stepsPassed = stepCount <= numericLimits.stepEstimated;
  const blocksPassed = blocksUsed <= numericLimits.blockLimit;

  const getProgress = (current: number, limit: number): number => {
    if (!Number.isFinite(limit) || limit <= 0) return 100;
    return Math.max(0, Math.min(100, (current / limit) * 100));
  };

  const MetricRow = ({
    icon,
    label,
    current,
    limit,
    passed,
    valueText,
  }: {
    icon: string;
    label: string;
    current: number;
    limit: number;
    passed: boolean;
    valueText: string;
  }) => {
    const progress = getProgress(current, limit);
    const hasLimit = Number.isFinite(limit) && limit > 0;

    return (
      <div style={styles.metricCard}>
        <div style={styles.metricTopRow}>
          <div style={styles.metricLabel}>
            <span>{icon}</span>
            <strong>{label}</strong>
          </div>
          <div style={{ ...styles.metricValue, color: passed ? "#047857" : "#b91c1c" }}>
            {valueText} {passed ? "✅" : "❌"}
          </div>
        </div>

        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
              background: passed
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : "linear-gradient(90deg, #ef4444, #f87171)",
            }}
          />
        </div>

        <div style={styles.progressCaption}>
          {hasLimit ? `${current} / ${limit}` : `${current} / No limit`}
        </div>
      </div>
    );
  };

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
    >
      <style>{`
        @keyframes resultsModalFade {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes starPop {
          from { opacity: 0; transform: translateY(8px) scale(0.7); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeButton} aria-label="Close results modal">
          ×
        </button>

        <div style={styles.header}>
          <div style={styles.headerIcon}>{isWin ? "🏆" : "😔"}</div>
          <h2 style={{ ...styles.title, color: isWin ? "#059669" : "#dc2626" }}>
            {isWin ? "Level Complete!" : "Game Over"}
          </h2>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>

        <div style={styles.starsSection}>
          {[0, 1, 2].map((index) => {
            const filled = index < stars;
            return (
              <span
                key={`star-${index}`}
                style={{
                  ...styles.star,
                  color: filled ? "#f59e0b" : "#cbd5e1",
                  textShadow: filled ? "0 6px 14px rgba(245, 158, 11, 0.35)" : "none",
                  animation: `starPop 320ms ease ${(index + 1) * 80}ms both`,
                }}
              >
                ★
              </span>
            );
          })}
        </div>

        <div style={styles.statsSection}>
          <MetricRow
            icon="⏱️"
            label="Time"
            current={Math.max(0, Number(elapsedTime.toFixed(2)))}
            limit={numericLimits.timeLimit}
            passed={timePassed}
            valueText={formatTime(elapsedTime)}
          />

          <MetricRow
            icon="👣"
            label="Steps"
            current={stepCount}
            limit={numericLimits.stepEstimated}
            passed={stepsPassed}
            valueText={String(stepCount)}
          />

          <MetricRow
            icon="🧩"
            label="Blocks"
            current={blocksUsed}
            limit={numericLimits.blockLimit}
            passed={blocksPassed}
            valueText={String(blocksUsed)}
          />

          <div style={styles.metricCard}>
            <div style={styles.metricTopRow}>
              <div style={styles.metricLabel}>
                <span>🍎</span>
                <strong>Fruits</strong>
              </div>
              <div style={styles.metricValue}>{fruitsCollected}</div>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={onReset} style={styles.secondaryButton}>
            🔄 Try Again
          </button>
          <button onClick={onBackToMenu} style={{ ...styles.secondaryButton, ...styles.menuButton }}>
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "28px",
    maxWidth: "560px",
    width: "100%",
    maxHeight: "92vh",
    overflowY: "auto",
    boxShadow: "0 24px 52px rgba(2, 6, 23, 0.4)",
    border: "1px solid #e2e8f0",
    position: "relative",
    animation: "resultsModalFade 220ms ease",
  },
  closeButton: {
    position: "absolute",
    top: "10px",
    right: "12px",
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#64748b",
    padding: "4px 8px",
  },
  header: {
    textAlign: "center",
    marginBottom: "14px",
  },
  headerIcon: {
    fontSize: "54px",
    marginBottom: "10px",
  },
  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 800,
  },
  subtitle: {
    margin: "8px 0 0",
    fontSize: "15px",
    color: "#475569",
    fontWeight: 700,
  },
  starsSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    marginBottom: "18px",
  },
  star: {
    fontSize: "40px",
    lineHeight: 1,
  },
  statsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "16px",
  },
  metricCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "10px",
  },
  metricTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  metricLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: "#334155",
    fontSize: "15px",
  },
  metricValue: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#0f172a",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  progressTrack: {
    marginTop: "8px",
    height: "8px",
    width: "100%",
    borderRadius: "999px",
    background: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.3s ease",
  },
  progressCaption: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#64748b",
    fontWeight: 700,
    textAlign: "right",
  },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    flex: "1 1 100%",
    padding: "13px 16px",
    background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    border: "1px solid #1d4ed8",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.3)",
  },
  secondaryButton: {
    flex: "1 1 180px",
    padding: "12px 14px",
    backgroundColor: "#f59e0b",
    color: "white",
    border: "1px solid #d97706",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  menuButton: {
    backgroundColor: "#475569",
    border: "1px solid #334155",
  },
};
