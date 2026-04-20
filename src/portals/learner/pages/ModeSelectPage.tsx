import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserCircle2, Users, Map, Plus, LogIn, Loader2, X } from "lucide-react";
import styles from "../components/ModeSelectPage.module.css";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { gameLobbyHub } from "@/lib/realtime/gameLobbyHub";
import type { LobbyRoomListItem } from "@/types/api/learner/lobby";
import type { MapDetail } from "@/types/api/learner/maps";

/** BE JSON thường serialize enum thành số (0=Waiting, …) — không dùng ?? vì 0 là falsy nhưng hợp lệ. */
function normalizeStatus(raw: unknown): LobbyRoomListItem["status"] {
  if (raw === 0 || raw === "Waiting") return "Waiting";
  if (raw === 1 || raw === "Playing") return "Playing";
  if (raw === 2 || raw === "Finished") return "Finished";
  if (raw === 3 || raw === "Cancelled") return "Cancelled";
  return "Waiting";
}

function normalizeRoom(item: Record<string, unknown>): LobbyRoomListItem {
  return {
    roomId: String(item.roomId ?? item.RoomId ?? ""),
    roomCode: String(item.roomCode ?? item.RoomCode ?? ""),
    hostId: String(item.hostId ?? item.HostId ?? ""),
    hostName:
      item.hostName != null
        ? String(item.hostName)
        : item.HostName != null
          ? String(item.HostName)
          : null,
    currentPlayerCount: Number(item.currentPlayerCount ?? item.CurrentPlayerCount ?? 0),
    maxPlayers: Number(item.maxPlayers ?? item.MaxPlayers ?? 8),
    status: normalizeStatus(item.status ?? item.Status),
    isLocked: Boolean(item.isLocked ?? item.IsLocked),
    selectedGameId:
      item.selectedGameId != null
        ? String(item.selectedGameId)
        : item.SelectedGameId != null
          ? String(item.SelectedGameId)
          : null,
    selectedGameTitle:
      item.selectedGameTitle != null
        ? String(item.selectedGameTitle)
        : item.SelectedGameTitle != null
          ? String(item.SelectedGameTitle)
          : null,
    selectedMapId:
      item.selectedMapId != null
        ? String(item.selectedMapId)
        : item.SelectedMapId != null
          ? String(item.SelectedMapId)
          : null,
  };
}

const MAX_PLAYER_OPTIONS = [2, 4, 6, 8] as const;

