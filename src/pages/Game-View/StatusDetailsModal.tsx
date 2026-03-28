import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/translations";

type MetricState = "pass" | "warn" | "fail";

interface StatusDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  elapsedSeconds: number;
  timeLimitSeconds: number | null;
  timeStarLimitSeconds: number | null;
  stepsUsed: number;
  stepLimit: number | null;
  blocksUsed: number;
  blockLimit: number | null;
  fruitsCollected: number;
  fruitsTotal: number | null;
}

const CLOSE_ANIMATION_MS = 180;

function formatClock(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenth = Math.floor((safe % 1) * 10);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${tenth}`;
}

function formatSeconds(seconds: number | null, noLimitLabel: string, secondsUnit: string): string {
  if (seconds == null || !Number.isFinite(seconds)) return noLimitLabel;
  return `${Math.round(seconds)}${secondsUnit}`;
}

function getMetricState(current: number, limit: number | null): MetricState {
  if (limit == null || !Number.isFinite(limit) || limit <= 0) return "pass";
  if (current > limit) return "fail";
  if (current >= limit * 0.8) return "warn";
  return "pass";
}

function getProgress(current: number, limit: number | null): number {
  if (limit == null || !Number.isFinite(limit) || limit <= 0) return 0;
  return Math.max(0, Math.min(100, (current / limit) * 100));
}

function stateColor(state: MetricState): string {
  if (state === "pass") return "#22c55e";
  if (state === "warn") return "#f59e0b";
  return "#ef4444";
}

function ProgressRow({
  icon,
  label,
  currentText,
  helperText,
  progress,
  state,
}: {
  icon: string;
  label: string;
  currentText: string;
  helperText?: string;
  progress: number;
  state: MetricState;
}) {
  return (
    <div style={styles.card}>
      <div style={styles.metricHeader}>
        <div style={styles.metricLabel}>
          <span>{icon}</span>
          <strong>{label}</strong>
        </div>
        <span style={{ ...styles.metricValue, color: stateColor(state) }}>{currentText}</span>
      </div>
      <div style={styles.track}>
        <div
          style={{
            ...styles.fill,
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${stateColor(state)} 0%, color-mix(in srgb, ${stateColor(state)} 70%, white 30%) 100%)`,
          }}
        />
      </div>
      {helperText ? <div style={styles.helperText}>{helperText}</div> : null}
    </div>
  );
}

