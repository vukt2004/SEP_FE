// src/services/api/learner/orbitcoin.api.ts
import axios from "axios";
import { tokenStorage } from "@/lib/storage/tokenStorage";

export type OrbitCoinBalanceResponse = {
  balance: number;
};

export const CoinTransactionTypeEnum = {
  Credit: 0,
  Debit: 1,
} as const;

export type CoinTransactionTypeEnum =
  (typeof CoinTransactionTypeEnum)[keyof typeof CoinTransactionTypeEnum];

export type OrbitCoinTransaction = {
  id: string;
  amount: number;
  transactionType: CoinTransactionTypeEnum;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  feeAmount: number;
  balanceAfter?: number | null;
  note?: string | null;
  createdAt: string;
};

export type OrbitCoinTransactionHistoryResponse = {
  items: OrbitCoinTransaction[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export type ApiResult<T> = {
  isSuccess: boolean;
  message?: string | null;
  data?: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

http.interceptors.request.use((config) => {
  const token = tokenStorage.getLearnerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const orbitCoinApi = {
  getBalance: async () => {
    const { data } = await http.get<ApiResult<OrbitCoinBalanceResponse>>(
      "/api/learner/orbitcoin/balance",
    );
    return data;
  },

  getTransactionHistory: async (params: { pageNumber?: number; pageSize?: number } = {}) => {
    const { data } = await http.get<ApiResult<OrbitCoinTransactionHistoryResponse>>(
      "/api/learner/orbitcoin/transactions",
      {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      },
    );
    return data;
  },
};
