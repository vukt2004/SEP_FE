/**
 * CMS Dashboard API Service
 *
 * Provides dashboard statistics and metrics for the admin panel.
 * Currently uses mock data with simulated async behavior.
 * Can be easily replaced with real API calls later.
 */

import { mockUsers, mockLevels, mockMaps, mockAttempts } from "./mock/dashboard.mock";

/**
 * Dashboard overview data structure
 */
export interface DashboardOverview {
  totalUsers: number;
  totalLevels: number;
  totalMaps: number;
  winRate: number;
  mostPlayedLevel: string;
  hardestLevels: Array<{
    name: string;
    failRate: number;
  }>;
  userCreatedMaps: number;
}

/**
 * Simulates API delay (300-500ms)
 */
const simulateApiDelay = (): Promise<void> => {
  const delay = Math.random() * 200 + 300;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Calculate fail rate for a specific level
 */
const calculateFailRate = (levelId: string): number => {
  const levelAttempts = mockAttempts.filter((a) => a.levelId === levelId);
  if (levelAttempts.length === 0) return 0;

  const failures = levelAttempts.filter((a) => !a.success).length;
  return (failures / levelAttempts.length) * 100;
};

/**
 * Get comprehensive dashboard overview
 *
 * Returns:
 * - Total users (excluding admins)
 * - Total official levels
 * - Total maps (official + user-created)
 * - Overall win rate across all attempts
 * - Most played level name
 * - Top 5 hardest levels by fail rate
 * - Count of user-created maps
 */
export const getOverview = async (): Promise<DashboardOverview> => {
  await simulateApiDelay();

  // Calculate total users (exclude admin role)
  const totalUsers = mockUsers.filter((u) => u.role === "student").length;

  // Calculate total levels
  const totalLevels = mockLevels.length;

  // Calculate total maps
  const totalMaps = mockMaps.length;

  // Calculate overall win rate
  const totalAttempts = mockAttempts.length;
  const successfulAttempts = mockAttempts.filter((a) => a.success).length;
  const winRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0;

  // Find most played level
  const mostPlayedLevelData = mockLevels.reduce((prev, current) =>
    prev.playCount > current.playCount ? prev : current,
  );
  const mostPlayedLevel = mostPlayedLevelData.name;

  // Calculate top 5 hardest levels by fail rate
  const levelsWithFailRate = mockLevels.map((level) => ({
    name: level.name,
    failRate: calculateFailRate(level.id),
  }));

  const hardestLevels = levelsWithFailRate
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 5)
    .map((level) => ({
      name: level.name,
      failRate: Math.round(level.failRate),
    }));

  // Count user-created maps (createdBy !== 'admin')
  const userCreatedMaps = mockMaps.filter((m) => m.createdBy !== "admin").length;

  return {
    totalUsers,
    totalLevels,
    totalMaps,
    winRate,
    mostPlayedLevel,
    hardestLevels,
    userCreatedMaps,
  };
};

/**
 * Dashboard API exports
 */
export const dashboardApi = {
  getOverview,
};
