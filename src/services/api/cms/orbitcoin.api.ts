import { cmsAxios } from "@/services/http/axios.cms";
import type { ApiResult } from "@/types/api/common";

export type CmsExchangeRateDto = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  reason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CmsUpdateExchangeRateRequest = {
  rate: number;
  reason?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export const cmsOrbitCoinApi = {
  getExchangeRate(fromCurrency = "OrbitCoin", toCurrency = "VND") {
    return cmsAxios.get<ApiResult<CmsExchangeRateDto>>("/api/cms/orbitcoin/exchange-rate", {
      params: { fromCurrency, toCurrency },
    });
  },

  updateExchangeRate(body: CmsUpdateExchangeRateRequest) {
    return cmsAxios.put<ApiResult<CmsExchangeRateDto>>("/api/cms/orbitcoin/exchange-rate", body);
  },

  getExchangeRateHistory(fromCurrency = "OrbitCoin", toCurrency = "VND", take = 20) {
    return cmsAxios.get<ApiResult<CmsExchangeRateDto[]>>(
      "/api/cms/orbitcoin/exchange-rate/history",
      {
        params: { fromCurrency, toCurrency, take },
      },
    );
  },
};
