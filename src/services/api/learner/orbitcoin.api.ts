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
  amountVND?: number | null;
  amountVnd?: number | null;
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

export type DepositRequest = {
  amountOrbitCoin: number;
};

export type DepositResponse = {
  orderId: string;
  checkoutUrl: string;
};

/** Chi tiết đơn nạp từ DB (GET deposit/order) */
export type DepositOrderDetail = {
  orderId: string;
  paymentStatus: string;
  createdAt: string | null;
  paidAt: string | null;
  amountOrbitCoin: number;
  amountVnd: number | null;
  externalOrderCode: string | null;
  paymentMethodCode: string;
  paymentMethodName: string;
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

  deposit: async (requestOptions: DepositRequest) => {
    const { data } = await learnerAxios.post<ApiResult<DepositResponse>>(
      "/api/learner/orbitcoin/deposit",
      requestOptions
    );
    return data;
  },

  /** Sau redirect PayOS: xác nhận với cổng (webhook có thể chậm). */
  confirmDeposit: async (orderId: string) => {
    const { data } = await learnerAxios.post<ApiResult<unknown>>(
      "/api/learner/orbitcoin/deposit/confirm",
      null,
      { params: { orderId } },
    );
    return data;
  },

  getDepositOrder: async (orderId: string) => {
    const { data } = await learnerAxios.get<ApiResult<DepositOrderDetail>>(
      "/api/learner/orbitcoin/deposit/order",
      { params: { orderId } },
    );
    return data;
  },
};