export default function ModeSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<LobbyRoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createMaxPlayers, setCreateMaxPlayers] = useState(4);
  const [createMapId, setCreateMapId] = useState<string | null>(null);
  const [createMapTitle, setCreateMapTitle] = useState<string>("");
  const [selectedMapDetail, setSelectedMapDetail] = useState<MapDetail | null>(null);
  const [selectedMapDetailLoading, setSelectedMapDetailLoading] = useState(false);
  const [createLocked, setCreateLocked] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const state = (location.state ?? null) as
      | {
          openCreateModal?: boolean;
          selectedMapId?: string | null;
          selectedMapTitle?: string;
          maxPlayers?: number;
        }
      | null;
    if (!state) return;
    if (state.selectedMapId !== undefined) setCreateMapId(state.selectedMapId);
    if (state.selectedMapTitle !== undefined) setCreateMapTitle(state.selectedMapTitle ?? "");
    if (typeof state.maxPlayers === "number") setCreateMaxPlayers(state.maxPlayers);
    if (state.openCreateModal) setCreateModalOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const mapId = createMapId?.trim();
    if (!mapId) {
      setSelectedMapDetail(null);
      setSelectedMapDetailLoading(false);
      return;
    }

    let alive = true;
    setSelectedMapDetailLoading(true);
    learnerMapsApi
      .getMapById(mapId)
      .then((res) => {
        if (!alive) return;
        if (res.data?.isSuccess && res.data?.data) {
          setSelectedMapDetail(res.data.data);
          if (!createMapTitle.trim()) setCreateMapTitle(res.data.data.title ?? "");
        } else {
          setSelectedMapDetail(null);
        }
      })
      .catch(() => {
        if (alive) setSelectedMapDetail(null);
      })
      .finally(() => {
        if (alive) setSelectedMapDetailLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [createMapId, createMapTitle]);

  const selectedMapPreviewUrl =
    selectedMapDetail?.avatarUrl?.trim() ||
    selectedMapDetail?.gallery?.find((item) => item.kind !== "Video")?.url?.trim() ||
    selectedMapDetail?.gallery?.[0]?.url?.trim() ||
    "";

  const fetchRooms = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await learnerLobbyApi.getRooms();
      const data = res.data?.data as unknown;
      if (Array.isArray(data)) {
        setRooms((data as unknown[]).map((r) => normalizeRoom(r as Record<string, unknown>)));
      } else {
        setRooms([]);
      }
    } catch {
      setRooms([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  // SignalR: đăng ký listener TRƯỚC connect — server gửi LobbyRoomList ngay trong OnConnectedAsync.
  useEffect(() => {
    const unsubList = gameLobbyHub.on("LobbyRoomList", (list: unknown) => {
      const arr = Array.isArray(list) ? list : [];
      setRooms(arr.map((r: Record<string, unknown>) => normalizeRoom(r)));
      setLoading(false);
    });
    const unsubAlready = gameLobbyHub.on("AlreadyInRoom", (data: unknown) => {
      const d = data as { roomId?: string };
      if (d?.roomId) navigate(ROUTES.LEARNER_ROOM_DETAIL(d.roomId));
    });
    gameLobbyHub
      .connect()
      .then(() => {
        void gameLobbyHub.getLobbyRooms();
      })
      .catch(() => setLoading(false));
    return () => {
      unsubList();
      unsubAlready();
    };
  }, [navigate]);

  // Initial fetch (fallback if SignalR not ready)
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreateRoom = async () => {
    if (!createMapId) {
      window.alert("Bạn cần chọn trò chơi trước khi tạo phòng.");
      return;
    }
    setCreating(true);
    try {
      const res = await learnerLobbyApi.createRoom({
        maxPlayers: createMaxPlayers,
        selectedMapId: createMapId,
      });
      const payload = res.data?.data ?? (res.data as unknown as { Data?: unknown })?.Data;
      const roomId =
        payload &&
        typeof payload === "object" &&
        (payload as Record<string, unknown>).roomId != null
          ? String((payload as Record<string, unknown>).roomId)
          : payload &&
              typeof payload === "object" &&
              (payload as Record<string, unknown>).RoomId != null
            ? String((payload as Record<string, unknown>).RoomId)
            : null;
      if (res.data?.isSuccess && roomId) {
        if (createLocked) {
          try {
            await gameLobbyHub.connect();
            await gameLobbyHub.setRoomLocked(roomId, true);
          } catch {
            // best effort; room detail can still toggle lock.
          }
        }
        setCreateModalOpen(false);
        const roomCode =
          (payload as Record<string, unknown>).roomCode ??
          (payload as Record<string, unknown>).RoomCode;
        const maxPlayers =
          (payload as Record<string, unknown>).maxPlayers ??
          (payload as Record<string, unknown>).MaxPlayers;
        navigate(ROUTES.LEARNER_ROOM_DETAIL(roomId), {
          state: {
            roomId,
            roomCode: roomCode != null ? String(roomCode) : "",
            hostId: "", // will be filled by GET
            currentPlayerCount: 1,
            maxPlayers: typeof maxPlayers === "number" ? maxPlayers : 8,
            status: "Waiting",
            isLocked: createLocked,
            selectedMapId: createMapId,
            players: [],
          },
        });
        return;
      }
      window.alert(res.data?.message ?? "Could not create room.");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Could not create room.";
      window.alert(msg ?? "Could not create room.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningId(roomId);
    try {
      const res = await learnerLobbyApi.joinRoom({ roomId });
      const payload = res.data?.data ?? (res.data as unknown as { Data?: unknown })?.Data;
      const joinedRoomId =
        payload &&
        typeof payload === "object" &&
        (payload as Record<string, unknown>).roomId != null
          ? String((payload as Record<string, unknown>).roomId)
          : payload &&
              typeof payload === "object" &&
              (payload as Record<string, unknown>).RoomId != null
            ? String((payload as Record<string, unknown>).RoomId)
            : null;
      if (res.data?.isSuccess && joinedRoomId) {
        const roomCode =
          (payload as Record<string, unknown>).roomCode ??
          (payload as Record<string, unknown>).RoomCode;
        const maxPlayers =
          (payload as Record<string, unknown>).maxPlayers ??
          (payload as Record<string, unknown>).MaxPlayers;
        const currentPlayerCount =
          (payload as Record<string, unknown>).currentPlayerCount ??
          (payload as Record<string, unknown>).CurrentPlayerCount;
        navigate(ROUTES.LEARNER_ROOM_DETAIL(joinedRoomId), {
          state: {
            roomId: joinedRoomId,
            roomCode: roomCode != null ? String(roomCode) : "",
            hostId: "",
            currentPlayerCount: typeof currentPlayerCount === "number" ? currentPlayerCount : 1,
            maxPlayers: typeof maxPlayers === "number" ? maxPlayers : 8,
            status: "Waiting",
            isLocked: false,
            selectedMapId: null,
            players: [],
          },
        });
        return;
      }
      const msg = res.data?.message ?? "Could not join room.";
      window.alert(msg);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Could not join room.";
      window.alert(msg ?? "Could not join room.");
    } finally {
      setJoiningId(null);
    }
  };

  const waitingRooms = rooms.filter(
    (r) => r.status === "Waiting" && !r.isLocked && r.currentPlayerCount < r.maxPlayers,
  );

  return (
    <main className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <section className={styles.container}>
        <header className={styles.header}>
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
                onClick={() =>
                  navigate(ROUTES.LEARNER_MAPS_BROWSE, {
                    state: {
                      lobbyPickMode: true,
                      lobbyPickReturnTo: ROUTES.LEARNER_LEARN,
                      lobbyCreateMaxPlayers: createMaxPlayers,
                    },
                  })
                }
              >
                <Plus size={18} aria-hidden />
                {t("chooseGame")}
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

        <section className={styles.roomsSection}>
          <h2 className={styles.roomsTitle}>{t("openRooms")}</h2>
          {loading ? (
            <p className={styles.roomsLoading}>
              <Loader2 size={20} className={styles.spinner} aria-hidden />
              {t("loadingRooms")}
            </p>
          ) : waitingRooms.length === 0 ? (
            <p className={styles.roomsEmpty}>{t("noOpenRooms")}</p>
          ) : (
            <ul className={styles.roomsList}>
              {waitingRooms.map((room) => (
                <li key={room.roomId} className={styles.roomItem}>
                  <button
                    type="button"
                    className={styles.roomCardBtn}
                    onClick={() => handleJoinRoom(room.roomId)}
                    disabled={joiningId !== null}
                    title={joiningId === room.roomId ? "Joining..." : "Click to join room"}
                  >
                    <div className={styles.roomMain}>
                      <div className={styles.roomTop}>
                        <span className={styles.roomCode}>{room.roomCode}</span>
                        <span className={styles.roomStatus}>{room.status}</span>
                      </div>
                      <div className={styles.roomMetaGrid}>
                        <span className={styles.roomMetaLine}>
                          <strong>Players:</strong> {room.currentPlayerCount}/{room.maxPlayers}
                        </span>
                        <span className={styles.roomMetaLine}>
                          <strong>Host:</strong>{" "}
                          {room.hostName?.trim() || `${room.hostId.slice(0, 8)}...`}
                        </span>
                        <span className={styles.roomMetaLine}>
                          <strong>Game:</strong> {room.selectedGameTitle?.trim() || "Chưa chọn game"}
                        </span>
                      </div>
                    </div>
                    {joiningId === room.roomId ? (
                      <span className={styles.roomJoinState}>
                        <Loader2 size={16} className={styles.spinner} aria-hidden />
                        Joining...
                      </span>
                    ) : (
                      <span className={styles.roomJoinHint}>{t("joinRoomAction")} →</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      {/* Create room modal */}
      {createModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !creating && setCreateModalOpen(false)}>
          <div
            className={`${styles.modal} ${styles.modalMapPick}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t("createRoom")}</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => !creating && setCreateModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.modalLabel}>Game đã chọn</label>
              <div className={styles.selectedMapWrap}>
                <div className={styles.selectedMapBox}>
                  <div className={styles.selectedMapMain}>
                    <div className={styles.selectedMapThumb}>
                      {selectedMapPreviewUrl ? (
                        <img src={selectedMapPreviewUrl} alt={selectedMapDetail?.title || "Selected map"} />
                      ) : (
                        <span>NO IMAGE</span>
                      )}
                    </div>
                    <div className={styles.selectedMapMeta}>
                      <span className={styles.selectedMapText}>
                        {createMapTitle?.trim() ||
                          (createMapId ? `Map ${createMapId.slice(0, 8)}...` : "Chưa chọn")}
                      </span>
                      <span className={styles.selectedMapSubtext}>
                        {selectedMapDetailLoading
                          ? "Đang tải thông tin..."
                          : selectedMapDetail
                            ? `Độ khó: ${selectedMapDetail.difficulty}/5`
                            : "Hover để xem chi tiết game"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.openBrowseBtn}
                    onClick={() =>
                      navigate(ROUTES.LEARNER_MAPS_BROWSE, {
                        state: {
                          lobbyPickMode: true,
                          lobbyPickReturnTo: ROUTES.LEARNER_LEARN,
                          lobbyCreateMaxPlayers: createMaxPlayers,
                        },
                      })
                    }
                    disabled={creating}
                  >
                    Đổi game
                  </button>
                </div>
                {selectedMapDetail ? (
                  <div className={styles.selectedMapHoverCard}>
                    <div className={styles.hoverHero}>
                      {selectedMapPreviewUrl ? (
                        <img src={selectedMapPreviewUrl} alt={selectedMapDetail.title} />
                      ) : (
                        <div className={styles.hoverHeroFallback}>No preview</div>
                      )}
                    </div>
                    <h4 className={styles.hoverTitle}>{selectedMapDetail.title}</h4>
                    <p className={styles.hoverDesc}>
                      {selectedMapDetail.description?.trim() || "Không có mô tả cho trò chơi này."}
                    </p>
                    <div className={styles.hoverMetaGrid}>
                      <span>
                        <strong>Độ khó:</strong> {selectedMapDetail.difficulty}/5
                      </span>
                      <span>
                        <strong>Giá:</strong>{" "}
                        {selectedMapDetail.price > 0 ? `${selectedMapDetail.price.toLocaleString()} xu` : "Miễn phí"}
                      </span>
                    </div>
                    {selectedMapDetail.tagNames?.length ? (
                      <div className={styles.hoverTags}>
                        {selectedMapDetail.tagNames.slice(0, 8).map((tag) => (
                          <span key={tag} className={styles.hoverTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <label className={styles.modalLabel}>{t("maxPlayers")}</label>
              <div className={styles.slots}>
                {MAX_PLAYER_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.slot} ${createMaxPlayers === n ? styles.slotActive : ""}`}
                    onClick={() => setCreateMaxPlayers(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className={styles.maxPlayersHint}>
                {`Chọn ${createMaxPlayers} nghĩa là phòng tối đa ${createMaxPlayers} người; vẫn có thể bắt đầu khi có từ 2 người (ví dụ 3/${createMaxPlayers}).`}
              </p>
              <label className={styles.modalLabel}>Trạng thái phòng</label>
              <div className={styles.lockRow}>
                <button
                  type="button"
                  className={`${styles.lockOption} ${!createLocked ? styles.lockOptionActive : ""}`}
                  onClick={() => setCreateLocked(false)}
                  disabled={creating}
                >
                  Public
                </button>
                <button
                  type="button"
                  className={`${styles.lockOption} ${createLocked ? styles.lockOptionActive : ""}`}
                  onClick={() => setCreateLocked(true)}
                  disabled={creating}
                >
                  Private
                </button>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => !creating && setCreateModalOpen(false)}
                disabled={creating}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className={styles.modalCreateBtn}
                onClick={handleCreateRoom}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 size={18} className={styles.spinner} aria-hidden />
                ) : (
                  t("createRoom")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
