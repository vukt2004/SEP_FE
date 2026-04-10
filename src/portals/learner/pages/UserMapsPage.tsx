import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Gamepad2, MessageCircle } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerChatApi } from "@/services/api/learner/chat.api.ts";
import type { GetMapsParams, Map } from "@/types/api/learner/maps";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import styles from "./UserMapsPage.module.css";

const PAGE_SIZE = 20;

export default function UserMapsPage() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const creatorName = searchParams.get("name")?.trim() || "";
  const navigate = useNavigate();
  const { t, locale } = useTranslation();

  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningCreatorChat, setIsOpeningCreatorChat] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!userId?.trim()) {
      setError(t("gameIdNotFound"));
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: GetMapsParams = {
          pageNumber: 1,
          pageSize: PAGE_SIZE,
          PageNumber: 1,
          PageSize: PAGE_SIZE,
          createdByUserId: userId,
          CreatedByUserId: userId,
          sortBy: "CreatedAt",
          sortAscending: false,
        };
        const res = await learnerMapsApi.getMaps(params);
        if (cancelled) return;

        if (!res.data.isSuccess || !res.data.data) {
          setError(res.data.message || t("failedLoadMapDetails"));
          setMaps([]);
          return;
        }

        const firstItems = res.data.data.items ?? [];
        const totalPages = Math.max(1, Number(res.data.data.totalPages ?? 1));

        if (totalPages <= 1) {
          setMaps(firstItems);
          return;
        }

        const pageRequests: Promise<Awaited<ReturnType<typeof learnerMapsApi.getMaps>>>[] = [];
        for (let p = 2; p <= totalPages; p += 1) {
          pageRequests.push(
            learnerMapsApi.getMaps({
              ...params,
              pageNumber: p,
              PageNumber: p,
            }),
          );
        }

        const rest = await Promise.all(pageRequests);
        if (cancelled) return;

        const allItems = [...firstItems];
        for (const r of rest) {
          if (r.data.isSuccess && Array.isArray(r.data.data?.items)) {
            allItems.push(...r.data.data.items);
          }
        }
        setMaps(allItems);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(t("errorLoadMapDetails"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  const creatorLabel = useMemo(() => {
    if (creatorName) return creatorName;
    if (maps[0]?.createdByUserName?.trim()) return maps[0].createdByUserName.trim();
    if (userId) return userId.slice(0, 8);
    return "";
  }, [creatorName, maps, userId]);

  const handleChatWithCreator = async () => {
    const targetMap = maps[0];
    if (!targetMap?.id || !targetMap.createdByUserId) return;

    try {
      setIsOpeningCreatorChat(true);
      const response = await learnerChatApi.getOrCreatePrivateConversation(targetMap.createdByUserId);
      const conversationId = response.data.data?.id;
      if (!response.data.isSuccess || !conversationId) {
        alert(
          response.data.message ||
            (locale.startsWith("vi")
              ? "Không thể mở cuộc trò chuyện với tác giả."
              : "Unable to open chat with creator."),
        );
        return;
      }

      const creator =
        targetMap.createdByUserName?.trim() || creatorLabel || targetMap.createdByUserId;
      const params = new URLSearchParams({
        otherUserId: targetMap.createdByUserId,
        otherUserName: creator,
      });
      navigate(`${ROUTES.LEARNER_CHAT_CONVERSATION(conversationId)}?${params.toString()}`);
    } catch (err) {
      console.error(err);
      alert(
        locale.startsWith("vi")
          ? "Có lỗi khi mở cuộc trò chuyện với tác giả."
          : "An error occurred while opening chat with creator.",
      );
    } finally {
      setIsOpeningCreatorChat(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label={t("back")}
        >
          <ArrowLeft size={18} /> {t("back")}
        </button>

        <header className={styles.header}>
          <h1 className={styles.title}>
            <Gamepad2 size={24} />
            {locale.startsWith("vi") ? "Bản đồ của tác giả" : "Creator maps"}
          </h1>
          {creatorLabel && <p className={styles.subtitle}>{creatorLabel}</p>}
          {maps.length > 0 && (
            <button
              type="button"
              className={styles.chatBtn}
              onClick={handleChatWithCreator}
              disabled={isOpeningCreatorChat}
            >
              <MessageCircle size={16} />
              {isOpeningCreatorChat
                ? locale.startsWith("vi")
                  ? "Đang mở chat..."
                  : "Opening chat..."
                : locale.startsWith("vi")
                  ? "Chat với tác giả"
                  : "Chat with creator"}
            </button>
          )}
        </header>

        {loading ? (
          <p className={styles.state}>{t("loadingMapDetails")}</p>
        ) : error ? (
          <p className={styles.stateError}>{error}</p>
        ) : maps.length === 0 ? (
          <p className={styles.state}>
            {locale.startsWith("vi")
              ? "Chưa có bản đồ nào cho tác giả này."
              : "No maps found for this creator."}
          </p>
        ) : (
          <>
            <div className={styles.grid}>
              {maps.map((m) => {
                const thumb = m.avatarUrl?.trim() || m.gallery?.[0]?.url?.trim() || "";
                const difficultyLabel =
                  m.difficulty <= 2 ? t("easy") : m.difficulty === 3 ? t("medium") : t("hard");
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={styles.card}
                    onClick={() => navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", m.id))}
                  >
                    <div className={styles.thumbWrap}>
                      {thumb ? (
                        <img src={thumb} alt={m.title} className={styles.thumb} loading="lazy" />
                      ) : (
                        <div className={styles.thumbPlaceholder}>No Preview</div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <h2 className={styles.cardTitle}>{m.title}</h2>
                      <p className={styles.cardDesc}>
                        {m.description?.trim() ||
                          (locale.startsWith("vi")
                            ? "Chưa có mô tả cho bản đồ này."
                            : "No description for this map.")}
                      </p>
                      <div className={styles.cardMeta}>
                        <span>{difficultyLabel}</span>
                        <span className={styles.price}>
                          {m.price > 0 ? `${m.price.toLocaleString()} OC` : t("free")}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className={styles.pagerText}>
              {locale.startsWith("vi") ? `${maps.length} bản đồ` : `${maps.length} maps`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
