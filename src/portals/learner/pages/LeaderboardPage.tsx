import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { learnerXpApi } from "@/services/api/learner/xp.api";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import type {
  LeaderboardPeriodType,
  PaginationResult,
  XpGainLeaderboardItem,
  XpLeaderboardItem,
} from "@/types/api/learner/xp";
import type {
  MostPlayedCreatedMapLeaderboardItem,
  SimplePaginationResult,
} from "@/types/api/learner/maps";
import { useTranslation } from "@/lib/i18n/translations";
import { useThemeStore } from "@/stores/theme.store";

type LeaderboardTab = "top-level" | "xp-gain" | "most-played";

type RewardTier = {
  topN: number;
  rewardXp: number;
  rewardOrbitCoin: number;
};

const PAGE_SIZE = 20;

const LEADERBOARD_REWARD_TIERS: Record<LeaderboardTab, RewardTier[]> = {
  "top-level": [
    { topN: 1, rewardXp: 200, rewardOrbitCoin: 30 },
    { topN: 3, rewardXp: 120, rewardOrbitCoin: 15 },
    { topN: 10, rewardXp: 60, rewardOrbitCoin: 5 },
  ],
  "xp-gain": [
    { topN: 1, rewardXp: 250, rewardOrbitCoin: 40 },
    { topN: 3, rewardXp: 150, rewardOrbitCoin: 20 },
    { topN: 10, rewardXp: 80, rewardOrbitCoin: 8 },
  ],
  "most-played": [
    { topN: 1, rewardXp: 300, rewardOrbitCoin: 50 },
    { topN: 3, rewardXp: 180, rewardOrbitCoin: 25 },
    { topN: 10, rewardXp: 90, rewardOrbitCoin: 10 },
  ],
};

function parseTab(value: string | null): LeaderboardTab {
  if (value === "xp-gain" || value === "most-played") return value;
  return "top-level";
}

function parsePeriod(value: string | null): LeaderboardPeriodType {
  return value === "Month" ? "Month" : "Week";
}

