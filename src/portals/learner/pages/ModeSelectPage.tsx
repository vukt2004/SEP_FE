import { useNavigate } from "react-router-dom";
import { UserCircle2, Users, Map, Plus, LogIn } from "lucide-react";
import styles from "../components/ModeSelectPage.module.css";
import { ROUTES } from "@/lib/constants/routes";

export default function ModeSelectPage() {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <section className={styles.container}>
        <header className={styles.header}>
          <span className={styles.badge}>Choose your experience</span>
          <h1 className={styles.title}>How do you want to play?</h1>
          <p className={styles.subtitle}>
            Practice alone or compete with others. Pick a mode below to get started.
          </p>
        </header>

        <div className={styles.grid}>
          <article className={`${styles.card} ${styles.cardSingle}`}>
            <div className={styles.cardGlow} aria-hidden />
            <div className={styles.cardBody}>
              <div className={styles.iconWrap} aria-hidden>
                <UserCircle2 className={styles.iconSvg} strokeWidth={1.75} />
              </div>
              <h2 className={styles.cardTitle}>Single player</h2>
              <p className={styles.cardLabel}>
                Practice solving maps at your own pace. No time pressure—just you and the puzzle.
              </p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => navigate(ROUTES.LEARNER_CHALLENGES)}
              >
                <Map size={18} aria-hidden />
                View maps
              </button>
            </div>
          </article>

          <article className={`${styles.card} ${styles.cardMulti}`}>
            <div className={styles.cardGlow} aria-hidden />
            <div className={styles.cardBody}>
              <div className={styles.iconWrap} aria-hidden>
                <Users className={styles.iconSvg} strokeWidth={1.75} />
              </div>
              <h2 className={styles.cardTitle}>Competitive</h2>
              <p className={styles.cardLabel}>
                Create or join a room and compete with other players to solve maps in real time.
              </p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnAccent}`}
                onClick={() => navigate(ROUTES.LEARNER_ROOM_CREATE)}
              >
                <Plus size={18} aria-hidden />
                Create room
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => navigate(ROUTES.LEARNER_ROOM_JOIN)}
              >
                <LogIn size={18} aria-hidden />
                Join room
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
