import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import styles from "./GameSessionExpiredPage.module.css";

export default function GameSessionExpiredPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite">
        <div className={styles.iconWrap} aria-hidden>
          <AlertTriangle size={24} />
        </div>
        <h1 className={styles.title}>{t("gameSessionExpiredTitle")}</h1>
        <p className={styles.desc}>{t("gameSessionExpiredDesc")}</p>
        <div className={styles.tips}>{t("gameSessionExpiredTip")}</div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => navigate(ROUTES.LEARNER_LEARN, { replace: true })}
          >
            {t("gameSessionExpiredGoMultiplayer")}
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigate(ROUTES.LEARNER_MAPS_BROWSE, { replace: true })}
          >
            {t("gameSessionExpiredFindOtherGame")}
          </button>
        </div>
      </section>
    </main>
  );
}