function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<LeaderboardTab>(() => parseTab(searchParams.get("tab")));
  const [period, setPeriod] = useState<LeaderboardPeriodType>(() =>
    parsePeriod(searchParams.get("period")),
  );
  const [page, setPage] = useState<number>(() => parsePage(searchParams.get("page")));

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myAvatarPath, setMyAvatarPath] = useState<string | null>(null);

  const [topLevelData, setTopLevelData] = useState<PaginationResult<XpLeaderboardItem> | null>(
    null,
  );
  const [xpGainData, setXpGainData] = useState<PaginationResult<XpGainLeaderboardItem> | null>(
    null,
  );
  const [mostPlayedData, setMostPlayedData] =
    useState<SimplePaginationResult<MostPlayedCreatedMapLeaderboardItem> | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [infoExpanded, setInfoExpanded] = useState<boolean>(false);
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!infoExpanded) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (infoPopoverRef.current?.contains(target)) return;
      setInfoExpanded(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [infoExpanded]);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    next.set("page", String(page));
    if (tab !== "top-level") {
      next.set("period", period);
    }
    setSearchParams(next, { replace: true });
  }, [tab, period, page, setSearchParams]);

  const loadProfile = useCallback(async () => {
    try {
      const profileRes = await learnerProfileApi.getProfile();
      if (profileRes.isSuccess && profileRes.data?.userId) {
        setMyUserId(profileRes.data.userId);
        setMyAvatarPath(profileRes.data.avatarPath ?? null);
      }
    } catch {
      // Keep leaderboard usable even if profile fetch fails.
    }
  }, []);

  const loadCurrentTab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "top-level") {
        const res = await learnerXpApi.getTopLevelLeaderboard(page, PAGE_SIZE);
        if (!res.data.isSuccess) {
          setError(res.data.message ?? t("leaderboard.loadFailed"));
          setTopLevelData(null);
          return;
        }
        setTopLevelData(res.data.data ?? null);
        return;
      }

      if (tab === "xp-gain") {
        const res = await learnerXpApi.getXpGainLeaderboard(period, page, PAGE_SIZE);
        if (!res.data.isSuccess) {
          setError(res.data.message ?? t("leaderboard.loadFailed"));
          setXpGainData(null);
          return;
        }
        setXpGainData(res.data.data ?? null);
        return;
      }

      const res = await learnerMapsApi.getMostPlayedCreatedLeaderboard(period, page, PAGE_SIZE);
      if (!res.data.isSuccess) {
        setError(res.data.message ?? t("leaderboard.loadFailed"));
        setMostPlayedData(null);
        return;
      }
      setMostPlayedData(res.data.data ?? null);
    } catch {
      setError(t("leaderboard.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [page, period, t, tab]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadCurrentTab();
  }, [loadCurrentTab]);

  const activeList = useMemo(() => {
    if (tab === "top-level") return topLevelData?.items ?? [];
    if (tab === "xp-gain") return xpGainData?.items ?? [];
    return mostPlayedData?.items ?? [];
  }, [tab, topLevelData?.items, xpGainData?.items, mostPlayedData?.items]);

  const pager = useMemo(() => {
    if (tab === "top-level") return topLevelData;
    if (tab === "xp-gain") return xpGainData;
    return mostPlayedData;
  }, [tab, topLevelData, xpGainData, mostPlayedData]);

  const myRankItem = useMemo(() => {
    if (!myUserId) return null;
    if (tab === "top-level")
      return (topLevelData?.items ?? []).find((i) => i.userId === myUserId) ?? null;
    if (tab === "xp-gain")
      return (xpGainData?.items ?? []).find((i) => i.userId === myUserId) ?? null;
    return (mostPlayedData?.items ?? []).find((i) => i.creatorUserId === myUserId) ?? null;
  }, [myUserId, tab, topLevelData?.items, xpGainData?.items, mostPlayedData?.items]);

  const getInitials = (displayName: string) => {
    const words = displayName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "NA";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  };

  const getAvatarSrc = (item: { userId?: string; creatorUserId?: string }) => {
    const itemUserId = item.userId ?? item.creatorUserId;
    if (myUserId && itemUserId === myUserId && myAvatarPath) {
      return myAvatarPath;
    }
    return null;
  };

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

  const headerTitle =
    tab === "top-level"
      ? t("leaderboard.tab.topLevel")
      : tab === "xp-gain"
        ? t("leaderboard.tab.xpGain")
        : t("leaderboard.tab.mostPlayed");

  const rewardTiers = LEADERBOARD_REWARD_TIERS[tab];

  const resetText = useMemo(() => {
    if (tab === "top-level") {
      return t("leaderboard.info.reset.topLevel");
    }
    return period === "Week"
      ? t("leaderboard.info.reset.weekly")
      : t("leaderboard.info.reset.monthly");
  }, [period, t, tab]);

  const podiumItems = useMemo(() => {
    const topThree = [...activeList].sort((a, b) => a.rank - b.rank).slice(0, 3);
    const byRank = new Map(topThree.map((item) => [item.rank, item]));
    return [byRank.get(2), byRank.get(1), byRank.get(3)].filter(Boolean) as Array<
      XpLeaderboardItem | XpGainLeaderboardItem | MostPlayedCreatedMapLeaderboardItem
    >;
  }, [activeList]);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundColor: "var(--bg)",
          backgroundImage: isDark
            ? "none"
            : `
              radial-gradient(
                ellipse 120% 80% at 50% 0%,
                color-mix(in srgb, var(--primary) 22%, transparent) 0%,
                transparent 50%
              ),
              radial-gradient(
                ellipse 85% 65% at 100% 35%,
                color-mix(in srgb, var(--accent) 12%, transparent) 0%,
                transparent 50%
              ),
              radial-gradient(
                ellipse 75% 55% at 0% 60%,
                color-mix(in srgb, var(--primary) 10%, transparent) 0%,
                transparent 50%
              )
            `,
        }}
      />

      <div className="relative z-10 grid w-full gap-6 pl-4 pr-2 md:pr-3 lg:grid-cols-[260px_minmax(0,1fr)] lg:pr-4 lg:items-start xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="relative z-30 w-full lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-3 lg:block lg:space-y-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {t("leaderboard.title")}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("leaderboard.subtitle")}
              </p>
            </div>

            <section className="relative w-full rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div ref={infoPopoverRef} className="absolute right-3 top-3 z-10">
                <button
                  type="button"
                  onClick={() => setInfoExpanded((v) => !v)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  aria-label={t("leaderboard.info.panelTitle")}
                  title={t("leaderboard.info.panelTitle")}
                >
                  i
                </button>

                {infoExpanded ? (
                  <div className="absolute right-0 top-9 z-[100] w-[320px] max-w-[calc(100vw-48px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 lg:left-full lg:right-auto lg:top-0 lg:ml-3">
                    <div className="grid gap-3">
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                        <p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                          {t("leaderboard.info.resetTitle")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {resetText}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          {t("leaderboard.info.resetNote")}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          {t("leaderboard.info.rewardTitle")}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-800 dark:text-slate-100">
                          {rewardTiers.map((tier) => (
                            <li key={`${tab}-${tier.topN}`} className="font-semibold">
                              {t("leaderboard.info.rewardLine")
                                .replace("{topN}", String(tier.topN))
                                .replace("{xp}", tier.rewardXp.toLocaleString())
                                .replace("{coin}", tier.rewardOrbitCoin.toLocaleString())}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          {t("leaderboard.info.rewardNote")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex w-full flex-col gap-3 pr-8">
                <div className="flex flex-col items-stretch gap-2">
                  <TabButton
                    active={tab === "top-level"}
                    onClick={() => {
                      setTab("top-level");
                      setPage(1);
                    }}
                  >
                    {t("leaderboard.tab.topLevel")}
                  </TabButton>
                  <TabButton
                    active={tab === "xp-gain"}
                    onClick={() => {
                      setTab("xp-gain");
                      setPage(1);
                    }}
                  >
                    {t("leaderboard.tab.xpGain")}
                  </TabButton>
                  <TabButton
                    active={tab === "most-played"}
                    onClick={() => {
                      setTab("most-played");
                      setPage(1);
                    }}
                  >
                    {t("leaderboard.tab.mostPlayed")}
                  </TabButton>
                </div>

                {tab !== "top-level" ? (
                  <div className="flex w-full justify-center">
                    <div className="relative inline-flex w-full max-w-[260px] items-center rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                      <motion.div
                        aria-hidden
                        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-indigo-600 shadow-md"
                        animate={{ x: period === "Week" ? 0 : "100%" }}
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                      <PeriodButton
                        active={period === "Week"}
                        onClick={() => {
                          setPeriod("Week");
                          setPage(1);
                        }}
                      >
                        {t("leaderboard.period.week")}
                      </PeriodButton>
                      <PeriodButton
                        active={period === "Month"}
                        onClick={() => {
                          setPeriod("Month");
                          setPage(1);
                        }}
                      >
                        {t("leaderboard.period.month")}
                      </PeriodButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              type="button"
              onClick={() => void loadCurrentTab()}
              disabled={loading}
            >
              <span className={loading ? "inline-block animate-spin" : "inline-block"}>↻</span>
              {t("leaderboard.refresh")}
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-6">
          {myRankItem ? (
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm font-semibold text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
              {t("leaderboard.myRank")}: #{(myRankItem as { rank: number }).rank} • {headerTitle}
            </section>
          ) : null}

          {loading ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {t("leaderboard.loading")}
            </section>
          ) : activeList.length ? (
            <>
              <PodiumGrid
                items={podiumItems}
                tab={tab}
                myUserId={myUserId}
                getAvatarSrc={getAvatarSrc}
                getInitials={getInitials}
                t={t}
              />

              {tab === "top-level" ? (
                <TopLevelTable
                  items={topLevelData?.items ?? []}
                  myUserId={myUserId}
                  getAvatarSrc={getAvatarSrc}
                  getInitials={getInitials}
                  t={t}
                />
              ) : null}

              {tab === "xp-gain" ? (
                <XpGainTable
                  items={xpGainData?.items ?? []}
                  myUserId={myUserId}
                  getAvatarSrc={getAvatarSrc}
                  getInitials={getInitials}
                  t={t}
                  toRelativeTime={toRelativeTime}
                />
              ) : null}

              {tab === "most-played" ? (
                <MostPlayedTable
                  items={mostPlayedData?.items ?? []}
                  myUserId={myUserId}
                  t={t}
                  toRelativeTime={toRelativeTime}
                />
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("page")} {pager?.currentPage ?? 1} / {Math.max(1, pager?.totalPages ?? 1)} -{" "}
                  {pager?.totalItems ?? 0}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pager?.hasPrevious || loading}
                  >
                    {t("previous")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pager?.hasNext || loading}
                  >
                    {t("next")}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {t("leaderboard.empty")}
            </section>
          )}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-indigo-600 text-white shadow"
          : "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PeriodButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative z-10 flex-1 rounded-full px-3 py-2 text-xs font-bold transition",
        active
          ? "text-white"
          : "bg-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PodiumGrid({
  items,
  tab,
  myUserId,
  getAvatarSrc,
  getInitials,
  t,
}: {
  items: Array<XpLeaderboardItem | XpGainLeaderboardItem | MostPlayedCreatedMapLeaderboardItem>;
  tab: LeaderboardTab;
  myUserId: string | null;
  getAvatarSrc: (item: { userId?: string; creatorUserId?: string }) => string | null;
  getInitials: (displayName: string) => string;
  t: (key: string) => string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {items.map((item) => (
        <PodiumCard
          key={item.rank}
          item={item}
          tab={tab}
          isCurrentUser={
            tab === "most-played"
              ? (item as MostPlayedCreatedMapLeaderboardItem).creatorUserId === myUserId
              : (item as XpLeaderboardItem | XpGainLeaderboardItem).userId === myUserId
          }
          avatarSrc={getAvatarSrc(item)}
          initials={getInitials(
            tab === "most-played"
              ? (item as MostPlayedCreatedMapLeaderboardItem).creatorDisplayName
              : (item as XpLeaderboardItem | XpGainLeaderboardItem).displayName,
          )}
          t={t}
        />
      ))}
    </section>
  );
}

function PodiumCard({
  item,
  tab,
  isCurrentUser,
  avatarSrc,
  initials,
  t,
}: {
  item: XpLeaderboardItem | XpGainLeaderboardItem | MostPlayedCreatedMapLeaderboardItem;
  tab: LeaderboardTab;
  isCurrentUser: boolean;
  avatarSrc: string | null;
  initials: string;
  t: (key: string) => string;
}) {
  const theme = getRankTheme(item.rank);
  const name =
    tab === "most-played"
      ? (item as MostPlayedCreatedMapLeaderboardItem).creatorDisplayName
      : (item as XpLeaderboardItem | XpGainLeaderboardItem).displayName;
  const valueLabel =
    tab === "top-level"
      ? `${(item as XpLeaderboardItem).currentXp.toLocaleString()} XP`
      : tab === "xp-gain"
        ? `${(item as XpGainLeaderboardItem).xpGained.toLocaleString()} XP`
        : `${(item as MostPlayedCreatedMapLeaderboardItem).playCount.toLocaleString()} ${t("leaderboard.playCount")}`;
  const detailLabel =
    tab === "top-level"
      ? `Lv. ${(item as XpLeaderboardItem).currentLevel}`
      : tab === "xp-gain"
        ? `Lv. ${(item as XpGainLeaderboardItem).currentLevel}`
        : `${(item as MostPlayedCreatedMapLeaderboardItem).uniquePlayerCount.toLocaleString()} ${t("leaderboard.uniquePlayers")}`;

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        item.rank === 1
          ? "md:scale-105 md:-translate-y-2 shadow-[0_18px_45px_rgba(250,204,21,0.22)]"
          : "",
        theme.cardClass,
      ].join(" ")}
    >
      <div className="absolute right-3 top-3 text-xs font-semibold opacity-80">Top {item.rank}</div>
      <div className="absolute left-3 top-3 text-base">{renderRank(item.rank)}</div>

      <div className="mt-3 flex flex-col items-center gap-2">
        {item.rank === 1 ? (
          <div className="relative mb-1">
            <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-2xl drop-shadow">
              👑
            </div>
          </div>
        ) : null}
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={name || "Learner"}
            className={`h-16 w-16 rounded-full object-cover ring-4 ${theme.ringClass}`}
          />
        ) : (
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-extrabold text-white ring-4 ${theme.ringClass} bg-slate-500`}
          >
            {initials}
          </div>
        )}

        <div className="flex items-center gap-2">
          <h3 className="max-w-[180px] truncate text-center text-base font-extrabold text-slate-900 dark:text-slate-100">
            {name || t("leaderboard.unknownLearner")}
          </h3>
          {isCurrentUser ? (
            <span className="rounded-full bg-gradient-to-r from-indigo-500/15 to-sky-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {t("you")}
            </span>
          ) : null}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">{detailLabel}</div>
        <div className={["text-2xl font-black", theme.xpTextClass].join(" ")}>{valueLabel}</div>
      </div>
    </article>
  );
}

function getRankTheme(rank: number) {
  if (rank === 1) {
    return {
      cardClass:
        "border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 shadow-[0_10px_30px_rgba(250,204,21,0.28)] dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-none",
      ringClass: "ring-yellow-300 dark:ring-yellow-500/60",
      xpTextClass: "text-yellow-500 dark:text-yellow-400",
    };
  }
  if (rank === 2) {
    return {
      cardClass: [
        "border-slate-300",
        "bg-gradient-to-br from-slate-50 via-white to-slate-200",
        "shadow-[0_14px_34px_rgba(148,163,184,0.30)]",
        "dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-none",
      ].join(" "),
      ringClass: "ring-slate-200 dark:ring-slate-300/70",
      xpTextClass: "text-slate-600 dark:text-slate-200",
    };
  }
  return {
    cardClass:
      "border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 shadow-[0_8px_24px_rgba(249,115,22,0.2)] dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-none",
    ringClass: "ring-orange-300 dark:ring-orange-500/60",
    xpTextClass: "text-orange-400 dark:text-orange-300",
  };
}

function TopLevelTable({
  items,
  myUserId,
  getAvatarSrc,
  getInitials,
  t,
}: {
  items: XpLeaderboardItem[];
  myUserId: string | null;
  getAvatarSrc: (item: { userId?: string; creatorUserId?: string }) => string | null;
  getInitials: (displayName: string) => string;
  t: (key: string) => string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60">
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.rank")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.learner")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.level")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              XP
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.userId}-${item.rank}`}
              className={rowClass(item.rank, item.userId === myUserId)}
            >
              <td className="px-5 py-4 text-center text-sm font-bold">{renderRank(item.rank)}</td>
              <td className="px-5 py-4">
                <div className="mx-auto flex w-[260px] max-w-full items-center gap-2">
                  {getAvatarSrc(item) ? (
                    <img
                      src={getAvatarSrc(item) ?? ""}
                      alt={item.displayName || t("leaderboard.unknownLearner")}
                      className="h-7 w-7 flex-none rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-500 text-[10px] font-bold text-white ring-2 ring-slate-200 dark:ring-slate-700">
                      {getInitials(item.displayName || "Unknown")}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-left text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.displayName || t("leaderboard.unknownLearner")}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                Lv. {item.currentLevel}
              </td>
              <td className="px-5 py-4 text-center text-base font-extrabold text-slate-900 dark:text-slate-100">
                {item.currentXp.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function XpGainTable({
  items,
  myUserId,
  getAvatarSrc,
  getInitials,
  t,
  toRelativeTime,
}: {
  items: XpGainLeaderboardItem[];
  myUserId: string | null;
  getAvatarSrc: (item: { userId?: string; creatorUserId?: string }) => string | null;
  getInitials: (displayName: string) => string;
  t: (key: string) => string;
  toRelativeTime: (isoDate?: string | null) => string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60">
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.rank")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.learner")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.xpGained")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.level")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.lastGainAt")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.userId}-${item.rank}`}
              className={rowClass(item.rank, item.userId === myUserId)}
            >
              <td className="px-5 py-4 text-center text-sm font-bold">{renderRank(item.rank)}</td>
              <td className="px-5 py-4">
                <div className="mx-auto flex w-[260px] max-w-full items-center gap-2">
                  {getAvatarSrc(item) ? (
                    <img
                      src={getAvatarSrc(item) ?? ""}
                      alt={item.displayName || t("leaderboard.unknownLearner")}
                      className="h-7 w-7 flex-none rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-500 text-[10px] font-bold text-white ring-2 ring-slate-200 dark:ring-slate-700">
                      {getInitials(item.displayName || "Unknown")}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-left text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.displayName || t("leaderboard.unknownLearner")}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 text-center text-base font-extrabold text-slate-900 dark:text-slate-100">
                {item.xpGained.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                Lv. {item.currentLevel}
              </td>
              <td className="px-5 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {toRelativeTime(item.lastGainAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MostPlayedTable({
  items,
  myUserId,
  t,
  toRelativeTime,
}: {
  items: MostPlayedCreatedMapLeaderboardItem[];
  myUserId: string | null;
  t: (key: string) => string;
  toRelativeTime: (isoDate?: string | null) => string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60">
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.rank")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.mapTitle")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.creator")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.playCount")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.uniquePlayers")}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.lastPlayedAt")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.mapId}-${item.rank}`}
              className={rowClass(item.rank, item.creatorUserId === myUserId)}
            >
              <td className="px-5 py-4 text-center text-sm font-bold">{renderRank(item.rank)}</td>
              <td className="px-5 py-4 text-center text-sm font-bold text-slate-900 dark:text-slate-100">
                {item.mapTitle}
              </td>
              <td className="px-5 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {item.creatorDisplayName}
              </td>
              <td className="px-5 py-4 text-center text-base font-extrabold text-slate-900 dark:text-slate-100">
                {item.playCount.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-center text-base font-bold text-slate-700 dark:text-slate-200">
                {item.uniquePlayerCount.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {toRelativeTime(item.lastPlayedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function renderRank(rank: number) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return (
    <span className="inline-flex min-w-8 justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      #{rank}
    </span>
  );
}

function rowClass(rank: number, highlightUser: boolean) {
  return [
    "border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40",
    rank === 1 ? "bg-yellow-50/60 dark:bg-yellow-900/10 border-l-4 border-l-yellow-400" : "",
    highlightUser ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "",
  ].join(" ");
}
