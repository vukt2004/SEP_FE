import React from "react";

type MetricResult = {
  time: number;
  steps: number;
  blocks: number;
};

type MetricLimits = {
  timeStarLimit: number;
  stepEstimated: number;
  blockLimit: number;
};

function calculateStars(result: MetricResult, limits: MetricLimits): number {
  let stars = 0;

  if (result.time <= limits.timeStarLimit) stars++;
  if (result.steps <= limits.stepEstimated) stars++;
  if (result.blocks <= limits.blockLimit) stars++;

  return stars;
}

interface GameResultsModalProps {
  isOpen: boolean;
  isWin: boolean;
  stepCount: number;
  blocksUsed: number;
  elapsedTime: number;
  fruitsCollected: number;
  timeLimitSeconds: number | null;
  timeStarThresholdPercent: number | null;
  stepEstimated: number | null;
  blockLimit: number | null;
  onReset: () => void;
  onBackToMenu: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  /** Multiplayer: shown after auto/manual submit while waiting for other players */
  multiplayerFooterNote?: string | null;
  /** Single-player campaign: next MapDetails level */
  onNextLevel?: () => void;
  nextLevelLabel?: string;
  resultPopupEnabled?: boolean;
  onToggleResultPopup?: () => void;
  resultPopupOnLabel?: string;
  resultPopupOffLabel?: string;
  backendScore?: number | null;
  backendStars?: number | null;
  backendStatus?: string | null;
  backendMessage?: string | null;
  backendScoreLabel?: string;
  backendStatusLabel?: string;
  backendMessageLabel?: string;
}

