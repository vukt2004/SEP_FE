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
    background: "rgba(15, 23, 42, 0.42)",
    backdropFilter: "blur(6px)",
  },
  modal: {
    width: "min(96vw, 520px)",
    borderRadius: "16px",
    border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
    background: "var(--surface)",
    boxShadow: "0 24px 56px rgba(2, 6, 23, 0.35)",
    padding: "22px",
    position: "relative",
    overflow: "hidden",
  },
  title: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "0.2px",
  },
  description: {
    margin: "12px 0 0",
    fontSize: "15px",
    lineHeight: 1.6,
    color: "var(--text)",
    whiteSpace: "pre-line",
  },
  actions: {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  secondaryButton: {
    borderRadius: "12px",
    border: "1px solid color-mix(in srgb, var(--text) 18%, var(--border))",
    background: "color-mix(in srgb, var(--surface) 88%, var(--bg))",
    color: "var(--text)",
    fontWeight: 700,
    fontSize: "14px",
    padding: "11px 12px",
    cursor: "pointer",
  },
  primaryButton: {
    borderRadius: "12px",
    border: "1px solid color-mix(in srgb, var(--primary) 82%, black 18%)",
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--primary) 92%, white 8%), color-mix(in srgb, var(--primary) 82%, black 18%))",
    color: "#fff",
    fontWeight: 800,
    fontSize: "14px",
    padding: "11px 12px",
    cursor: "pointer",
    boxShadow: "0 10px 20px color-mix(in srgb, var(--primary) 30%, transparent)",
  },
};
