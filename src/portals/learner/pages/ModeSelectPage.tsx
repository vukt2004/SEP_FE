import { useNavigate } from "react-router-dom";
import { UserCircle2, Users, Map, Plus, LogIn } from "lucide-react";
import styles from "../components/ModeSelectPage.module.css";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";

export default function ModeSelectPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <main className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <section className={styles.container}>
        <header className={styles.header}>
          <span className={styles.badge}>{t("chooseExperience")}</span>
          <h1 className={styles.title}>{t("howToPlay")}</h1>
          <p className={styles.subtitle}>{t("playSubtitle")}</p>
        </header>

        <div className={styles.grid}>
          <article className={`${styles.card} ${styles.cardSingle}`}>
            <div className={styles.cardGlow} aria-hidden />
            <div className={styles.cardBody}>
              <div className={styles.iconWrap} aria-hidden>
                <UserCircle2 className={styles.iconSvg} strokeWidth={1.75} />
              </div>
              <h2 className={styles.cardTitle}>{t("singlePlayer")}</h2>
              <p className={styles.cardLabel}>{t("singlePlayerDesc")}</p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => navigate(ROUTES.LEARNER_MAPS_BROWSE)}
              >
                <Map size={18} aria-hidden />
                {t("viewMaps")}
              </button>
            </div>
          </article>

          <article className={`${styles.card} ${styles.cardMulti}`}>
            <div className={styles.cardGlow} aria-hidden />
            <div className={styles.cardBody}>
              <div className={styles.iconWrap} aria-hidden>
                <Users className={styles.iconSvg} strokeWidth={1.75} />
              </div>
              <h2 className={styles.cardTitle}>{t("competitive")}</h2>
              <p className={styles.cardLabel}>{t("competitiveDesc")}</p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnAccent}`}
                onClick={() => navigate(ROUTES.LEARNER_ROOM_CREATE)}
              >
                <Plus size={18} aria-hidden />
                {t("createRoom")}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => navigate(ROUTES.LEARNER_ROOM_JOIN)}
              >
                <LogIn size={18} aria-hidden />
                {t("joinRoom")}
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