export const GameResultsModal: React.FC<GameResultsModalProps> = ({
  isOpen,
  isWin,
  stepCount,
  blocksUsed,
  elapsedTime,
  fruitsCollected,
  timeLimitSeconds,
  timeStarThresholdPercent,
  stepEstimated,
  blockLimit,
  onReset,
  onBackToMenu,
  onMinimize,
  onClose,
  multiplayerFooterNote,
  onNextLevel,
  nextLevelLabel = "Next level",
  backendScore,
  backendStars,
  backendStatus,
  backendMessage,
  backendScoreLabel = "Backend score",
  backendStatusLabel = "Backend status",
  backendMessageLabel = "Backend message",
}) => {
  if (!isOpen) return null;
  const [isWindowExpanded, setIsWindowExpanded] = React.useState(false);

  const modalStyle: React.CSSProperties = {
    ...styles.modal,
    ...(isWindowExpanded
      ? {
          width: "min(96vw, 960px)",
          maxWidth: "96vw",
          maxHeight: "96vh",
        }
      : {}),
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const hasTimeLimit = typeof timeLimitSeconds === "number" && timeLimitSeconds > 0;
  const normalizedTimeStarPercent =
    typeof timeStarThresholdPercent === "number" && Number.isFinite(timeStarThresholdPercent)
      ? Math.max(1, Math.min(100, Math.floor(timeStarThresholdPercent)))
      : 100;
  const timeStarLimitSeconds = hasTimeLimit
    ? (timeLimitSeconds as number) * (normalizedTimeStarPercent / 100)
    : Number.POSITIVE_INFINITY;
  const hasStepEstimated = typeof stepEstimated === "number" && stepEstimated > 0;
  const hasBlockLimit = typeof blockLimit === "number" && blockLimit > 0;

  const numericLimits: MetricLimits = {
    timeStarLimit: timeStarLimitSeconds,
    stepEstimated: hasStepEstimated ? (stepEstimated as number) : Number.POSITIVE_INFINITY,
    blockLimit: hasBlockLimit ? (blockLimit as number) : Number.POSITIVE_INFINITY,
  };

  const calculatedStars = calculateStars(
    {
      time: elapsedTime,
      steps: stepCount,
      blocks: blocksUsed,
    },
    numericLimits,
  );
  const stars =
    backendStars != null
      ? Math.max(0, Math.min(3, Math.round(backendStars)))
      : calculatedStars;

  const subtitle =
    stars === 3
      ? "Perfect!"
      : stars === 2
        ? "Great job!"
        : stars === 1
          ? "Good effort!"
          : "Try again!";

  const timePassed = elapsedTime <= numericLimits.timeStarLimit;
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
          <div
            style={{
              ...styles.metricValue,
              color: passed ? "var(--success, #047857)" : "var(--danger, #b91c1c)",
            }}
          >
            {valueText}
          </div>
        </div>

        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
              background: passed
                ? "linear-gradient(90deg, var(--success, #10b981), color-mix(in srgb, var(--success, #10b981) 70%, white 30%))"
                : "linear-gradient(90deg, var(--danger, #ef4444), color-mix(in srgb, var(--danger, #ef4444) 70%, white 30%))",
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
    <div style={styles.overlay}>
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

      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={styles.windowControls}>
          <button
            type="button"
            aria-label="Minimize results window"
            title="Minimize"
            style={{ ...styles.windowControlButton, ...styles.windowControlMin }}
            onClick={() => onMinimize?.()}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Maximize results window"
            title={isWindowExpanded ? "Restore" : "Maximize"}
            style={{ ...styles.windowControlButton, ...styles.windowControlMax }}
            onClick={() => setIsWindowExpanded((prev) => !prev)}
          >
            {isWindowExpanded ? "◱" : "□"}
          </button>
          <button
            type="button"
            aria-label="Close results window"
            title="Close"
            style={{ ...styles.windowControlButton, ...styles.windowControlClose }}
            onClick={() => onClose?.()}
          >
            ×
          </button>
        </div>

        <div style={styles.heroSection}>
          {backendScore != null ? (
            <div style={styles.scoreHeroWrap}>
              <span style={styles.scoreHeroLabel}>{backendScoreLabel}</span>
              <strong style={styles.scoreHeroValue}>{backendScore}</strong>
            </div>
          ) : null}
          <div style={styles.header}>
            <div style={styles.headerIcon}>{isWin ? "🏆" : "😔"}</div>
            <h2 style={styles.title}>{isWin ? "Level Complete!" : "Game Over"}</h2>
            <p style={styles.subtitle}>{subtitle.toUpperCase()}</p>
          </div>

          <div style={styles.starsSection}>
            {[0, 1, 2].map((index) => {
              const filled = index < stars;
              return (
                <span
                  key={`star-${index}`}
                  style={{
                    ...styles.star,
                    color: filled ? "#ffd84d" : "rgba(255, 255, 255, 0.35)",
                    textShadow: filled ? "0 3px 10px rgba(255, 216, 77, 0.45)" : "none",
                    animation: `starPop 320ms ease ${(index + 1) * 80}ms both`,
                  }}
                >
                  ★
                </span>
              );
            })}
          </div>
        </div>

        <div style={styles.bodySection}>
          <div style={styles.statsSection}>
            <MetricRow
              icon="⏱️"
              label="Time"
              current={Math.max(0, Number(elapsedTime.toFixed(2)))}
              limit={numericLimits.timeStarLimit}
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
              <div style={styles.progressCaption}>{`${fruitsCollected} collected`}</div>
            </div>

            {backendScore != null || backendStatus || backendMessage || backendStars != null ? (
              <div style={styles.metricCard}>
                {backendStatus ? (
                  <div style={styles.backendRow}>
                    <strong>{backendStatusLabel}:</strong>
                    <span>{backendStatus}</span>
                  </div>
                ) : null}
                {backendMessage ? (
                  <div style={styles.backendRow}>
                    <strong>{backendMessageLabel}:</strong>
                    <span>{backendMessage}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {multiplayerFooterNote ? (
          <div
            style={{
              marginBottom: "14px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "color-mix(in srgb, var(--info, #2563eb) 14%, var(--surface-2, #f1f5f9))",
              border:
                "1px solid color-mix(in srgb, var(--info, #2563eb) 35%, var(--border, #e2e8f0))",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1.45,
            }}
            role="status"
          >
            {multiplayerFooterNote}
          </div>
        ) : null}

        <div style={styles.actions}>
          {isWin ? (
            <>
              <button
                onClick={onBackToMenu}
                style={{ ...styles.secondaryButton, ...styles.returnButton }}
              >
                ← Return
              </button>
              <button
                onClick={onNextLevel ?? onBackToMenu}
                style={{ ...styles.secondaryButton, ...styles.primaryButton }}
              >
                {onNextLevel ? `${nextLevelLabel} →` : "Back to game →"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onReset}
                style={{ ...styles.secondaryButton, ...styles.returnButton }}
              >
                Replay
              </button>
              <button
                onClick={onBackToMenu}
                style={{ ...styles.secondaryButton, ...styles.primaryButton }}
              >
                ← Return
              </button>
            </>
          )}
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
    backgroundColor: "color-mix(in srgb, var(--bg, #0f172a) 70%, transparent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
  },
  modal: {
    backgroundColor: "#f3f5f7",
    borderRadius: "20px",
    padding: "0 0 12px",
    maxWidth: "520px",
    width: "100%",
    maxHeight: "calc(100vh - 20px)",
    overflow: "hidden",
    boxShadow: "0 18px 46px rgba(15, 23, 42, 0.28)",
    border: "1px solid rgba(148, 163, 184, 0.35)",
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
    color: "var(--text-2)",
    padding: "4px 8px",
  },
  windowControls: {
    position: "absolute",
    top: "12px",
    right: "14px",
    display: "flex",
    gap: "8px",
    zIndex: 2,
  },
  windowControlButton: {
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: 1,
    cursor: "pointer",
  },
  windowControlMin: {
    background: "#f2d8b3",
    color: "#334155",
  },
  windowControlMax: {
    background: "#cbe7d0",
    color: "#334155",
  },
  windowControlClose: {
    background: "#f2c3c6",
    color: "#334155",
  },
  heroSection: {
    background: "linear-gradient(180deg, #2c5aa0 0%, #244b88 100%)",
    padding: "54px 20px 18px",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    color: "#ffffff",
  },
  scoreHeroWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "8px",
  },
  scoreHeroLabel: {
    fontSize: "12px",
    letterSpacing: "1px",
    textTransform: "uppercase",
    fontWeight: 800,
    color: "rgba(255, 255, 255, 0.8)",
  },
  scoreHeroValue: {
    fontSize: "44px",
    lineHeight: 1,
    fontWeight: 900,
    color: "#ffffff",
    textShadow: "0 6px 20px rgba(15, 23, 42, 0.35)",
  },
  bodySection: {
    padding: "12px 16px 0",
  },
  header: {
    textAlign: "center",
    marginBottom: "4px",
  },
  headerIcon: {
    fontSize: "44px",
    marginBottom: "4px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    lineHeight: 1.1,
    color: "#ffffff",
    textShadow: "0 2px 0 rgba(15, 23, 42, 0.25)",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    letterSpacing: "1.1px",
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: 800,
  },
  starsSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    marginBottom: "2px",
  },
  star: {
    fontSize: "28px",
    lineHeight: 1,
  },
  statsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    background: "#e8ecef",
    border: "1px solid #d6dce2",
    borderRadius: "14px",
    padding: "10px",
    marginBottom: "10px",
  },
  metricCard: {
    backgroundColor: "#f2f4f7",
    border: "1px solid #e1e7ee",
    borderRadius: "10px",
    padding: "8px 10px",
  },
  backendRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "#1f2a44",
    lineHeight: 1.35,
    marginTop: "4px",
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
    color: "#1f2a44",
    fontSize: "14px",
  },
  metricValue: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#1f2a44",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  progressTrack: {
    marginTop: "5px",
    height: "6px",
    width: "100%",
    borderRadius: "999px",
    background: "#d0d6dd",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.3s ease",
  },
  progressCaption: {
    marginTop: "3px",
    fontSize: "11px",
    color: "#7b8896",
    fontWeight: 700,
    textAlign: "right",
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    padding: "0 16px",
  },
  primaryButton: {
    flex: "1 1 160px",
    padding: "11px 12px",
    background: "linear-gradient(180deg, #3b82f6, #2563eb)",
    color: "#ffffff",
    border: "1px solid #1d4ed8",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.28)",
  },
  secondaryButton: {
    flex: "1 1 160px",
    padding: "11px 11px",
    backgroundColor: "#edf1f5",
    color: "#334155",
    border: "1px solid #dbe3ea",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  returnButton: {
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.8)",
  },
  reportButton: {
    background: "#fff3e0",
    border: "1px solid #f1d19b",
    color: "#7c3f00",
  },
};
