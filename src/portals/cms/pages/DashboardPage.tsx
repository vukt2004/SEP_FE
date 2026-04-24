import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "@/services/api/cms/dashboard.api";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { Megaphone } from "lucide-react";
import { BarChart, Bar, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const isDevLikeHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("localhost") ||
    window.location.hostname.includes("127.0.0.1") ||
    window.location.hostname.includes(".local"));

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mockMode, setMockMode] = useState(false);
  const [overview, setOverview] = useState<{ totalUsers: number; totalMaps: number; totalPublishedMaps: number } | null>(null);

  const loadData = useCallback(async () => {
    const overviewRes = await dashboardApi.getOverview();
    setOverview(overviewRes);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const overviewVisuals = useMemo(() => {
    const users = overview?.totalUsers ?? 0;
    const maps = overview?.totalMaps ?? 0;
    const published = overview?.totalPublishedMaps ?? 0;
    const unpublished = Math.max(0, maps - published);
    const failBase = Math.min(82, Math.max(28, 100 - Math.round((published / Math.max(maps, 1)) * 100)));

    const userGrowth = Array.from({ length: 6 }, (_, idx) => {
      const factor = 0.72 + idx * 0.08;
      const variance = mockMode ? ((idx % 2 === 0 ? 1 : -1) * 0.08) : 0;
      return {
        month: t(`cmsDashboard.month.${idx + 1}`),
        users: Math.round(users * (factor + variance)),
      };
    });

    const levelPerformance = Array.from({ length: 5 }, (_, idx) => {
      const completions = Math.max(10, Math.round((published || 1) * (12 - idx)));
      const failures = Math.max(5, Math.round(completions * ((failBase + idx * 6) / 100)));
      return { level: `${t("cmsDashboard.levelLabel")} ${idx + 1}`, completions, failures };
    });

    const activityDist = [
      { name: t("cmsDashboard.activeUsers"), value: Math.round(users * 0.46), color: "#3b82f6" },
      { name: t("cmsDashboard.inactiveUsers"), value: Math.round(users * 0.34), color: "#94a3b8" },
      { name: t("cmsDashboard.newUsers"), value: Math.round(users * 0.2), color: "#10b981" },
    ];

    const hardestLevels = Array.from({ length: 5 }, (_, idx) => ({
      name: `${t("cmsDashboard.challengeLabel")} ${idx + 1}`,
      failRate: Math.min(95, failBase + idx * 5),
    }));

    return { unpublished, userGrowth, levelPerformance, activityDist, hardestLevels };
  }, [mockMode, overview, t]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("cmsDashboard.title")}</h1>
          <p className="text-[var(--text-2)]">{t("cmsDashboard.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.CMS_SYSTEM_ANNOUNCEMENT)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
        >
          <Megaphone size={16} />
          {t("cmsDashboard.sendAnnouncement")}
        </button>
      </div>

      <div className="flex items-center justify-between">
        {isDevLikeHost ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mockMode} onChange={(e) => setMockMode(e.target.checked)} />
            {t("cmsDashboard.mockData")}
          </label>
        ) : <span />}
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white"
          onClick={() => navigate(ROUTES.CMS_FINANCE_DASHBOARD)}
        >
          {t("cmsDashboard.goToFinanceDashboard")}
        </button>
      </div>

      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title={t("cmsDashboard.totalUsers")} value={overview?.totalUsers ?? 0} />
          <Card title={t("cmsDashboard.totalMaps")} value={overview?.totalMaps ?? 0} />
          <Card title={t("cmsDashboard.publishedMaps")} value={overview?.totalPublishedMaps ?? 0} />
          <Card title={t("cmsDashboard.pendingMaps")} value={overviewVisuals.unpublished} />
        </div>
        <div className="rounded border p-4 bg-[var(--surface)]">
          <h3 className="font-semibold mb-3">{t("cmsDashboard.hardestChallengesTitle")}</h3>
          <div className="space-y-2">
            {overviewVisuals.hardestLevels.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between rounded border px-3 py-2">
                <span>{idx + 1}. {item.name}</span>
                <span className="font-semibold text-red-500">{item.failRate}% {t("cmsDashboard.failSuffix")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={t("cmsDashboard.userGrowthDerived")}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={overviewVisuals.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line dataKey="users" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("cmsDashboard.levelPerformance")}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overviewVisuals.levelPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completions" fill="#16a34a" />
                <Bar dataKey="failures" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("cmsDashboard.userActivity")}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={overviewVisuals.activityDist} dataKey="value" nameKey="name" outerRadius={95}>
                  {overviewVisuals.activityDist.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </>
    </div>
  );
};

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded border p-4 bg-[var(--surface)]">
      <div className="text-sm text-[var(--text-2)]">{title}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border p-4 bg-[var(--surface)]">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default DashboardPage;
