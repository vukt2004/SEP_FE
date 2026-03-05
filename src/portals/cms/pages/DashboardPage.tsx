/**
 * CMS Dashboard Page
 *
 * Main dashboard for admin users showing:
 * - Total users, levels, maps
 * - Win rate and most played level
 * - Top 5 hardest levels
 * - User-created maps count
 */

import React, { useEffect, useState } from "react";
import { dashboardApi } from "../../../services/api/cms/dashboard.api";
import type { DashboardOverview } from "../../../services/api/cms/dashboard.api";
import { StatCard } from "../components/StatCard";
import {
  AlertTriangle,
  Users,
  Gamepad2,
  Map,
  CheckCircle,
  Flame,
  Star,
  Trophy,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const overview = await dashboardApi.getOverview();
        setData(overview);
      } catch (err) {
        setError("Failed to load dashboard data");
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin mb-4"></div>
          <p className="text-[var(--text-2)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle size={20} color="var(--danger)" />
            <p className="text-[var(--danger)] text-lg">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-[var(--primary)] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Dashboard Overview</h1>
        <p className="text-[var(--text-2)]">Platform statistics and metrics at a glance</p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          label="Total Users"
          value={data.totalUsers}
          icon={<Users size={28} />}
          variant="primary"
        />
        <StatCard
          label="Total Levels"
          value={data.totalLevels}
          icon={<Gamepad2 size={28} />}
          variant="info"
        />
        <StatCard
          label="Total Maps"
          value={data.totalMaps}
          icon={<Map size={28} />}
          variant="accent"
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          label="Overall Win Rate"
          value={`${data.winRate}%`}
          icon={<CheckCircle size={28} />}
          variant="success"
        />
        <StatCard
          label="Most Played Level"
          value={data.mostPlayedLevel}
          icon={<Flame size={28} />}
          variant="accent"
        />
        <StatCard
          label="User Created Maps"
          value={data.userCreatedMaps}
          icon={<Star size={28} />}
          variant="info"
        />
      </div>

      {/* Hardest Levels Card */}
      <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy size={28} />
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">Top 5 Hardest Levels</h2>
            <p className="text-sm text-[var(--text-2)]">Ranked by failure rate</p>
          </div>
        </div>

        <div className="space-y-3">
          {data.hardestLevels.map((level, index) => (
            <div
              key={level.name}
              className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] hover:border-[var(--danger)] transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg)] text-[var(--text-2)] font-bold text-sm">
                  {index + 1}
                </span>
                <span className="text-[var(--text)] font-medium">{level.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--danger)] font-bold">{level.failRate}%</span>
                <span className="text-[var(--text-2)] text-sm">fail rate</span>
              </div>
            </div>
          ))}
        </div>

        {data.hardestLevels.length === 0 && (
          <p className="text-center text-[var(--muted)] py-8">No level data available</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
