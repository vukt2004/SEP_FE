import React from "react";
import styles from "./LoginScene.module.css";

export default function LoginLoadingOverlay({ show, step }: { show: boolean; step: number }) {
  if (!show) return null;

  const label =
    step === 0
      ? "Loading profile..."
      : step === 1
        ? "Syncing progress..."
        : step === 2
          ? "Preparing level..."
          : "Entering world...";

  const playerIndex = Math.min(step * 2, 6);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(2,6,23,0.72)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      aria-live="polite"
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.22)",
          background: "rgba(15,23,42,0.45)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
          padding: 18,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className={styles.loadingBarWrap} aria-hidden="true">
          <div className={styles.loadingBar} />
        </div>

        <div style={{ fontWeight: 750, fontSize: 18 }}>Starting game session</div>
        <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13 }}>{label}</div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 26px)", gap: 6 }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const isPlayer = i === playerIndex;
              const isCoin = i === 3 && step < 2;
              const isPortal = i === 7;

              return (
                <div
                  key={i}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.16)",
                    background: "rgba(2,6,23,0.18)",
                    position: "relative",
                  }}
                >
                  {isCoin && (
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      ●
                    </span>
                  )}
                  {isPortal && (
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      ◉
                    </span>
                  )}
                  {isPlayer && (
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      ▣
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.3 }}>
            Keep going…
            <br />
            almost there.
          </div>
        </div>
      </div>
    </div>
  );
}
