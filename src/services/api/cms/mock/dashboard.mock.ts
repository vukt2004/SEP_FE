/**
 * Mock data for CMS Dashboard
 * Simulates backend data structure for users, levels, maps, and gameplay attempts
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: "student" | "admin";
  createdAt: string;
}

export interface Level {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  type: "platformer" | "topdown";
  createdBy: string;
  isOfficial: boolean;
  playCount: number;
}

export interface Map {
  id: string;
  name: string;
  levelId: string;
  createdBy: string;
  createdAt: string;
}

export interface Attempt {
  id: string;
  userId: string;
  levelId: string;
  success: boolean;
  timestamp: string;
}

// Mock users data
export const mockUsers: User[] = [
  {
    id: "u1",
    username: "john_doe",
    email: "john@example.com",
    role: "student",
    createdAt: "2024-01-15",
  },
  {
    id: "u2",
    username: "jane_smith",
    email: "jane@example.com",
    role: "student",
    createdAt: "2024-01-20",
  },
  {
    id: "u3",
    username: "alice_wonder",
    email: "alice@example.com",
    role: "student",
    createdAt: "2024-02-01",
  },
  {
    id: "u4",
    username: "bob_builder",
    email: "bob@example.com",
    role: "student",
    createdAt: "2024-02-10",
  },
  {
    id: "u5",
    username: "admin_user",
    email: "admin@example.com",
    role: "admin",
    createdAt: "2024-01-01",
  },
  {
    id: "u6",
    username: "charlie_dev",
    email: "charlie@example.com",
    role: "student",
    createdAt: "2024-02-15",
  },
  {
    id: "u7",
    username: "diana_code",
    email: "diana@example.com",
    role: "student",
    createdAt: "2024-02-20",
  },
  {
    id: "u8",
    username: "eve_player",
    email: "eve@example.com",
    role: "student",
    createdAt: "2024-03-01",
  },
];

// Mock levels data
export const mockLevels: Level[] = [
  {
    id: "l1",
    name: "Getting Started",
    difficulty: "easy",
    type: "platformer",
    createdBy: "admin",
    isOfficial: true,
    playCount: 120,
  },
  {
    id: "l2",
    name: "Loop Challenge",
    difficulty: "medium",
    type: "platformer",
    createdBy: "admin",
    isOfficial: true,
    playCount: 95,
  },
  {
    id: "l3",
    name: "Conditional Maze",
    difficulty: "medium",
    type: "topdown",
    createdBy: "admin",
    isOfficial: true,
    playCount: 87,
  },
  {
    id: "l4",
    name: "Variable Hunt",
    difficulty: "hard",
    type: "topdown",
    createdBy: "admin",
    isOfficial: true,
    playCount: 64,
  },
  {
    id: "l5",
    name: "Function Factory",
    difficulty: "hard",
    type: "platformer",
    createdBy: "admin",
    isOfficial: true,
    playCount: 52,
  },
  {
    id: "l6",
    name: "Array Adventure",
    difficulty: "hard",
    type: "platformer",
    createdBy: "admin",
    isOfficial: true,
    playCount: 48,
  },
  {
    id: "l7",
    name: "Recursion Tower",
    difficulty: "hard",
    type: "platformer",
    createdBy: "admin",
    isOfficial: true,
    playCount: 31,
  },
  {
    id: "l8",
    name: "Event Emitter",
    difficulty: "medium",
    type: "topdown",
    createdBy: "admin",
    isOfficial: true,
    playCount: 76,
  },
];

// Mock maps data (including user-created maps)
export const mockMaps: Map[] = [
  { id: "m1", name: "Official Map 1", levelId: "l1", createdBy: "admin", createdAt: "2024-01-01" },
  { id: "m2", name: "Official Map 2", levelId: "l2", createdBy: "admin", createdAt: "2024-01-01" },
  { id: "m3", name: "Official Map 3", levelId: "l3", createdBy: "admin", createdAt: "2024-01-01" },
  { id: "m4", name: "Johns Custom Map", levelId: "l1", createdBy: "u1", createdAt: "2024-02-05" },
  { id: "m5", name: "Janes Platformer", levelId: "l2", createdBy: "u2", createdAt: "2024-02-12" },
  { id: "m6", name: "Alices Maze", levelId: "l3", createdBy: "u3", createdAt: "2024-02-18" },
  { id: "m7", name: "Bobs Challenge", levelId: "l4", createdBy: "u4", createdAt: "2024-02-22" },
  { id: "m8", name: "Charlies Creation", levelId: "l1", createdBy: "u6", createdAt: "2024-03-01" },
  { id: "m9", name: "Dianas Design", levelId: "l5", createdBy: "u7", createdAt: "2024-03-02" },
];

// Mock gameplay attempts data
export const mockAttempts: Attempt[] = [
  // Getting Started (l1) - Easy level, high success rate
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `a1-${i}`,
    userId: `u${(i % 7) + 1}`,
    levelId: "l1",
    success: i < 36, // 90% success
    timestamp: `2024-02-${15 + (i % 14)}`,
  })),

  // Loop Challenge (l2) - Medium, good success rate
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `a2-${i}`,
    userId: `u${(i % 7) + 1}`,
    levelId: "l2",
    success: i < 28, // 80% success
    timestamp: `2024-02-${15 + (i % 14)}`,
  })),

  // Conditional Maze (l3) - Medium
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `a3-${i}`,
    userId: `u${(i % 7) + 1}`,
    levelId: "l3",
    success: i < 24, // 80% success
    timestamp: `2024-02-${15 + (i % 14)}`,
  })),

  // Variable Hunt (l4) - Hard, lower success
  ...Array.from({ length: 28 }, (_, i) => ({
    id: `a4-${i}`,
    userId: `u${(i % 7) + 1}`,
    levelId: "l4",
    success: i < 17, // 60% success
    timestamp: `2024-02-${15 + (i % 14)}`,
  })),

  // Function Factory (l5) - Hard, challenging
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `a5-${i}`,
    userId: `u${(i % 7) + 1}`,
    levelId: "l5",
    success: i < 13, // 52% success
    timestamp: `2024-02-${15 + (i % 14)}`,
  })),

  // Array Adventure (l6) - Hard, very challenging
  ...Array.from({ length: 22 }, (_, i) => ({
    id: `a6-${i}`,
    userId: `u${(i % 7) + 1}`,
    levelId: "l6",
    success: i < 9, // 41% success
    timestamp: `2024-02-${15 + (i % 14)}`,
  })),

  // Recursion Tower (l7) - Hardest
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `a7-${i}`,
    userId: `u${(i % 7) + 1}`,
    levelId: "l7",
    success: i < 5, // 28% success (hardest!)
    timestamp: `2024-02-${15 + (i % 14)}`,
  })),

  // Event Emitter (l8) - Medium
  ...Array.from({ length: 26 }, (_, i) => ({
    id: `a8-${i}`,
    userId: `u${(i % 7) + 1}`,
    levelId: "l8",
    success: i < 20, // 77% success
    timestamp: `2024-02-${15 + (i % 14)}`,
  })),
];
