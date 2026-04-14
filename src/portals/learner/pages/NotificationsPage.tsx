import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bell, Megaphone, RefreshCw, ShieldAlert, ShoppingCart, Sparkles } from "lucide-react";
import { learnerNotificationsApi } from "@/services/api/learner/notifications.api";
import { notificationHub } from "@/lib/realtime/notificationHub";
import { getLocalizedNotificationContent } from "@/lib/notifications/notificationContent";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import type { NotificationItem } from "@/types/api/learner/notifications";

type NotificationFilter = "all" | "unread";

const PAGE_SIZE = 20;

function parseFilter(input: string | null): NotificationFilter {
  return input === "unread" ? "unread" : "all";
}

function parsePage(input: string | null): number {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilter] = useState<NotificationFilter>(() =>
    parseFilter(searchParams.get("filter")),
  );
  const [page, setPage] = useState<number>(() => parsePage(searchParams.get("page")));

  const [allPageItems, setAllPageItems] = useState<NotificationItem[]>([]);
  const [unreadItems, setUnreadItems] = useState<NotificationItem[]>([]);

  const [allTotalPages, setAllTotalPages] = useState(1);
  const [allTotalItems, setAllTotalItems] = useState(0);
  const [allHasPrevious, setAllHasPrevious] = useState(false);
  const [allHasNext, setAllHasNext] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qFilter = parseFilter(searchParams.get("filter"));
    const qPage = parsePage(searchParams.get("page"));
    if (qFilter !== filter) setFilter(qFilter);
    if (qPage !== page) setPage(qPage);
  }, [filter, page, searchParams]);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("filter", filter);
    next.set("page", String(page));
    setSearchParams(next, { replace: true });
  }, [filter, page, setSearchParams]);

  const loadUnreadCount = useCallback(async () => {
    const res = await learnerNotificationsApi.getUnreadCount();
    if (res.data?.isSuccess) {
      setUnreadCount(res.data.data?.unreadCount ?? 0);
    }
  }, []);

  const loadAllPage = useCallback(
    async (targetPage: number) => {
      const res = await learnerNotificationsApi.getNotifications({
        pageNumber: targetPage,
        pageSize: PAGE_SIZE,
      });
      if (!res.data?.isSuccess) {
        throw new Error(res.data?.message ?? t("notification.loadFailed"));
      }

      const payload = res.data.data;
      setAllPageItems(payload?.items ?? []);
      setAllTotalPages(Math.max(1, payload?.totalPages ?? 1));
      setAllTotalItems(payload?.totalItems ?? 0);
      setAllHasPrevious(Boolean(payload?.hasPrevious));
      setAllHasNext(Boolean(payload?.hasNext));
    },
    [t],
  );

  const loadUnreadList = useCallback(async () => {
    const res = await learnerNotificationsApi.getUnreadNotifications();
    if (!res.data?.isSuccess) {
      throw new Error(res.data?.message ?? t("notification.loadFailed"));
    }
    setUnreadItems(res.data.data ?? []);
  }, [t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadUnreadCount(), loadAllPage(page), loadUnreadList()]);
    } catch {
      setError(t("notification.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [loadAllPage, loadUnreadCount, loadUnreadList, page, t]);

  useEffect(() => {
    void load();
  }, [load]);

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
        payloadJson: toString(obj.payloadJson ?? obj.PayloadJson) || null,
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
        setAllPageItems((prev) => mergeOnTop(prev, incoming).slice(0, PAGE_SIZE));
        if (!incoming.isRead) {
          setUnreadItems((prev) => mergeOnTop(prev, incoming));
        }
      }
      const count = obj?.unreadCount ?? obj?.UnreadCount;
      if (typeof count === "number") setUnreadCount(count);
    });

    const offUnread = notificationHub.on("UnreadCountChanged", (payload: unknown) => {
      const obj = toObj(payload);
      const count = obj?.unreadCount ?? obj?.UnreadCount;
      if (typeof count === "number") setUnreadCount(count);
    });

    const offRead = notificationHub.on("NotificationReadStatusChanged", (payload: unknown) => {
      const obj = toObj(payload);
      const id = toString(obj?.notificationId ?? obj?.NotificationId);
      const readAt = toString(obj?.readAt ?? obj?.ReadAt) || null;
      if (!id) return;
      setAllPageItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true, readAt } : item)),
      );
      setUnreadItems((prev) => prev.filter((item) => item.id !== id));
    });

    const offAllRead = notificationHub.on("AllNotificationsRead", () => {
      setAllPageItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadItems([]);
      setUnreadCount(0);
    });

    const offReconnected = notificationHub.on("Reconnected", () => {
      void (async () => {
        try {
          const [countRes, allRes, unreadRes] = await Promise.all([
            learnerNotificationsApi.getUnreadCount(),
            learnerNotificationsApi.getNotifications({ pageNumber: 1, pageSize: PAGE_SIZE }),
            learnerNotificationsApi.getUnreadNotifications(),
          ]);

          if (countRes.data?.isSuccess) {
            setUnreadCount(countRes.data.data?.unreadCount ?? 0);
          }

          if (allRes.data?.isSuccess) {
            const payload = allRes.data.data;
            setAllPageItems(payload?.items ?? []);
            setAllTotalPages(Math.max(1, payload?.totalPages ?? 1));
            setAllTotalItems(payload?.totalItems ?? 0);
            setAllHasPrevious(Boolean(payload?.hasPrevious));
            setAllHasNext(Boolean(payload?.hasNext));
            setPage(1);
          }

          if (unreadRes.data?.isSuccess) {
            setUnreadItems(unreadRes.data.data ?? []);
          }
        } catch {
          // Ignore reconnect refresh errors and keep current state.
        }
      })();
    });

    void notificationHub.connect().catch(() => {
      // Graceful fallback in case realtime connect fails.
    });

    return () => {
      offReceive();
      offUnread();
      offRead();
      offAllRead();
      offReconnected();
      void notificationHub.disconnect();
    };
  }, []);

  const toRelativeTime = (isoDate?: string | null) => {
    if (!isoDate) return "-";
    const ts = Date.parse(isoDate);
    if (Number.isNaN(ts)) return "-";
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

  const displayedItems = filter === "unread" ? unreadItems : allPageItems;

  const markAsRead = async (item: NotificationItem) => {
    if (item.isRead) return;

    setAllPageItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    setUnreadItems((prev) => prev.filter((n) => n.id !== item.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await learnerNotificationsApi.markAsRead(item.id);
    } catch {
      void loadUnreadCount();
    }
  };

  const openNotification = async (item: NotificationItem) => {
    await markAsRead(item);

    const target = resolveActionPath(item.actionUrl);
    if (!target) return;
    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.location.href = target;
      return;
    }
    navigate(target);
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await learnerNotificationsApi.markAllAsRead();
      setAllPageItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadItems([]);
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationMeta = (item: NotificationItem) => {
    switch (item.type) {
      case "MapComplainedAbout":
        return {
          icon: <ShieldAlert size={16} />,
          iconClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
        };
      case "MapPurchased":
        return {
          icon: <ShoppingCart size={16} />,
          iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        };
      case "MapUpdateForBuyers":
        return {
          icon: <RefreshCw size={16} />,
          iconClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
        };
      case "SystemAnnouncement":
        return {
          icon: <Megaphone size={16} />,
          iconClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        };
      default:
        return {
          icon: <Sparkles size={16} />,
          iconClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
        };
    }
  };

  const subtitle = useMemo(() => {
    if (filter === "unread") {
      return `${unreadItems.length} ${t("notification.unread").toLowerCase()}`;
    }
    return `${allTotalItems} ${t("notification.title").toLowerCase()}`;
  }, [allTotalItems, filter, t, unreadItems.length]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-2 md:px-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {t("notification.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void load();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:-translate-y-0.5 dark:border-slate-700 dark:text-slate-200"
            >
              <RefreshCw size={14} />
              {t("leaderboard.refresh")}
            </button>
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={markingAll || unreadCount === 0}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("notification.markAllRead")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-bold transition",
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200",
            ].join(" ")}
          >
            {t("notification.all")}
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter("unread");
              setPage(1);
            }}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-bold transition",
              filter === "unread"
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200",
            ].join(" ")}
          >
            {t("notification.unread")}
          </button>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          {t("loading")}
        </section>
      ) : displayedItems.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          {t("notification.empty")}
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {displayedItems.map((item) => {
            const meta = getNotificationMeta(item);
            const content = getLocalizedNotificationContent(item, t);
            return (
              <article
                key={item.id}
                className={[
                  "flex items-start gap-3 border-b border-slate-100 p-4 transition dark:border-slate-800",
                  item.isRead
                    ? "bg-white dark:bg-slate-900"
                    : "bg-indigo-50/40 dark:bg-indigo-950/20",
                ].join(" ")}
              >
                <span
                  className={[
                    "mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full",
                    meta.iconClass,
                  ].join(" ")}
                >
                  {meta.icon}
                </span>

                <button
                  type="button"
                  onClick={() => void openNotification(item)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {content.title}
                    </h3>
                    {!item.isRead ? (
                      <span
                        className="inline-flex h-2 w-2 rounded-full bg-indigo-500"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{content.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Bell size={12} />
                    <span>{toRelativeTime(item.createdAt)}</span>
                    {item.actor?.fullName ? <span>• {item.actor.fullName}</span> : null}
                  </div>
                </button>

                {!item.isRead ? (
                  <button
                    type="button"
                    onClick={() => void markAsRead(item)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    {t("notification.read")}
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      )}

      {filter === "all" ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("page")} {page} / {allTotalPages} - {allTotalItems}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!allHasPrevious || loading}
            >
              {t("previous")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              onClick={() => setPage((p) => p + 1)}
              disabled={!allHasNext || loading}
            >
              {t("next")}
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
