import { cmsAxios } from "@/services/http/axios.cms";
import type { ApiResult } from "@/types/api/common";

export type MapSolveScoreConfigDto = {
  configKey: string;
  baseScore: number;
  timeScore: number;
  stepsScore: number;
  blocksScore: number;
};

export type UpdateMapSolveScoreConfigRequest = {
  baseScore: number;
  timeScore: number;
  stepsScore: number;
  blocksScore: number;
};

export const cmsGameplayApi = {
  getMapSolveScoreConfig() {
    return cmsAxios.get<ApiResult<MapSolveScoreConfigDto>>("/api/cms/gameplay/map-solve-score");
  },

  updateMapSolveScoreConfig(body: UpdateMapSolveScoreConfigRequest) {
    return cmsAxios.put<ApiResult<unknown>>("/api/cms/gameplay/map-solve-score", body);
  },
};
