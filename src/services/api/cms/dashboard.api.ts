/**
 * CMS Dashboard API Service
 *
 * Provides dashboard statistics and metrics for the admin panel.
 * Aggregates data from multiple backend API endpoints.
 */

import { cmsAxios } from "@/services/http/axios.cms";

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
 * API Response structures
 */
interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
  isSuccess: boolean;
  message: string | null;
  errors?: string[] | null;
  errorCode?: string | null;
}

interface ApiResult<T> {
  isSuccess: boolean;
  message: string | null;
  data: T;
  errors?: string[] | null;
  errorCode?: string | null;
}

interface MapListItem {
  id: string;
  title: string | null;
  description: string | null;
  difficulty: number;
  timeLimitMs: number;
  isPublished: boolean;
  mapStatus: number;
  price?: number;
  createdByUserId: string;
  createdAt: string | null;
  tagNames?: string[];
  conceptNames?: string[];
}

interface UserListItem {
  id: string;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  status: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber?: string | null;
  avatarPath?: string | null;
  lastLoginAt?: string | null;
  joiningAt?: string | null;
  roles?: number[];
}

/**
 * Get comprehensive dashboard overview
 *
 * Aggregates data from:
 * - GET /api/cms/users (for total users)
 * - GET /api/cms/challenges/maps (for maps/levels data)
 *
 * Returns calculated metrics based on available API data.
 * Note: Some metrics may be simulated until backend provides full statistics.
 */
export const getOverview = async (): Promise<DashboardOverview> => {
  try {
    // Fetch users data (page 1, small page size - we only need the totalItems count)
    // Note: /api/cms/users returns PaginationResult directly (not wrapped in data)
    const usersResponse = await cmsAxios.get<PaginationResult<UserListItem>>("/api/cms/users", {
      params: {
        pageNumber: 1,
        pageSize: 1,
      },
    });

    // Fetch maps data (get enough to analyze)
    // Note: /api/cms/challenges/maps returns ApiResult<PaginationResult>
    const mapsResponse = await cmsAxios.get<ApiResult<PaginationResult<MapListItem>>>(
      "/api/cms/challenges/maps",
      {
        params: {
          pageNumber: 1,
          pageSize: 100,
        },
      },
    );

    const totalUsers = usersResponse.data.totalItems;
    const totalMaps = mapsResponse.data.data.totalItems;
    const maps = mapsResponse.data.data.items;

    // Calculate total published/official levels
    const totalLevels = maps.filter((m) => m.isPublished).length;

    // Calculate user-created maps
    // MapStatus: 0=Draft, 1=PendingReview, 2=Approved, 3=Rejected, 4=Published
    // User-created = not yet published (status 0-3)
    const userCreatedMaps = maps.filter((m) => m.mapStatus < 4).length;

    // Simulated metrics (these would need actual gameplay/attempt data from backend)
    // Once backend provides attempt/submission endpoints, we can calculate real metrics
    const winRate = 72; // Placeholder - would come from submission success rate
    const mostPlayedLevel = maps.find((m) => m.isPublished)?.title || "Getting Started";

    // Hardest levels simulation (sorted by difficulty level)
    const hardestLevels = maps
      .filter((m) => m.isPublished && m.difficulty >= 2) // Only published, medium+ difficulty
      .sort((a, b) => b.difficulty - a.difficulty)
      .slice(0, 5)
      .map((m, index) => ({
        name: m.title || "Untitled",
        // Simulated fail rates increasing with difficulty
        failRate: Math.floor(30 + index * 8 + Math.random() * 10),
      }));

    return {
      totalUsers,
      totalLevels,
      totalMaps,
      winRate,
      mostPlayedLevel,
      hardestLevels,
      userCreatedMaps,
    };
  } catch (error) {
    console.error("Dashboard API error:", error);
    throw error;
  }
};

/**
 * Dashboard API exports
 */
export const dashboardApi = {
  getOverview,
};
