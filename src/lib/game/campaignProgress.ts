import type { MapLevelItem } from "@/types/api/learner/maps";

const STORAGE_KEY = "qo_campaign_level_progress_v1";

type LevelProgressRecord = {
  startedAt?: number;
  completedAt?: number;
};

type CampaignProgressStore = Record<string, Record<string, LevelProgressRecord>>;

export type CampaignLevelState = {
  levelId: string;
  isLocked: boolean;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStore(): CampaignProgressStore {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as CampaignProgressStore;
  } catch {
    return {};
  }
}

function writeStore(store: CampaignProgressStore): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore write errors (private mode/quota).
  }
}

function orderedLevels(levels: MapLevelItem[]): MapLevelItem[] {
  return [...levels].sort((a, b) => a.levelOrder - b.levelOrder);
}

export function getCampaignMapProgress(mapId: string): Record<string, LevelProgressRecord> {
  if (!mapId) return {};
  return readStore()[mapId] ?? {};
}

export function markCampaignLevelStarted(mapId: string, levelId: string): void {
  if (!mapId || !levelId) return;
  const store = readStore();
  const mapProgress = store[mapId] ?? {};
  const existing = mapProgress[levelId] ?? {};
  mapProgress[levelId] = {
    ...existing,
    startedAt: existing.startedAt ?? Date.now(),
  };
  store[mapId] = mapProgress;
  writeStore(store);
}

export function markCampaignLevelCompleted(mapId: string, levelId: string): void {
  if (!mapId || !levelId) return;
  const store = readStore();
  const mapProgress = store[mapId] ?? {};
  const existing = mapProgress[levelId] ?? {};
  mapProgress[levelId] = {
    ...existing,
    startedAt: existing.startedAt ?? Date.now(),
    completedAt: Date.now(),
  };
  store[mapId] = mapProgress;
  writeStore(store);
}

export function getCampaignCurrentLevelId(mapId: string, levels: MapLevelItem[]): string | null {
  const ordered = orderedLevels(levels);
  if (!ordered.length) return null;

  const progress = getCampaignMapProgress(mapId);
  const completedSet = new Set(
    Object.entries(progress)
      .filter(([, value]) => value?.completedAt != null)
      .map(([levelId]) => levelId),
  );

  const startedIncomplete = ordered
    .filter((level) => {
      const row = progress[level.id];
      return row?.startedAt != null && row?.completedAt == null;
    })
    .sort((a, b) => {
      const at = progress[a.id]?.startedAt ?? 0;
      const bt = progress[b.id]?.startedAt ?? 0;
      return bt - at;
    });

  if (startedIncomplete[0]) return startedIncomplete[0].id;

  for (let i = 0; i < ordered.length; i += 1) {
    const level = ordered[i];
    if (i === 0) {
      if (!completedSet.has(level.id)) return level.id;
      continue;
    }

    const prev = ordered[i - 1];
    const unlocked = completedSet.has(prev.id);
    if (unlocked && !completedSet.has(level.id)) {
      return level.id;
    }
  }

  return ordered[0].id;
}

export function buildCampaignLevelStates(
  mapId: string,
  levels: MapLevelItem[],
  currentLevelId?: string | null,
): CampaignLevelState[] {
  const ordered = orderedLevels(levels);
  const progress = getCampaignMapProgress(mapId);
  const completedSet = new Set(
    Object.entries(progress)
      .filter(([, value]) => value?.completedAt != null)
      .map(([levelId]) => levelId),
  );

  const resolvedCurrent = currentLevelId ?? getCampaignCurrentLevelId(mapId, ordered);

  return ordered.map((level, index) => {
    const isCompleted = completedSet.has(level.id);
    const isUnlocked = index === 0 || completedSet.has(ordered[index - 1].id);

    return {
      levelId: level.id,
      isLocked: !isUnlocked,
      isUnlocked,
      isCompleted,
      isCurrent: level.id === resolvedCurrent,
    };
  });
}

export function getCampaignProgressCounts(
  mapId: string,
  levels: MapLevelItem[],
): { completed: number; total: number } {
  const states = buildCampaignLevelStates(mapId, levels);
  return {
    completed: states.filter((item) => item.isCompleted).length,
    total: states.length,
  };
}

export function hasCampaignStarted(mapId: string, levels: MapLevelItem[]): boolean {
  const progress = getCampaignMapProgress(mapId);
  const levelIds = new Set(levels.map((level) => level.id));
  return Object.entries(progress).some(
    ([levelId, row]) => levelIds.has(levelId) && row?.startedAt != null,
  );
}
