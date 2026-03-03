// src/portals/student/components/home/GalaxyHomeLayout.tsx
import HudBar from "./HudBar";
import PlanetCard from "./PlanetCard";
import ResumeWidget from "./ResumeWidget";
import RecommendWidget from "./RecommendWidget";
import styles from "./GalaxyHome.module.css";
import type { StudentHomeVM } from "@/portals/student/components/home/home.types";

export default function GalaxyHomeLayout({ vm }: { vm: StudentHomeVM }) {
  return (
    <div className={styles.page}>
      <HudBar hud={vm.hud} />

      <div className={styles.grid}>
        <section className={styles.mapArea} aria-label="Galaxy map">
          <div className={styles.mapBackdrop} aria-hidden />

          <div className={styles.mapHeader}>
            <div>
              <div className={styles.mapTitle}>Galaxy Map</div>
              <div className={styles.mapSub}>Choose your next destination</div>
            </div>
            <div className={styles.hintPill} title="Keyboard tip">
              <span className={styles.muted}>Tip:</span>&nbsp;Tab to focus planets
            </div>
          </div>

          <div className={styles.planets}>
            {vm.planets.map((p) => (
              <PlanetCard key={p.id} planet={p} />
            ))}
          </div>
        </section>

        <aside className={styles.sideArea} aria-label="Home widgets">
          <ResumeWidget resume={vm.resume} />
          <RecommendWidget items={vm.recommended} />

          <div className={`card ${styles.widget}`} style={{ padding: 12 }}>
            <div className={styles.widgetTitle}>Badge Collection</div>
            <div className={styles.muted} style={{ fontSize: 13 }}>
              Phase 1 placeholder
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
