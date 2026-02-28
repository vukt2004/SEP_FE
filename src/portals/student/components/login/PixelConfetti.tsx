// src/portals/student/components/login/PixelConfetti.tsx
import React, { useMemo } from "react";
import styles from "./LoginScene.module.css";

type Px = { left: number; top: number; dx: number; dy: number; delay: number };

// Style type có custom CSS variables
type ConfettiStyle = React.CSSProperties & {
  "--dx": string;
  "--dy": string;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function PixelConfetti({ show }: { show: boolean }) {
  const pieces = useMemo(() => {
    const rand = mulberry32(9090);
    const arr: Px[] = [];
    for (let i = 0; i < 10; i++) {
      const left = 48 + (rand() * 16 - 8); // around center
      const top = 42 + (rand() * 12 - 6);
      const dx = rand() * 160 - 80;
      const dy = -(60 + rand() * 120);
      const delay = rand() * 90;
      arr.push({ left, top, dx, dy, delay });
    }
    return arr;
  }, []);

  if (!show) return null;

  return (
    <div className={styles.confetti} aria-hidden="true">
      {pieces.map((p, i) => {
        // Tạo object style theo kiểu ConfettiStyle
        const style: ConfettiStyle = {
          left: `${p.left}%`,
          top: `${p.top}%`,
          "--dx": `${p.dx}px`,
          "--dy": `${p.dy}px`,
          animationDelay: `${p.delay}ms`,
        };

        return <span key={i} className={styles.pixel} style={style} />;
      })}
    </div>
  );
}
