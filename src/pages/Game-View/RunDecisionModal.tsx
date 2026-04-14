import React from "react";

interface RunDecisionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}

export const RunDecisionModal: React.FC<RunDecisionModalProps> = ({
  isOpen,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.headerGlow} />
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.description}>{description}</p>

        <div style={styles.actions}>
          <button type="button" onClick={onSecondary} style={styles.secondaryButton}>
            {secondaryLabel}
          </button>
          <button type="button" onClick={onPrimary} style={styles.primaryButton}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    background: "color-mix(in srgb, var(--bg) 72%, transparent)",
    backdropFilter: "blur(3px)",
  },
  modal: {
    width: "min(96vw, 520px)",
    borderRadius: "18px",
    border: "1px solid color-mix(in srgb, var(--primary) 28%, var(--border))",
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--surface) 95%, white 5%) 0%, var(--surface-2) 100%)",
    boxShadow: "0 22px 52px rgba(15, 23, 42, 0.28)",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: "-80px",
    left: "-40px",
    width: "200px",
    height: "200px",
    borderRadius: "999px",
    pointerEvents: "none",
    background: "color-mix(in srgb, var(--primary) 26%, transparent)",
    filter: "blur(2px)",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "0.2px",
  },
  description: {
    margin: "10px 0 0",
    fontSize: "14px",
    lineHeight: 1.55,
    color: "var(--text-2)",
    whiteSpace: "pre-line",
  },
  actions: {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  secondaryButton: {
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 700,
    fontSize: "14px",
    padding: "11px 12px",
    cursor: "pointer",
  },
  primaryButton: {
    borderRadius: "12px",
    border: "1px solid var(--primary)",
    background: "linear-gradient(180deg, var(--primary), color-mix(in srgb, var(--primary) 82%, black 18%))",
    color: "#fff",
    fontWeight: 800,
    fontSize: "14px",
    padding: "11px 12px",
    cursor: "pointer",
    boxShadow: "0 10px 24px color-mix(in srgb, var(--primary) 35%, transparent)",
  },
};
