import type { MapData } from "../../../shared/types/MapSchema";
import { exportMapToGameFormat, PortalValidationError } from "./exportMapToGameFormat";

export type MapUploadLevelInput = {
  levelOrder: number;
  mapData: MapData;
  hints: string[];
};

export function normalizeHintsForJson(hints: string[]): string[] {
  return hints.map((h) => h.trim()).filter((h) => h.length > 0).slice(0, 3);
}

/**
 * Build JSON body expected by BE MapFileJsonLevelsParser: `{ levels: [ { levelOrder, title, timeLimitMs, winCondition, type, jsonContent } ] }`.
 * Hints are embedded in `jsonContent` for MapHintsExtractor.
 */
export function buildMapUploadJsonString(levels: MapUploadLevelInput[]): string {
  const payload = {
    levels: levels.map((lv) => {
      const title =
        (lv.mapData.config.name && lv.mapData.config.name.trim()) ||
        `Level ${lv.levelOrder + 1}`;
      const gl = exportMapToGameFormat(lv.mapData, title);
      const hintStrings = normalizeHintsForJson(lv.hints);
      const jsonContent: Record<string, unknown> = {
        ...gl,
        ...(hintStrings.length > 0 ? { hints: hintStrings } : {}),
      };
      const timeLimitMs = Math.max(1, Math.floor(lv.mapData.config.timeLimitSeconds ?? 1)) * 1000;
      const winCondition = lv.mapData.config.winCondition === 2 ? 2 : 1;
      const type =
        lv.mapData.config.type === "topdown"
          ? "Topdown"
          : lv.mapData.config.type === "snake"
            ? "Snake"
            : "Platform";
      return {
        levelOrder: lv.levelOrder,
        title,
        timeLimitMs,
        winCondition,
        type,
        jsonContent,
      };
    }),
  };
  return JSON.stringify(payload, null, 2);
}

export function buildMapUploadFile(levels: MapUploadLevelInput[], baseName: string): File {
  const json = buildMapUploadJsonString(levels);
  const safe = baseName.replace(/[^\w\-]+/g, "_").slice(0, 80) || "map";
  return new File([json], `${safe}.json`, { type: "application/json" });
}

export type LevelValidationIssue = { levelOrder: number; messages: string[] };

export function validateLevelsForUpload(levels: MapUploadLevelInput[]): LevelValidationIssue[] {
  const issues: LevelValidationIssue[] = [];

  for (const lv of levels) {
    const messages: string[] = [];
    const md = lv.mapData;

    if (
      !md.config.type ||
      (md.config.type !== "platform" && md.config.type !== "topdown" && md.config.type !== "snake")
    ) {
      messages.push("Level type must be topdown, platform, or snake.");
    }

    const sec = md.config.timeLimitSeconds;
    if (typeof sec !== "number" || !Number.isFinite(sec) || sec < 1) {
      messages.push("Time limit must be at least 1 second.");
    }

    const wc = md.config.winCondition;
    if (wc !== 1 && wc !== 2) {
      messages.push("Win condition must be 1 (goal) or 2 (fruits).");
    }

    const hasPlayer = md.objects.items.some((item) => item.type === "player");
    const hasGoal = md.objects.items.some((item) => item.type === "goal");
    if (!hasPlayer || !hasGoal) {
      messages.push("Place both a Player start and a Goal.");
    }

    if (wc === 2 && md.config.requiredFruits !== undefined && md.config.requiredFruits > 0) {
      const totalFruits = md.objects.items.filter((obj) => obj.type === "fruit").length;
      if (md.config.requiredFruits > totalFruits) {
        messages.push(
          `Required fruits (${md.config.requiredFruits}) cannot exceed fruits on the map (${totalFruits}).`,
        );
      }
    }

    try {
      exportMapToGameFormat(md, md.config.name);
    } catch (e) {
      if (e instanceof PortalValidationError) {
        messages.push(e.message);
      } else {
        messages.push(e instanceof Error ? e.message : "Export validation failed.");
      }
    }

    if (messages.length > 0) {
      issues.push({ levelOrder: lv.levelOrder, messages });
    }
  }

  return issues;
}
