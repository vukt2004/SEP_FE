import { Loader2 } from "lucide-react";
import styles from "./LobbyMapPickerGrid.module.css";
import { useTranslation } from "@/lib/i18n/translations";
import type { Map as ApiMap } from "@/types/api/learner/maps";
import { getDifficultyTier } from "@/lib/maps/difficultyDisplay";

export type LobbyMapPickerGridProps = {
  maps: ApiMap[];
  loading?: boolean;
  /** null = “no map” when allowNoMap */
  selectedMapId: string | null;
  onSelectMap: (mapId: string | null) => void;
  allowNoMap?: boolean;
  noMapLabel?: string;
  disabled?: boolean;
};

function difficultyClassFromTier(d: number): string {
  const tier = getDifficultyTier(d);
  if (tier === "easy") return styles.diffEasy;
  if (tier === "medium") return styles.diffMedium;
  return styles.diffHard;
}

function formatMinutes(ms: number, minutesLabel: string): string {
  const m = Math.max(1, Math.round(ms / 60000));
  return `${m} ${minutesLabel}`;
}

export function LobbyMapPickerGrid({
  maps,
  loading,
  selectedMapId,
  onSelectMap,
  allowNoMap,
  noMapLabel,
  disabled,
}: LobbyMapPickerGridProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={styles.wrap}>
        <p className={styles.loading}>
          <Loader2 size={18} className={styles.spinIcon} aria-hidden />
          {t("loading")}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {allowNoMap && (
        <button
          type="button"
          className={styles.noMapBtn}
          data-selected={selectedMapId === null || selectedMapId === ""}
          onClick={() => onSelectMap(null)}
          disabled={disabled}
        >
          {noMapLabel ?? "—"}
        </button>
      )}
      <div className={styles.grid}>
        {maps.map((m) => {
          const isPlatform = m.type === "Platform";
          const previewUrl =
            m.avatarUrl?.trim() || m.gallery?.find((item) => item.kind !== "Video")?.url?.trim() ||
            m.gallery?.[0]?.url?.trim() ||
            null;
          return (
            <button
              key={m.id}
              type="button"
              className={styles.card}
              data-selected={selectedMapId === m.id}
              onClick={() => onSelectMap(m.id)}
              disabled={disabled}
            >
              <div className={styles.thumb}>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt=""
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className={styles.placeholder} aria-hidden>
                    {isPlatform ? "🎮" : "🗺️"}
                  </span>
                )}
                <span
                  className={`${styles.typeBadge} ${isPlatform ? styles.badgePlatform : styles.badgeTopdown}`}
                >
                  {isPlatform ? t("lobbyMapTypePlatform") : t("lobbyMapTypeTopdown")}
                </span>
              </div>
              <div className={styles.body}>
                <h3 className={styles.title}>{m.title}</h3>
                {m.description ? <p className={styles.desc}>{m.description}</p> : null}
                <div className={styles.meta}>
                  <span className={difficultyClassFromTier(m.difficulty)}>
                    {t("difficulty")}: {m.difficulty}/5
                  </span>
                  <span>⏱ {formatMinutes(m.timeLimitMs, t("minutes"))}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
