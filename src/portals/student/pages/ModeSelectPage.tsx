import { useNavigate } from "react-router-dom";
import styles from "../components/ModeSelectPage.module.css";

import { ROUTES } from "@/lib/constants/routes";

function SinglePersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 20c1.8-4 4.6-6 7-6s5.2 2 7 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThreePeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      {/* Heads */}
      <circle cx="12" cy="7.5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6.5" cy="9" r="2.3" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="9" r="2.3" stroke="currentColor" strokeWidth="2" />

      {/* Bodies */}
      <path
        d="M6.5 21c1.7-4 4.2-6.2 5.5-6.2S15.8 17 17.5 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M2.2 21c1.2-2.8 3-4.4 4.2-4.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M21.8 21c-1.2-2.8-3-4.4-4.2-4.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export default function ModeSelectPage() {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Choose Mode</h1>
          <p className={styles.subtitle}>Pick how you want to play today.</p>
        </header>
        {/* Căn giữa */}

        <div className={styles.grid}>
          {/* Single Player */}
          <article className={`${styles.card} ${styles.cardSingle}`}>
            <div className={styles.cardTop}>
              <div className={styles.iconSingle} aria-hidden>
                <SinglePersonIcon className={styles.iconSvg} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Single Player</h2>
                <p className={styles.cardLabel}>Challenge Mode</p>
              </div>
            </div>
            {/* To icon, nhỏ mô tả, Icon lớn ở trên, tên mode ở dưới */}

            <ul className={styles.list}>
              <li>Browse catalog by difficulty & concept tags</li>
              <li>Run / Step-run with highlighted blocks</li>
              <li>Layered hints, earn XP & stars</li>
            </ul>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => navigate(ROUTES.STUDENT_CHALLENGES)}
              >
                Browse challenges
              </button>
            </div>
          </article>

          {/* Multiplayer */}
          <article className={`${styles.card} ${styles.cardMulti}`}>
            <div className={styles.cardTop}>
              <div className={styles.iconMulti} aria-hidden>
                <ThreePeopleIcon className={styles.iconSvg} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Multiplayer</h2>
                <p className={styles.cardLabel}>Competitive Mode</p>
              </div>
            </div>

            <ul className={styles.list}>
              <li>2–8 players solve the same puzzle</li>
              <li>Rank by correctness, efficiency & speed</li>
              <li>See results & replays of others</li>
            </ul>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnAccent}`}
                onClick={() => navigate(ROUTES.STUDENT_ROOM_CREATE)}
              >
                Create room
              </button>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => navigate(ROUTES.STUDENT_ROOM_JOIN)}
              >
                Join room
              </button>
            </div>
          </article>
        </div>

        <footer className={styles.footerNote}>Tip: You can switch modes anytime.</footer>
      </section>
    </main>
  );
}
