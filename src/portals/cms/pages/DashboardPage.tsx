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
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Mock data for charts
const userGrowthData = [
  { month: "Jan", users: 1200 },
  { month: "Feb", users: 1900 },
  { month: "Mar", users: 2400 },
  { month: "Apr", users: 3100 },
  { month: "May", users: 4200 },
  { month: "Jun", users: 5300 },
];

const levelCompletionData = [
  { level: "Level 1", completions: 450, failures: 120 },
  { level: "Level 2", completions: 380, failures: 140 },
  { level: "Level 3", completions: 320, failures: 180 },
  { level: "Level 4", completions: 280, failures: 220 },
  { level: "Level 5", completions: 210, failures: 290 },
];

const userActivityData = [
  { name: "Active Users", value: 2400, color: "#3b82f6" },
  { name: "Inactive Users", value: 1800, color: "#94a3b8" },
  { name: "New Users", value: 800, color: "#10b981" },
];

const gameSessionsData = [
  { day: "Mon", sessions: 320 },
  { day: "Tue", sessions: 450 },
  { day: "Wed", sessions: 380 },
  { day: "Thu", sessions: 520 },
  { day: "Fri", sessions: 490 },
  { day: "Sat", sessions: 620 },
  { day: "Sun", sessions: 580 },
];

// Mock data for dashboard overview
const mockDashboardData: DashboardOverview = {
  totalUsers: 5300,
  totalLevels: 24,
  totalMaps: 156,
  winRate: 68.5,
  mostPlayedLevel: "Level 7: Speed Challenge",
  userCreatedMaps: 89,
  hardestLevels: [
    { name: "Level 18: Ultimate Maze", failRate: 78.5 },
    { name: "Level 15: Time Pressure", failRate: 72.3 },
    { name: "Level 12: Logic Master", failRate: 68.9 },
    { name: "Level 20: Expert Challenge", failRate: 65.2 },
    { name: "Level 9: Complex Paths", failRate: 61.7 },
  ],
};

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
        // Use mock data when API fails
        console.warn("API not available, using mock data:", err);
        setData(mockDashboardData);
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
      <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-6 mb-6">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User Growth Chart */}
        <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp size={28} />
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">User Growth</h2>
              <p className="text-sm text-[var(--text-2)]">Monthly user registration trend</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-2)" />
              <YAxis stroke="var(--text-2)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Level Completion Chart */}
        <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 size={28} />
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">Level Performance</h2>
              <p className="text-sm text-[var(--text-2)]">Completions vs failures per level</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={levelCompletionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="level" stroke="var(--text-2)" />
              <YAxis stroke="var(--text-2)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="completions" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="failures" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity Distribution Chart */}
        <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <PieChart size={28} />
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">User Activity</h2>
              <p className="text-sm text-[var(--text-2)]">Distribution of user engagement</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={userActivityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {userActivityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Game Sessions Chart */}
        <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity size={28} />
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">Weekly Sessions</h2>
              <p className="text-sm text-[var(--text-2)]">Game sessions throughout the week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={gameSessionsData}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-2)" />
              <YAxis stroke="var(--text-2)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSessions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
