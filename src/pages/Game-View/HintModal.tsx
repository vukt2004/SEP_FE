import { useEffect, useMemo, useState } from "react";

export interface GameplayHint {
  orderNo: number;
  content: string;
}

interface HintModalProps {
  isOpen: boolean;
  hints: GameplayHint[];
  revealedHints: number;
  onRevealNext: () => void;
  onClose: () => void;
}

export function HintModal({ isOpen, hints, revealedHints, onRevealNext, onClose }: HintModalProps) {
  const [showFirstHintConfirm, setShowFirstHintConfirm] = useState(false);

  const sortedHints = useMemo(() => [...hints].sort((a, b) => a.orderNo - b.orderNo), [hints]);
  const revealedCount = Math.min(revealedHints, sortedHints.length);
  const visibleHints = sortedHints.slice(0, revealedCount);
  const allHintsRevealed = sortedHints.length > 0 && revealedCount >= sortedHints.length;
  const newestRevealedOrderNo = sortedHints[revealedCount - 1]?.orderNo ?? null;

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowFirstHintConfirm(false);
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setShowFirstHintConfirm(false);
      onClose();
    }
  };

  const handleShowNextHint = () => {
    if (allHintsRevealed || sortedHints.length === 0) return;

    if (revealedCount === 0) {
      setShowFirstHintConfirm(true);
      return;
    }

    onRevealNext();
  };

  const handleConfirmReveal = () => {
    setShowFirstHintConfirm(false);
    onRevealNext();
  };

  return (
    <div
      onMouseDown={handleBackdropMouseDown}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: isOpen ? "rgba(15, 23, 42, 0.48)" : "rgba(15, 23, 42, 0)",
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        transition: "background 220ms ease, opacity 220ms ease",
      }}
      aria-hidden={!isOpen}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hints modal"
        style={{
          width: "min(560px, 100%)",
          maxHeight: "80vh",
          overflow: "hidden",
          borderRadius: "16px",
          border: "1px solid rgba(250, 204, 21, 0.42)",
          background: "linear-gradient(180deg, #fffef7 0%, #fff8db 100%)",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.26)",
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.96) translateY(8px)",
          opacity: isOpen ? 1 : 0,
          transition: "transform 220ms ease, opacity 220ms ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(250, 204, 21, 0.45)",
            background: "rgba(255, 249, 196, 0.65)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "17px", color: "#854d0e", fontWeight: 800 }}>
            {`💡 Hints (${revealedCount}/${sortedHints.length})`}
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowFirstHintConfirm(false);
              onClose();
            }}
            style={{
              border: "none",
              background: "transparent",
              color: "#854d0e",
              fontSize: "22px",
              lineHeight: 1,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "8px",
            }}
            aria-label="Close hints"
          >
            ×
          </button>
        </div>

        <div
          style={{ padding: "14px 16px", overflowY: "auto", display: "grid", gap: "10px", flex: 1 }}
        >
          {visibleHints.length === 0 ? (
            <div
              style={{
                borderRadius: "12px",
                border: "1px dashed #facc15",
                color: "#a16207",
                background: "rgba(255, 249, 196, 0.45)",
                padding: "14px",
                fontSize: "14px",
              }}
            >
              No hints revealed yet.
            </div>
          ) : (
            visibleHints.map((hint, index) => (
              <article
                key={`hint-${hint.orderNo}-${index}`}
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "12px",
                  animation: "hintItemIn 260ms ease both",
                  animationDelay: `${index * 55}ms`,
                  boxShadow:
                    hint.orderNo === newestRevealedOrderNo
                      ? "0 0 0 2px rgba(250, 204, 21, 0.35), 0 8px 18px rgba(250, 204, 21, 0.24)"
                      : "0 4px 10px rgba(15, 23, 42, 0.06)",
                  transition: "box-shadow 220ms ease",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#a16207",
                    marginBottom: "6px",
                  }}
                >
                  Hint {hint.orderNo}
                </div>
                <div style={{ fontSize: "14px", lineHeight: 1.5, color: "#3f2d00" }}>
                  {hint.content}
                </div>
              </article>
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            borderTop: "1px solid rgba(250, 204, 21, 0.45)",
            background: "rgba(255, 249, 196, 0.58)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px", color: "#854d0e", fontWeight: 700 }}>
            {allHintsRevealed
              ? "All hints are revealed."
              : sortedHints.length === 0
                ? "No hints available for this map."
                : "Reveal hints one by one to keep challenge."}
          </span>
          <button
            type="button"
            disabled={allHintsRevealed || sortedHints.length === 0}
            onClick={handleShowNextHint}
            style={{
              border: "1px solid #f59e0b",
              borderRadius: "10px",
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 800,
              color: allHintsRevealed || sortedHints.length === 0 ? "#b8a56d" : "#78350f",
              background:
                allHintsRevealed || sortedHints.length === 0
                  ? "rgba(254, 243, 199, 0.62)"
                  : "linear-gradient(180deg, #fde68a 0%, #fcd34d 100%)",
              cursor: allHintsRevealed || sortedHints.length === 0 ? "not-allowed" : "pointer",
              boxShadow:
                allHintsRevealed || sortedHints.length === 0
                  ? "none"
                  : "0 8px 14px rgba(251, 191, 36, 0.26)",
              transition: "all 180ms ease",
            }}
          >
            Show Next Hint
          </button>
        </div>

        {showFirstHintConfirm && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15, 23, 42, 0.42)",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "min(360px, 100%)",
                borderRadius: "12px",
                background: "#fff",
                border: "1px solid #fcd34d",
                boxShadow: "0 18px 34px rgba(15, 23, 42, 0.28)",
                padding: "14px",
                animation: "hintModalIn 180ms ease",
              }}
            >
              <p
                style={{ margin: "0 0 12px", fontSize: "14px", color: "#7c2d12", fontWeight: 700 }}
              >
                Using hints may reduce your score. Continue?
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowFirstHintConfirm(false)}
                  style={{
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "7px 11px",
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReveal}
                  style={{
                    border: "1px solid #f59e0b",
                    background: "#fcd34d",
                    borderRadius: "8px",
                    padding: "7px 11px",
                    cursor: "pointer",
                    fontWeight: 800,
                    color: "#78350f",
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes hintModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes hintItemIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
