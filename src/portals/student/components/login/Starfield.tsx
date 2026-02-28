// src/portals/student/components/login/Starfield.tsx
import { useMemo } from "react";
import styles from "./LoginScene.module.css";

type Star = {
  x: number; // 0..100
  y: number; // 0..100
  s: number; // size px
  o: number; // opacity
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(count: number, seed: number, sizeMin: number, sizeMax: number): Star[] {
  const rand = mulberry32(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * 100;
    const y = rand() * 100;
    const s = sizeMin + rand() * (sizeMax - sizeMin);
    const o = 0.25 + rand() * 0.55;
    stars.push({ x, y, s, o });
  }
  return stars;
}

export default function Starfield() {
  const layerA = useMemo(() => makeStars(90, 1337, 1, 2.2), []);
  const layerB = useMemo(() => makeStars(60, 2026, 1.2, 2.8), []);

  return (
    <div className={styles.sceneRoot} aria-hidden="true">
      <div className={`${styles.layer} ${styles.layerA}`}>
        {layerA.map((st, idx) => (
          <span
            key={`a-${idx}`}
            className={styles.star}
            style={{
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: `${st.s}px`,
              height: `${st.s}px`,
              opacity: st.o,
            }}
          />
        ))}
      </div>

      <div className={`${styles.layer} ${styles.layerB}`}>
        {layerB.map((st, idx) => (
          <span
            key={`b-${idx}`}
            className={styles.star}
            style={{
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: `${st.s}px`,
              height: `${st.s}px`,
              opacity: st.o,
            }}
          />
        ))}
      </div>
    </div>
  );
}
