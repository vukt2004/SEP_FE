// src/services/api/learner/orbitcoin.api.ts
import { learnerAxios } from "@/services/http/axios.learner";

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

export const orbitCoinApi = {
  getBalance: async () => {
    const { data } = await learnerAxios.get<ApiResult<OrbitCoinBalanceResponse>>(
      "/api/learner/orbitcoin/balance",
    );
    return data;
  },

  getTransactionHistory: async (params: { pageNumber?: number; pageSize?: number } = {}) => {
    const { data } = await learnerAxios.get<ApiResult<OrbitCoinTransactionHistoryResponse>>(
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
