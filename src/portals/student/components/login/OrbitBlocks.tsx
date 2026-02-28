// src/portals/student/components/login/OrbitBlocks.tsx
import styles from "./LoginScene.module.css";

type Block = {
  angleDeg: number;
  radius: number; // px
};

const BLOCKS: Block[] = [
  { angleDeg: 20, radius: 138 },
  { angleDeg: 115, radius: 150 },
  { angleDeg: 205, radius: 142 },
  { angleDeg: 305, radius: 156 },
];

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

export default function OrbitBlocks() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className={styles.orbitRing}>
        {BLOCKS.map((b, i) => {
          const { x, y } = polarToXY(b.angleDeg, b.radius);
          return (
            <div
              key={i}
              className={styles.orbitBlock}
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                animationDelay: `${i * 180}ms`,
              }}
            >
              <div className={styles.orbitBlockInner} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
