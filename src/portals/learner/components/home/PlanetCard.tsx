import { Link } from "react-router-dom";
import styles from "./GalaxyHome.module.css";
import type { Planet } from "@/portals/learner/components/home/home.types";

export default function PlanetCard({ planet }: { planet: Planet }) {
  const locked = planet.state === "locked";

  return (
    <div className={`${styles.planetCard} ${locked ? styles.locked : ""}`}>
      <div className={styles.planetTop}>
        <div className={styles.planetTitleRow}>
          <div className={styles.planetTitle}>{planet.title}</div>
          <span
            className={`${styles.tag} ${planet.state === "new" ? styles.tagNew : planet.state === "locked" ? styles.tagLocked : styles.tagReady}`}
          >
            {planet.state.toUpperCase()}
          </span>
        </div>
        <div className={styles.planetSubtitle}>{planet.subtitle}</div>
      </div>

      <div className={styles.planetActions}>
        {locked ? (
          <button className="btn" disabled aria-disabled="true" title="Unlock by progressing">
            Locked
          </button>
        ) : (
          <Link className="btn" to={planet.href}>
            {planet.primaryCta}
          </Link>
        )}
      </div>

      <div className={styles.planetHit} tabIndex={0} aria-label={`${planet.title} - open`} />
    </div>
  );
}
