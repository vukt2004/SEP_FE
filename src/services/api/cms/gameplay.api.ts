import { cmsAxios } from "@/services/http/axios.cms";
import type { ApiResult } from "@/types/api/common";

export type MapSolveScoreConfigDto = {
  configKey: string;
  baseScore: number;
  timeScore: number;
  stepsScore: number;
  blocksScore: number;
};

export type UpdateGameSolveScoreConfigRequest = {
  baseScore: number;
  timeScore: number;
  stepsScore: number;
  blocksScore: number;
};

export type GameSolveScoreConfigDto = MapSolveScoreConfigDto;
export type UpdateMapSolveScoreConfigRequest = UpdateGameSolveScoreConfigRequest;

export const cmsGameplayApi = {
  getMapSolveScoreConfig() {
    return cmsAxios.get<ApiResult<MapSolveScoreConfigDto>>("/api/cms/gameplay/game-solve-score");
  },

  updateMapSolveScoreConfig(body: UpdateGameSolveScoreConfigRequest) {
    return cmsAxios.put<ApiResult<unknown>>("/api/cms/gameplay/game-solve-score", body);
  },
};
