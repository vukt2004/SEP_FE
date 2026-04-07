import { useCallback, useEffect, useMemo, useState } from "react";
import { learnerXpApi } from "@/services/api/learner/xp.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import type { PaginationResult, XpLeaderboardItem } from "@/types/api/learner/xp";
import { useTranslation } from "@/lib/i18n/translations";
import { useThemeStore } from "@/stores/theme.store";

const PAGE_SIZE = 20;

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const [data, setData] = useState<PaginationResult<XpLeaderboardItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myAvatarPath, setMyAvatarPath] = useState<string | null>(null);

  const leaderboardItems = data?.items ?? [];
  const topThree = useMemo(
    () => [...leaderboardItems].sort((a, b) => a.rank - b.rank).slice(0, 3),
    [leaderboardItems],
  );
  const podiumItems = useMemo(() => {
    const byRank = new Map(topThree.map((x) => [x.rank, x]));
    return [byRank.get(2), byRank.get(1), byRank.get(3)].filter(Boolean) as XpLeaderboardItem[];
  }, [topThree]);

  const load = useCallback(async (pageNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      const [leaderboardRes, profileRes] = await Promise.all([
        learnerXpApi.getLeaderboard(pageNumber, PAGE_SIZE),
        learnerProfileApi.getProfile(),
      ]);

      if (!leaderboardRes.data.isSuccess) {
        setError(leaderboardRes.data.message ?? t("leaderboard.loadFailed"));
        return;
      }
      setData(leaderboardRes.data.data ?? null);
      if (profileRes.isSuccess && profileRes.data?.userId) {
        setMyUserId(profileRes.data.userId);
        setMyAvatarPath(profileRes.data.avatarPath ?? null);
      }
    } catch {
      setError(t("leaderboard.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const getInitials = (displayName: string) => {
    const words = displayName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "NA";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  };

  const getAvatarSrc = (item: XpLeaderboardItem) => {
    if (myUserId && item.userId === myUserId && myAvatarPath) {
      return myAvatarPath;
    }
    return null;
  };

  return (
    <div className="relative">
      {/* Background like /app/browse (ModeSelectPage) */}
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
              ),
              radial-gradient(
                ellipse 100% 50% at 50% 100%,
                color-mix(in srgb, var(--primary) 6%, transparent) 0%,
                transparent 55%
              )
            `,
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-2 md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {t("leaderboard.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("leaderboard.subtitle")}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            type="button"
            onClick={() => void load(page)}
            disabled={loading}
          >
            <span className={loading ? "inline-block animate-spin" : "inline-block"}>↻</span>
            {t("leaderboard.refresh")}
          </button>
        </div>

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            {t("leaderboard.loading")}
          </section>
        ) : leaderboardItems.length ? (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {podiumItems.map((item) => {
                return (
                  <TopUserCard
                    key={item.userId}
                    user={item}
                    isCurrentUser={item.userId === myUserId}
                    avatarSrc={getAvatarSrc(item)}
                    initials={getInitials(item.displayName || t("unknown"))}
                    t={t}
                  />
                );
              })}
            </section>

            <LeaderboardTable
              items={leaderboardItems}
              myUserId={myUserId}
              getAvatarSrc={getAvatarSrc}
              getInitials={getInitials}
              t={t}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t("page")} {data?.currentPage ?? 1} / {Math.max(1, data?.totalPages ?? 1)} -{" "}
                {data?.totalItems ?? 0} {t("leaderboard.learners")}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!data?.hasPrevious || loading}
                >
                  {t("previous")}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data?.hasNext || loading}
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

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function TopUserCard({
  user,
  isCurrentUser,
  avatarSrc,
  initials,
  t,
}: {
  user: XpLeaderboardItem;
  isCurrentUser: boolean;
  avatarSrc: string | null;
  initials: string;
  t: (key: string) => string;
}) {
  const theme = getRankTheme(user.rank);
  const rankText = `${t("leaderboard.top")} ${user.rank}`;
  const xpTarget = estimateNextLevelTotalXp(user.currentLevel);

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg",
        user.rank === 1
          ? "md:scale-105 md:-translate-y-2 shadow-[0_18px_45px_rgba(250,204,21,0.22)]"
          : "",
        theme.cardClass,
      ].join(" ")}
    >
      <div className="absolute right-3 top-3 text-xs font-semibold opacity-80">{rankText}</div>
      <div className="absolute left-3 top-3 text-base">{getRankIcon(user.rank) ?? "🏅"}</div>

      <div className="mt-3 flex flex-col items-center gap-2">
        {user.rank === 1 ? (
          <div className="relative mb-1">
            <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-2xl drop-shadow">
              👑
            </div>
          </div>
        ) : null}
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={user.displayName || "Learner"}
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
            {user.displayName || "Unknown Learner"}
          </h3>
          {isCurrentUser ? (
            <span className="rounded-full bg-gradient-to-r from-indigo-500/15 to-sky-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {t("you")}
            </span>
          ) : null}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">Lv. {user.currentLevel}</div>
        <div className={["text-2xl font-black", theme.xpTextClass].join(" ")}>
          {user.currentXp.toLocaleString()}
        </div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">XP</div>

        <XPProgressBar
          currentXp={user.currentXp}
          requiredXp={xpTarget}
          barClass={theme.progressClass}
        />
      </div>
    </article>
  );
}

function XPProgressBar({
  currentXp,
  requiredXp,
  barClass,
}: {
  currentXp: number;
  requiredXp: number;
  barClass?: string;
}) {
  const targetProgress = Math.min(100, Math.max(0, (currentXp / Math.max(1, requiredXp)) * 100));
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    setAnimatedProgress(0);
    const id = requestAnimationFrame(() => setAnimatedProgress(targetProgress));
    return () => cancelAnimationFrame(id);
  }, [targetProgress]);

  return (
    <div className="mt-2 w-full">
      <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>
          {currentXp.toLocaleString()} / {requiredXp.toLocaleString()} XP
        </span>
        <span>{Math.round(targetProgress)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={[
            "h-full rounded-full transition-[width] duration-[600ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            barClass ?? "bg-gradient-to-r from-yellow-400 to-orange-400",
          ].join(" ")}
          style={{ width: `${animatedProgress}%` }}
        />
      </div>
    </div>
  );
}

function LeaderboardTable({
  items,
  myUserId,
  getAvatarSrc,
  getInitials,
  t,
}: {
  items: XpLeaderboardItem[];
  myUserId: string | null;
  getAvatarSrc: (item: XpLeaderboardItem) => string | null;
  getInitials: (displayName: string) => string;
  t: (key: string) => string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60">
            <th className="px-5 py-4 text-left text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.rank")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.learner")}
            </th>
            <th className="px-5 py-4 text-left text-xs font-bold tracking-wide text-slate-500">
              {t("leaderboard.level")}
            </th>
            <th className="px-5 py-4 text-right text-xs font-bold tracking-wide text-slate-500">
              XP
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const rankIcon = getRankIcon(item.rank);
            const isCurrent = item.userId === myUserId;
            return (
              <tr
                key={`${item.userId}-${item.rank}`}
                className={[
                  "border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40",
                  item.rank === 1
                    ? "bg-yellow-50/60 dark:bg-yellow-900/10 border-l-4 border-l-yellow-400"
                    : "",
                  isCurrent ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "",
                ].join(" ")}
              >
                <td className="px-5 py-4 text-sm font-bold">
                  {rankIcon ? (
                    <span className="text-base">{rankIcon}</span>
                  ) : (
                    <span className="inline-flex min-w-8 justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      #{item.rank}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {getAvatarSrc(item) ? (
                      <img
                        src={getAvatarSrc(item) ?? ""}
                        alt={item.displayName || t("leaderboard.unknownLearner")}
                        className="h-7 w-7 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                      />
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-500 text-[10px] font-bold text-white">
                        {getInitials(item.displayName || "Unknown")}
                      </span>
                    )}
                    <span className="max-w-[220px] truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.displayName || t("leaderboard.unknownLearner")}
                    </span>
                    {isCurrent ? (
                      <span className="rounded-full bg-gradient-to-r from-indigo-500/15 to-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        {t("you")}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Lv. {item.currentLevel}
                </td>
                <td className="px-5 py-4 text-right text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {item.currentXp.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function getRankIcon(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function getRankTheme(rank: number) {
  if (rank === 1) {
    return {
      cardClass:
        "border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 shadow-[0_10px_30px_rgba(250,204,21,0.28)] dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-none",
      ringClass: "ring-yellow-300 dark:ring-yellow-500/60",
      progressClass: "bg-gradient-to-r from-yellow-400 to-orange-400",
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
        "before:pointer-events-none before:absolute before:inset-0 before:content-['']",
        "before:bg-gradient-to-tr before:from-white/65 before:via-white/10 before:to-transparent",
        "before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-0 dark:group-hover:before:opacity-0",
      ].join(" "),
      ringClass: "ring-slate-200 dark:ring-slate-300/70",
      progressClass: "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500",
      xpTextClass: "text-slate-600 dark:text-slate-200",
    };
  }
  return {
    cardClass:
      "border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 shadow-[0_8px_24px_rgba(249,115,22,0.2)] dark:border-slate-700 dark:bg-slate-800/80 dark:shadow-none",
    ringClass: "ring-orange-300 dark:ring-orange-500/60",
    progressClass: "bg-gradient-to-r from-yellow-400 to-orange-400",
    xpTextClass: "text-orange-400 dark:text-orange-300",
  };
}

function estimateNextLevelTotalXp(level: number) {
  const normalizedLevel = Math.max(1, level);
  return normalizedLevel * 100;
}
