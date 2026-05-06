import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "@/services/api/cms/dashboard.api";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { Megaphone, ShieldAlert } from "lucide-react";
import { BarChart, Bar, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [overview, setOverview] = useState<{ totalUsers: number; totalMaps: number; totalPublishedMaps: number } | null>(null);
  const [analytics, setAnalytics] = useState<{
    mapStatusCounts: Array<{ name: string; value: number }>;
    complaintStatusCounts: Array<{ name: string; value: number }>;
    revenueTrend: Array<{ period: string; grossRevenueVnd: number; transactionCount: number }>;
  } | null>(null);

  const loadData = useCallback(async () => {
    const [overviewRes, analyticsRes] = await Promise.all([
      dashboardApi.getOverview(),
      dashboardApi.getAnalytics(),
    ]);
    setOverview(overviewRes);
    setAnalytics(analyticsRes);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const localizeGameStatus = useCallback((status: string) => {
    switch (status) {
      case "Draft":
        return t("draft");
      case "PendingReview":
        return t("pendingReview");
      case "Approved":
        return t("approved");
      case "Rejected":
        return t("rejected");
      case "Published":
        return t("published");
      default:
        return status;
    }
  }, [t]);

  const localizeComplaintStatus = useCallback((status: string) => {
    const key = `complaints.status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  }, [t]);

  const overviewVisuals = useMemo(() => {
    const users = overview?.totalUsers ?? 0;
    const maps = overview?.totalMaps ?? 0;
    const published = overview?.totalPublishedMaps ?? 0;
    const unpublished = Math.max(0, maps - published);

    const mapStatusDist = (analytics?.mapStatusCounts ?? []).map((item, idx) => ({
      ...item,
      color: ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#6366f1"][idx % 5],
    }));

    const complaintStatusDist = (analytics?.complaintStatusCounts ?? []).map((item) => ({
      ...item,
    }));

    const revenueTrend = (analytics?.revenueTrend ?? []).map((item) => ({
      ...item,
    }));

    const complaintTotal = complaintStatusDist.reduce((sum, item) => sum + item.value, 0);
    const mapStatusTotal = mapStatusDist.reduce((sum, item) => sum + item.value, 0);

    return { users, maps, published, unpublished, mapStatusDist, complaintStatusDist, revenueTrend, complaintTotal, mapStatusTotal };
  }, [analytics, overview]);

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

      <div className="flex items-center justify-end">
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
          <Card title={t("cmsDashboard.totalGames")} value={overview?.totalMaps ?? 0} />
          <Card title={t("cmsDashboard.publishedGames")} value={overview?.totalPublishedMaps ?? 0} />
          <Card title={t("cmsDashboard.pendingUnpublishedGames")} value={overviewVisuals.unpublished} />
        </div>

        <div className="rounded border p-4 bg-[var(--surface)]">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-500" />
            {t("cmsDashboard.complaintStatusesRealtime")}
          </h3>
          <div className="space-y-2">
            {overviewVisuals.complaintStatusDist.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded border px-3 py-2">
                <span>{localizeComplaintStatus(item.name)}</span>
                <span className="font-semibold text-amber-600">{item.value}</span>
              </div>
            ))}
            {overviewVisuals.complaintStatusDist.length === 0 ? (
              <div className="text-sm text-[var(--text-2)]">{t("cmsDashboard.noComplaintData")}</div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={t("cmsDashboard.marketplaceRevenueTrendReal")}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={overviewVisuals.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line dataKey="grossRevenueVnd" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 overflow-x-auto rounded border">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-[var(--surface-2)] text-left">
                    <th className="px-3 py-2">{t("cmsDashboard.period")}</th>
                    <th className="px-3 py-2">{t("cmsDashboard.grossRevenue")}</th>
                    <th className="px-3 py-2 text-right">{t("cmsDashboard.transactions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewVisuals.revenueTrend.slice(-6).map((row) => (
                    <tr key={`rev-${row.period}`} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{row.period}</td>
                      <td className="px-3 py-2">{formatVnd(row.grossRevenueVnd)}</td>
                      <td className="px-3 py-2 text-right">{row.transactionCount}</td>
                    </tr>
                  ))}
                  {overviewVisuals.revenueTrend.length === 0 ? (
                    <tr>
                      <td className="px-3 py-2 text-[var(--text-2)]" colSpan={3}>{t("cmsDashboard.noRevenueData")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </ChartCard>
          <ChartCard title={t("cmsDashboard.gameStatusesDistributionReal")}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={overviewVisuals.mapStatusDist} dataKey="value" nameKey="name" outerRadius={95}>
                  {overviewVisuals.mapStatusDist.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 overflow-x-auto rounded border">
              <table className="w-full min-w-[460px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-[var(--surface-2)] text-left">
                    <th className="px-3 py-2">{t("cmsDashboard.status")}</th>
                    <th className="px-3 py-2 text-right">{t("cmsDashboard.games")}</th>
                    <th className="px-3 py-2 text-right">{t("cmsDashboard.ratio")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewVisuals.mapStatusDist.map((row) => {
                    const ratio = overviewVisuals.mapStatusTotal > 0
                      ? (row.value / overviewVisuals.mapStatusTotal) * 100
                      : 0;
                    return (
                      <tr key={`map-${row.name}`} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: row.color }} />
                          {localizeGameStatus(row.name)}
                        </td>
                        <td className="px-3 py-2 text-right">{row.value}</td>
                        <td className="px-3 py-2 text-right">{ratio.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                  {overviewVisuals.mapStatusDist.length === 0 ? (
                    <tr>
                      <td className="px-3 py-2 text-[var(--text-2)]" colSpan={3}>{t("cmsDashboard.noGameStatusData")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </ChartCard>
          <ChartCard title={t("cmsDashboard.complaintStatusesByCountReal")}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overviewVisuals.complaintStatusDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 overflow-x-auto rounded border">
              <table className="w-full min-w-[460px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-[var(--surface-2)] text-left">
                    <th className="px-3 py-2">{t("cmsDashboard.complaintStatus")}</th>
                    <th className="px-3 py-2 text-right">{t("cmsDashboard.count")}</th>
                    <th className="px-3 py-2 text-right">{t("cmsDashboard.share")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewVisuals.complaintStatusDist.map((row) => {
                    const ratio = overviewVisuals.complaintTotal > 0 ? (row.value / overviewVisuals.complaintTotal) * 100 : 0;
                    return (
                      <tr key={`complaint-${row.name}`} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{localizeComplaintStatus(row.name)}</td>
                        <td className="px-3 py-2 text-right">{row.value}</td>
                        <td className="px-3 py-2 text-right">{ratio.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                  {overviewVisuals.complaintStatusDist.length === 0 ? (
                    <tr>
                      <td className="px-3 py-2 text-[var(--text-2)]" colSpan={3}>{t("cmsDashboard.noComplaintStatusData")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </ChartCard>
          <ChartCard title={t("cmsDashboard.transactionsByPeriodReal")}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overviewVisuals.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="transactionCount" fill="#16a34a" />
              </BarChart>
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
