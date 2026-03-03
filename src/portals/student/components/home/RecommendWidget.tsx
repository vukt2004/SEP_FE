import { Link } from "react-router-dom";
import styles from "./GalaxyHome.module.css";
import type { RecommendationItem } from "@/portals/student/components/home/home.types";

export default function RecommendWidget({ items }: { items: RecommendationItem[] }) {
  return (
    <div className={`card ${styles.widget}`} style={{ padding: 12 }}>
      <div className={styles.widgetTitle}>Recommended</div>

      <div className={styles.recoList}>
        {items.map((it) => (
          <Link key={it.id} to={it.href} className={styles.recoItem}>
            <div className={styles.recoTitle}>{it.title}</div>
            <div className={styles.recoMeta}>
              <span className={styles.muted}>{it.tag}</span>
              <span className={styles.dot} aria-hidden>
                •
              </span>
              <span className={styles.muted}>{it.difficulty}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
