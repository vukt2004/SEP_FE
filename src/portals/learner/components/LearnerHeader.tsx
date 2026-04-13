// src/portals/learner/components/layout/LearnerHeader.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Wallet,
  Package,
  LogOut,
  Store,
  Gamepad2,
  Map,
  Sun,
  Moon,
  Route,
  MessageCircle,
  MessageSquareWarning,
  Trophy,
  Bell,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { orbitCoinApi } from "@/services/api/learner/orbitcoin.api";
import { learnerNotificationsApi } from "@/services/api/learner/notifications.api";
import { notificationHub } from "@/lib/realtime/notificationHub";
import { useThemeStore } from "@/stores/theme.store";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";
import type { NotificationItem } from "@/types/api/learner/notifications";

const iconBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
};

export default function LearnerHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationTab, setNotificationTab] = useState<"all" | "unread">("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const locale = useLanguageStore((s) => s.locale);
  const toggleLocale = useLanguageStore((s) => s.toggle);
  const t = getT(locale);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await learnerNotificationsApi.getUnreadCount();
      const count = res.data?.data?.unreadCount;
      if (res.data?.isSuccess && typeof count === "number") {
        setUnreadCount(count);
      }
    } catch {
      // Ignore header refresh errors to keep navigation usable.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await learnerNotificationsApi.getNotifications({ pageNumber: 1, pageSize: 8 });
      if (res.data?.isSuccess) {
        setNotifications(res.data.data?.items ?? []);
      }
    } catch {
      // Ignore list errors and keep existing state.
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    orbitCoinApi.getBalance().then((res) => {
      if (res.isSuccess && res.data) setBalance(res.data.balance);
    });
    void loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (notificationOpen) {
      void loadNotifications();
      void loadUnreadCount();
    }
  }, [notificationOpen, loadNotifications, loadUnreadCount]);

  useEffect(() => {
    const toObj = (payload: unknown) =>
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

    const toString = (value: unknown) => (typeof value === "string" ? value : "");

    const toBool = (value: unknown) => (typeof value === "boolean" ? value : false);

    const toActor = (payload: unknown): NotificationItem["actor"] => {
      const obj = toObj(payload);
      if (!obj) return null;
      const id = toString(obj.id ?? obj.Id);
      if (!id) return null;
      return {
        id,
        fullName: toString(obj.fullName ?? obj.FullName),
        avatarUrl: toString(obj.avatarUrl ?? obj.AvatarUrl) || null,
      };
    };

    const toNotificationItem = (payload: unknown): NotificationItem | null => {
      const obj = toObj(payload);
      if (!obj) return null;

      const id = toString(obj.id ?? obj.Id ?? obj.userNotificationId ?? obj.UserNotificationId);
      const notificationId = toString(obj.notificationId ?? obj.NotificationId);
      const createdAt = toString(obj.createdAt ?? obj.CreatedAt);
      if (!id || !notificationId || !createdAt) return null;

      return {
        id,
        notificationId,
        type: toString(obj.type ?? obj.Type),
        title: toString(obj.title ?? obj.Title),
        body: toString(obj.body ?? obj.Body),
        isRead: toBool(obj.isRead ?? obj.IsRead),
        readAt: toString(obj.readAt ?? obj.ReadAt) || null,
        createdAt,
        actionUrl: toString(obj.actionUrl ?? obj.ActionUrl) || null,
        actor: toActor(obj.actor ?? obj.Actor),
      };
    };

    const mergeOnTop = (prev: NotificationItem[], next: NotificationItem) => {
      const withoutCurrent = prev.filter((item) => item.id !== next.id);
      return [next, ...withoutCurrent];
    };

    const offReceive = notificationHub.on("ReceiveNotification", (payload: unknown) => {
      const obj = toObj(payload);
      const incoming = toNotificationItem(obj?.notification ?? obj?.Notification);
      if (incoming) {
        setNotifications((prev) => mergeOnTop(prev, incoming));
      }
      const count = obj?.unreadCount ?? obj?.UnreadCount;
      if (typeof count === "number") setUnreadCount(count);
    });

    const offUnread = notificationHub.on("UnreadCountChanged", (payload: unknown) => {
      const obj = toObj(payload);
      const count = obj?.unreadCount ?? obj?.UnreadCount;
      if (typeof count === "number") {
        setUnreadCount(count);
      }
    });

    const offRead = notificationHub.on("NotificationReadStatusChanged", (payload: unknown) => {
      const obj = toObj(payload);
      const id = toString(obj?.notificationId ?? obj?.NotificationId);
      const readAt = toString(obj?.readAt ?? obj?.ReadAt) || null;
      if (!id) return;
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true, readAt } : item)),
      );
    });

    const offAllRead = notificationHub.on("AllNotificationsRead", () => {
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    });

    void notificationHub.connect().catch(() => {
      // Keep header usable even if realtime connection fails.
    });

    return () => {
      offReceive();
      offUnread();
      offRead();
      offAllRead();
      void notificationHub.disconnect();
    };
  }, []);

  useEffect(() => {
    // Fallback keep-alive: recover from transient SignalR startup failures and refresh unread badge.
    const timer = window.setInterval(() => {
      void notificationHub.connect().catch(() => {
        // Ignore and keep retrying on next tick.
      });
      void loadUnreadCount();
      if (notificationOpen) {
        void loadNotifications();
      }
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadNotifications, loadUnreadCount, notificationOpen]);

  const onLogout = () => {
    localStorage.removeItem("qo_learner_token");
    navigate(ROUTES.LANDING ?? "/", { replace: true });
  };

  const toRelativeTime = (isoDate: string) => {
    const ts = Date.parse(isoDate);
    if (Number.isNaN(ts)) return "";
    const diffMs = Date.now() - ts;
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < minute) return t("notification.justNow");
    if (diffMs < hour) {
      return t("notification.minutesAgo").replace("{count}", String(Math.floor(diffMs / minute)));
    }
    if (diffMs < day) {
      return t("notification.hoursAgo").replace("{count}", String(Math.floor(diffMs / hour)));
    }
    return t("notification.daysAgo").replace("{count}", String(Math.floor(diffMs / day)));
  };

  const resolveActionPath = (actionUrl?: string | null) => {
    if (!actionUrl) return null;
    if (actionUrl.startsWith("http://") || actionUrl.startsWith("https://")) return actionUrl;

    let path = actionUrl;
    if (!path.startsWith("/")) path = `/${path}`;
    if (path.startsWith("/learner/")) {
      path = `/app/${path.slice("/learner/".length)}`;
    }

    const mapDetailMatch = path.match(/^\/app\/maps\/([^/?#]+)/i);
    if (mapDetailMatch?.[1]) {
      return ROUTES.LEARNER_MAP_DETAIL.replace(":id", mapDetailMatch[1]);
    }
    return path;
  };

  const openNotification = async (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await learnerNotificationsApi.markAsRead(item.id);
      } catch {
        void loadUnreadCount();
      }
    }

    const target = resolveActionPath(item.actionUrl);
    setNotificationOpen(false);
    if (!target) return;

    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.location.href = target;
      return;
    }
    navigate(target);
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await learnerNotificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const visibleNotifications = useMemo(
    () =>
      notificationTab === "unread"
        ? notifications.filter((item) => !item.isRead)
        : notifications,
    [notificationTab, notifications],
  );

  const getActorInitial = (item: NotificationItem) => {
    const source = item.actor?.fullName?.trim() || item.title.trim();
    if (!source) return "N";
    const parts = source.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "N";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  };

  const balanceStr = balance != null ? balance.toLocaleString() : "—";

  return (
    <header
      style={{
        position: "sticky",
        height: 72,
        top: 0,
        zIndex: 30,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        overflow: "visible",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          padding: "0 48px",
          height: "100%",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        {/* Left: Logo + Nav tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 56, minWidth: 0 }}>
          <NavLink
            to={ROUTES.LANDING ?? "/"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--text)",
              fontWeight: 800,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ display: "block", lineHeight: 0 }}>
              <img
                src="/brand/logo.png"
                alt="QuackOrbit"
                style={{
                  height: 80,
                  width: "auto",
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </span>
          </NavLink>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_MARKETPLACE ?? "/app/marketplace"} icon={Store}>
                {t("marketplace")}
              </HeaderNavLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_LEARN ?? "/app/browse"} icon={Gamepad2}>
                {t("playgame")}
              </HeaderNavLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_PACKAGES ?? "/app/packages"} icon={Package}>
                {t("package")}
              </HeaderNavLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_MY_PATH ?? "/app/my-path"} icon={Route}>
                {t("myPath")}
              </HeaderNavLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_LEADERBOARD ?? "/app/leaderboard"} icon={Trophy}>
                {t("nav.leaderboard")}
              </HeaderNavLink>
            </motion.div>
          </nav>
        </div>

        {/* Right: theme, language, user menu */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div ref={notificationRef} style={{ position: "relative" }}>
            <motion.button
              type="button"
              onClick={() => setNotificationOpen((o) => !o)}
              aria-label={notificationOpen ? t("notification.close") : t("notification.open")}
              style={{ ...iconBtnStyle, position: "relative" }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell size={20} />
              {unreadCount > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    minWidth: 18,
                    height: 18,
                    padding: "0 4px",
                    borderRadius: 999,
                    background: "var(--danger)",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--bg)",
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </motion.button>

            <AnimatePresence>
              {notificationOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 360,
                    maxWidth: "calc(100vw - 32px)",
                    maxHeight: 460,
                    background: "var(--elevated, var(--surface))",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
                    overflow: "hidden",
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--border)",
                      background:
                        "linear-gradient(180deg, color-mix(in srgb, var(--primary) 9%, var(--surface)) 0%, var(--surface) 100%)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 16 }}>{t("notification.title")}</strong>
                      {unreadCount > 0 ? (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                            color: "var(--primary)",
                          }}
                        >
                          {unreadCount} {t("notification.unread")}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={markingAllRead || unreadCount === 0}
                      onClick={() => void markAllAsRead()}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: unreadCount === 0 ? "var(--muted)" : "var(--primary)",
                        cursor: unreadCount === 0 ? "default" : "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        opacity: markingAllRead ? 0.6 : 1,
                      }}
                    >
                      {t("notification.markAllRead")}
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setNotificationTab("all")}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        background:
                          notificationTab === "all"
                            ? "color-mix(in srgb, var(--primary) 16%, transparent)"
                            : "transparent",
                        color: notificationTab === "all" ? "var(--primary)" : "var(--text)",
                      }}
                    >
                      {t("notification.all")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationTab("unread")}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        background:
                          notificationTab === "unread"
                            ? "color-mix(in srgb, var(--primary) 16%, transparent)"
                            : "transparent",
                        color:
                          notificationTab === "unread" ? "var(--primary)" : "var(--text)",
                      }}
                    >
                      {t("notification.unread")}
                    </button>
                  </div>

                  <div style={{ overflowY: "auto", maxHeight: 388 }}>
                    {loadingNotifications ? (
                      <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
                        {t("loading")}
                      </div>
                    ) : visibleNotifications.length === 0 ? (
                      <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
                        {t("notification.empty")}
                      </div>
                    ) : (
                      visibleNotifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void openNotification(item)}
                          style={{
                            width: "100%",
                            border: "none",
                            background: item.isRead ? "transparent" : "rgba(24, 119, 242, 0.12)",
                            borderBottom: "1px solid var(--border)",
                            textAlign: "left",
                            padding: "10px 14px",
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 999,
                              background:
                                "linear-gradient(135deg, color-mix(in srgb, var(--primary) 62%, #fff) 0%, color-mix(in srgb, var(--primary) 28%, #0ea5e9) 100%)",
                              color: "white",
                              fontSize: 12,
                              fontWeight: 800,
                              display: "grid",
                              placeItems: "center",
                              flex: "0 0 36px",
                            }}
                          >
                            {getActorInitial(item)}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                              }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                                {item.title}
                              </span>
                              {!item.isRead ? (
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 999,
                                    background: "#1877f2",
                                    flex: "0 0 8px",
                                  }}
                                />
                              ) : null}
                            </div>
                            <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                              {item.body}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: item.isRead ? "var(--muted)" : "#1877f2",
                                fontWeight: 700,
                              }}
                            >
                              {toRelativeTime(item.createdAt)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            onClick={() => toggleTheme()}
            aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
            style={iconBtnStyle}
            title={theme === "dark" ? t("themeLight") : t("themeDark")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => toggleLocale()}
            aria-label={t("language")}
            style={{ ...iconBtnStyle, fontSize: 12, fontWeight: 700 }}
            title={locale === "en" ? t("languageVi") : t("languageEn")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            {locale === "en" ? "EN" : "VI"}
          </motion.button>
          <div
            ref={menuRef}
            style={{ position: "relative", display: "inline-block" }}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <motion.button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: 14,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t("user")} • {balanceStr} OC
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    left: "auto",
                    marginTop: 0,
                    paddingTop: 4,
                    minWidth: 180,
                    width: "max-content",
                    background: "var(--elevated, var(--surface))",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                    overflow: "hidden",
                  }}
                >
                  <NavLink
                    to={ROUTES.LEARNER_PROFILE ?? "/app/profile"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <User size={18} />
                    <span>{t("profile")}</span>
                  </NavLink>
                  <NavLink
                    to={ROUTES.LEARNER_WALLET ?? "/app/wallet"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <Wallet size={18} />
                    <span>{t("wallet")}</span>
                  </NavLink>
                  <NavLink
                    to={ROUTES.LEARNER_MAPS ?? "/app/my-maps"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <Map size={18} />
                    <span>{t("myMaps")}</span>
                  </NavLink>
                  <NavLink
                    to={ROUTES.LEARNER_CHAT ?? "/app/chat"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <MessageCircle size={18} />
                    <span>{locale === "vi" ? "Cuộc trò chuyện" : "Conversations"}</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    style={{
                      ...menuBtnStyle,
                      color: "var(--danger)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <LogOut size={18} />
                    <span>{t("logout")}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function menuLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    color: isActive ? "var(--primary)" : "var(--text)",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  };
}

const menuBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  width: "100%",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
  textAlign: "left",
};

function HeaderNavLink({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 10,
        textDecoration: "none",
        color: isActive ? "var(--primary)" : "var(--muted)",
        fontWeight: 700,
        fontSize: 14,
        background: isActive
          ? "color-mix(in srgb, var(--primary) 12%, transparent)"
          : "transparent",
      })}
    >
      <Icon size={18} aria-hidden />
      <span>{children}</span>
    </NavLink>
  );
}
