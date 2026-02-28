import { useMemo } from "react";
import type { DuckMode } from "../../login/duckMode";
import styles from "./DuckAstronaut.module.css";

type Props = {
  mode: DuckMode;
};

export default function DuckAstronaut({ mode }: Props) {
  const modeClass = useMemo(() => {
    switch (mode) {
      case "look":
        return styles.modeLook;
      case "shy":
        return styles.modeShy;
      case "thinking":
        return styles.modeThinking;
      case "happy":
        return styles.modeHappy;
      case "oops":
        return styles.modeOops;
      case "idle":
      default:
        return styles.modeIdle;
    }
  }, [mode]);

  return (
    <div className={[styles.root, modeClass].join(" ")} aria-hidden="true">
      <div className={styles.float}>
        <div className={styles.duck}>
          {/* 1. Lớp kính phía sau mũ bảo hiểm */}
          <div className={styles.helmetBack}>
            <div className={styles.stars} />
          </div>

          {/* 2. Đầu vịt (Kẹp giữa mũ sau và mũ trước) */}
          <div className={styles.head}>
            <div className={styles.tuft} />

            {/* Mắt */}
            <div className={styles.eyes}>
              <span className={styles.eye}>
                <span className={styles.pupil} />
              </span>
              <span className={styles.eye}>
                <span className={styles.pupil} />
              </span>
            </div>

            <div className={styles.blush} />

            {/* Mỏ */}
            <div className={styles.beak}>
              <div className={styles.beakBottom} />
              <div className={styles.beakTop} />
            </div>
          </div>

          {/* 3. Cơ thể và bộ đồ phi hành gia */}
          <div className={styles.suit}>
            <div className={styles.suitHighlight} />
            <div className={styles.badge} />
            <div className={styles.panel}>
              <span className={styles.panelDot} />
              <span className={styles.panelDot} />
              <span className={styles.panelDot} />
            </div>
          </div>

          {/* 4. Cổ áo (Che điểm nối giữa đầu và thân) */}
          <div className={styles.collar} />

          {/* 5. Lớp kính phía trước của mũ (Trong suốt, có hiệu ứng chói sáng) */}
          <div className={styles.helmetGlass}>
            <div className={styles.glare} />
          </div>

          {/* 6. Hai cánh tay (Được đặt cao nhất để có thể vung lên che mắt) */}
          <div className={styles.armLeft}>
            <div className={styles.glove} />
          </div>
          <div className={styles.armRight}>
            <div className={styles.glove} />
          </div>

          {/* 7. Hiệu ứng cảm xúc (FX) */}
          <div className={styles.sparkle} />
          <div className={styles.sweat} />
          <div className={styles.thinkingDots}>
            <span />
            <span />
            <span />
          </div>
        </div>

        {/* Bóng dưới chân */}
        <div className={styles.shadow} />
      </div>
    </div>
  );
}
