// src/portals/student/components/home/HudBar.tsx
import styles from "./GalaxyHome.module.css";
import type { UserHud } from "@/portals/student/components/home/home.types";

export default function HudBar({ hud }: { hud: UserHud }) {
  const pct = Math.max(0, Math.min(1, hud.xp / Math.max(1, hud.xpToNext)));

  return (
    <div className={styles.hud}>
      <div className={styles.hudLeft}>
        <div className={styles.avatar} aria-hidden />
        <div>
          <div className={styles.hudName}>{hud.displayName}</div>
          <div className={styles.hudMeta}>
            Level <b>{hud.level}</b> • Badge <b>{hud.badgeLabel}</b>
          </div>
        </div>
      </div>

      <div className={styles.hudMid} aria-label="XP progress">
        <div className={styles.xpRow}>
          <span className={styles.muted}>XP</span>
          <span className={styles.muted}>
            {hud.xp}/{hud.xpToNext}
          </span>
        </div>
        <div
          className={styles.xpBar}
          role="progressbar"
          aria-valuenow={hud.xp}
          aria-valuemin={0}
          aria-valuemax={hud.xpToNext}
        >
          <div className={styles.xpFill} style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
      </div>

      <div className={styles.hudRight}>
        <div className={styles.statPill}>
          <span className={styles.muted}>Stars</span>
          <b>{hud.stars}</b>
        </div>
      </div>
    </div>
  );
}
