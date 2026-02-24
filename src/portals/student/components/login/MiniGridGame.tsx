import React, { useEffect, useMemo, useState } from "react";

type Pos = { x: number; y: number };
const W = 6;
const H = 3;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function MiniGridGame() {
  const [pos, setPos] = useState<Pos>({ x: 1, y: 1 });
  const [score, setScore] = useState(0);

  const coins = useMemo(() => new Set(["4,0", "2,2", "5,1"]), []);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const tryMove = (dx: number, dy: number) => {
    setPos((p) => {
      const nx = clamp(p.x + dx, 0, W - 1);
      const ny = clamp(p.y + dy, 0, H - 1);
      const key = `${nx},${ny}`;
      if (coins.has(key) && !picked.has(key)) {
        setPicked((s) => new Set([...s, key]));
        setScore((v) => v + 1);
      }
      return { x: nx, y: ny };
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") tryMove(-1, 0);
      if (e.key === "ArrowRight") tryMove(1, 0);
      if (e.key === "ArrowUp") tryMove(0, -1);
      if (e.key === "ArrowDown") tryMove(0, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  return (
    <div
      style={{
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(2,6,23,0.18)",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 650 }}>Warm-up Grid</div>
        <div style={{ fontSize: 12, opacity: 0.82 }}>Coins: {score}/3</div>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: `repeat(${W}, 42px)`,
          gap: 8,
        }}
      >
        {Array.from({ length: W * H }).map((_, i) => {
          const x = i % W;
          const y = Math.floor(i / W);
          const key = `${x},${y}`;
          const isPlayer = pos.x === x && pos.y === y;
          const isCoin = coins.has(key) && !picked.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                const dx = x - pos.x;
                const dy = y - pos.y;
                if (Math.abs(dx) + Math.abs(dy) !== 1) return;
                tryMove(dx, dy);
              }}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.16)",
                background: "rgba(15,23,42,0.32)",
                position: "relative",
                cursor: "pointer",
              }}
              aria-label={`cell-${x}-${y}`}
            >
              {isCoin && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 16,
                  }}
                >
                  ●
                </span>
              )}
              {isPlayer && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 16,
                  }}
                >
                  ▣
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Tip: dùng phím mũi tên hoặc click ô kề để nhặt coin.
      </div>
    </div>
  );
}
