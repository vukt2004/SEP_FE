import React from "react";

interface TrapFailedModalProps {
  isOpen: boolean;
  onReplay: () => void;
}

export const TrapFailedModal: React.FC<TrapFailedModalProps> = ({ isOpen, onReplay }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
      }}
    >
      <div
        style={{
          width: "min(92vw, 420px)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.28)",
          padding: "20px",
          color: "var(--text)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "20px" }}>You Hit a Trap</h3>
        <p style={{ margin: "10px 0 18px", fontSize: "14px", color: "var(--text-2)" }}>
          The character stepped on a trap and failed the level. Press Replay to reset the map and
          try again.
        </p>
        <button
          type="button"
          onClick={onReplay}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "10px",
            padding: "10px 12px",
            background: "var(--danger)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Replay
        </button>
      </div>
    </div>
  );
};