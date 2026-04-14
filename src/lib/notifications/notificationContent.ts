import type { NotificationItem } from "@/types/api/learner/notifications";

type TranslateFn = (key: string) => string;

type LeaderboardRewardPayload = {
  leaderboard?: string;
  period?: string;
  rank?: number;
  rewardXp?: number;
  rewardOrbitCoin?: number;
};

function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

function parsePayloadJson(payloadJson?: string | null): LeaderboardRewardPayload | null {
  if (!payloadJson) return null;
  try {
    const parsed = JSON.parse(payloadJson) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;

    const toNumber = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const n = Number(value);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };

    return {
      leaderboard: typeof parsed.leaderboard === "string" ? parsed.leaderboard : undefined,
      period: typeof parsed.period === "string" ? parsed.period : undefined,
      rank: toNumber(parsed.rank),
      rewardXp: toNumber(parsed.rewardXp),
      rewardOrbitCoin: toNumber(parsed.rewardOrbitCoin),
    };
  } catch {
    return null;
  }
}

function getLeaderboardLabel(leaderboard: string, t: TranslateFn): string {
  switch (leaderboard) {
    case "top-level":
      return t("notification.lbReward.leaderboard.topLevel");
    case "xp-gain":
      return t("notification.lbReward.leaderboard.xpGain");
    case "most-played-created-maps":
      return t("notification.lbReward.leaderboard.mostPlayedCreatedMaps");
    default:
      return t("leaderboard.title");
  }
}

function getPeriodLabel(period: string | undefined, t: TranslateFn): string {
  return period?.toLowerCase() === "monthly"
    ? t("notification.lbReward.period.monthly")
    : t("notification.lbReward.period.weekly");
}

function getRewardSummary(payload: LeaderboardRewardPayload, t: TranslateFn): string {
  const parts: string[] = [];

  const rewardXp = Number(payload.rewardXp ?? 0);
  if (rewardXp > 0) {
    parts.push(
      formatTemplate(t("notification.lbReward.reward.xp"), {
        value: rewardXp.toLocaleString(),
      }),
    );
  }

  const rewardOrbitCoin = Number(payload.rewardOrbitCoin ?? 0);
  if (rewardOrbitCoin > 0) {
    parts.push(
      formatTemplate(t("notification.lbReward.reward.orbitCoin"), {
        value: rewardOrbitCoin.toLocaleString(),
      }),
    );
  }

  if (parts.length === 0) {
    return t("notification.lbReward.reward.none");
  }

  return formatTemplate(t("notification.lbReward.reward.got"), {
    items: parts.join(t("notification.lbReward.reward.separator")),
  });
}

export function getLocalizedNotificationContent(
  item: NotificationItem,
  t: TranslateFn,
): { title: string; body: string } {
  const fallback = { title: item.title, body: item.body };

  if (item.type !== "SystemAnnouncement") return fallback;

  const payload = parsePayloadJson(item.payloadJson);
  if (!payload?.leaderboard || !payload.rank) return fallback;

  const leaderboardLabel = getLeaderboardLabel(payload.leaderboard, t);
  const periodLabel = getPeriodLabel(payload.period, t);
  const rewardLabel = getRewardSummary(payload, t);

  return {
    title: formatTemplate(t("notification.lbReward.title"), {
      leaderboard: leaderboardLabel,
    }),
    body: formatTemplate(t("notification.lbReward.body"), {
      rank: payload.rank,
      leaderboard: leaderboardLabel,
      period: periodLabel,
      reward: rewardLabel,
    }),
  };
}