export function StatusDetailsModal({
  isOpen,
  onClose,
  elapsedSeconds,
  timeLimitSeconds,
  timeStarLimitSeconds,
  stepsUsed,
  stepLimit,
  blocksUsed,
  blockLimit,
  fruitsCollected,
  fruitsTotal,
}: StatusDetailsModalProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(isOpen);
  const [isEntering, setIsEntering] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => setIsEntering(true));
      return;
    }

    setIsEntering(false);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const timeState = getMetricState(elapsedSeconds, timeLimitSeconds);
  const stepState = getMetricState(stepsUsed, stepLimit);
  const blockState = getMetricState(blocksUsed, blockLimit);
  const fruitState = getMetricState(fruitsCollected, fruitsTotal);

  const timePass = timeStarLimitSeconds == null ? true : elapsedSeconds <= timeStarLimitSeconds;
  const stepsPass = stepLimit == null ? true : stepsUsed <= stepLimit;
  const blocksPass = blockLimit == null ? true : blocksUsed <= blockLimit;

  const stars = Number(timePass) + Number(stepsPass) + Number(blocksPass);
  const noLimitLabel = t("statusDetailsNoLimit");
  const secondUnit = t("statusDetailsSecondUnit");

  const starCaption = useMemo(() => {
    if (stars === 3) return t("statusDetailsStarCaption3");
    if (stars === 2) return t("statusDetailsStarCaption2");
    if (stars === 1) return t("statusDetailsStarCaption1");
    return t("statusDetailsStarCaption0");
  }, [stars, t]);

  if (!mounted) return null;

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: isEntering ? 1 : 0,
      }}
      onClick={onClose}
      role="presentation"
    >
      <style>{`
        @keyframes statusModalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          ...styles.modal,
          opacity: isEntering ? 1 : 0,
          transform: isEntering ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
          animation: isEntering ? "statusModalIn 190ms ease" : "none",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.headerRow}>
          <div>
            <h3 style={styles.title}>{t("statusDetailsTitle")}</h3>
            <p style={styles.subtitle}>{t("statusDetailsSubtitle")}</p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton} aria-label={t("statusDetailsClose") }>
            ×
          </button>
        </div>

        <div style={styles.starStrip}>
          <div style={styles.starRow}>
            {[0, 1, 2].map((index) => (
              <span
                key={`status-star-${index}`}
                style={{
                  ...styles.star,
                  color: index < stars ? "#fbbf24" : "#475569",
                  textShadow: index < stars ? "0 8px 18px rgba(251, 191, 36, 0.35)" : "none",
                }}
              >
                ★
              </span>
            ))}
          </div>
          <div style={styles.starText}>{stars}/3 {t("statusDetailsStars")} • {starCaption}</div>
        </div>

        <div style={styles.grid}>
          <ProgressRow
            icon="⏱️"
            label={t("statusDetailsTime")}
            currentText={formatClock(elapsedSeconds)}
            helperText={`${t("statusDetailsLimit")}: ${formatSeconds(timeLimitSeconds, noLimitLabel, secondUnit)} • ⭐ ${t("statusDetailsIfLe")} ${formatSeconds(timeStarLimitSeconds, noLimitLabel, secondUnit)}`}
            progress={getProgress(elapsedSeconds, timeLimitSeconds ?? timeStarLimitSeconds)}
            state={timeState}
          />

          <ProgressRow
            icon="👣"
            label={t("statusDetailsSteps")}
            currentText={`${stepsUsed}${stepLimit != null ? ` / ${stepLimit}` : ""}`}
            helperText={stepLimit == null ? t("statusDetailsNoStepLimit") : `⭐ ${t("statusDetailsIfLe")} ${stepLimit}`}
            progress={getProgress(stepsUsed, stepLimit)}
            state={stepState}
          />

          <ProgressRow
            icon="🧩"
            label={t("statusDetailsBlocks")}
            currentText={`${blocksUsed}${blockLimit != null ? ` / ${blockLimit}` : ""}`}
            helperText={blockLimit == null ? t("statusDetailsNoBlockLimit") : `⭐ ${t("statusDetailsIfLe")} ${blockLimit}`}
            progress={getProgress(blocksUsed, blockLimit)}
            state={blockState}
          />

          <ProgressRow
            icon="🍎"
            label={t("statusDetailsFruits")}
            currentText={fruitsTotal != null ? `${fruitsCollected} / ${fruitsTotal}` : String(fruitsCollected)}
            helperText={fruitsTotal != null ? t("statusDetailsCollectionProgress") : t("statusDetailsCollectedFruits")}
            progress={getProgress(fruitsCollected, fruitsTotal)}
            state={fruitState}
          />
        </div>

        <div style={styles.criteriaCard}>
          <div style={styles.criteriaTitle}>{t("statusDetailsCriteriaTitle")}</div>
          <div style={styles.criteriaItem}>
            <span style={{ color: timePass ? "var(--success, #22c55e)" : "var(--danger, #ef4444)" }}>{timePass ? "✅" : "❌"}</span>
            <span>
              {t("statusDetailsTime")} ≤ {formatSeconds(timeStarLimitSeconds, noLimitLabel, secondUnit)} → ⭐
            </span>
          </div>
          <div style={styles.criteriaItem}>
            <span style={{ color: stepsPass ? "var(--success, #22c55e)" : "var(--danger, #ef4444)" }}>{stepsPass ? "✅" : "❌"}</span>
            <span>
              {t("statusDetailsSteps")} ≤ {stepLimit ?? noLimitLabel} → ⭐
            </span>
          </div>
          <div style={styles.criteriaItem}>
            <span style={{ color: blocksPass ? "var(--success, #22c55e)" : "var(--danger, #ef4444)" }}>{blocksPass ? "✅" : "❌"}</span>
            <span>
              {t("statusDetailsBlocks")} ≤ {blockLimit ?? noLimitLabel} → ⭐
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "color-mix(in srgb, var(--bg, #0f172a) 72%, transparent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    zIndex: 1200,
    transition: `opacity ${CLOSE_ANIMATION_MS}ms ease`,
  },
  modal: {
    width: "min(840px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "18px",
    border: "1px solid var(--border)",
    background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, #000 6%) 0%, color-mix(in srgb, var(--surface-2) 90%, #000 10%) 100%)",
    boxShadow: "0 26px 60px color-mix(in srgb, var(--bg, #0f172a) 65%, transparent)",
    color: "var(--text)",
    padding: "18px",
    transition: `opacity ${CLOSE_ANIMATION_MS}ms ease, transform ${CLOSE_ANIMATION_MS}ms ease`,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "12px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 800,
    color: "var(--text)",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "var(--text-2)",
    fontSize: "13px",
    fontWeight: 600,
  },
  closeButton: {
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-2)",
    borderRadius: "10px",
    width: "34px",
    height: "34px",
    cursor: "pointer",
    fontSize: "24px",
    lineHeight: 1,
  },
  starStrip: {
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--primary) 14%, var(--surface))",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "12px",
  },
  starRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  star: {
    fontSize: "30px",
    lineHeight: 1,
  },
  starText: {
    textAlign: "center",
    fontSize: "13px",
    color: "var(--text)",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "10px",
  },
  card: {
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "var(--surface)",
    padding: "10px",
  },
  metricHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  metricLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    color: "var(--text)",
  },
  metricValue: {
    fontSize: "14px",
    fontWeight: 800,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  track: {
    marginTop: "8px",
    height: "8px",
    width: "100%",
    borderRadius: "999px",
    background: "color-mix(in srgb, var(--border) 80%, transparent)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 240ms ease",
  },
  helperText: {
    marginTop: "7px",
    fontSize: "12px",
    color: "var(--text-2)",
    fontWeight: 600,
  },
  criteriaCard: {
    marginTop: "12px",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "var(--surface)",
    padding: "12px",
    display: "grid",
    gap: "8px",
  },
  criteriaTitle: {
    fontSize: "14px",
    color: "var(--text)",
    fontWeight: 800,
  },
  criteriaItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "var(--text)",
    fontWeight: 600,
  },
};
