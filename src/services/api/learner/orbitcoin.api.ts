// src/services/api/learner/orbitcoin.api.ts
import { learnerAxios } from "@/services/http/axios.learner";

export type OrbitCoinBalanceResponse = {
  balance: number;
};

export const CoinTransactionTypeEnum = {
  EarnDeposit: 0,
  EarnMapSold: 1,
  SpendMapPurchase: 2,
  SpendPackagePurchase: 3,
  SystemFee: 4,
  Refund: 5,
  AdminAdjustment: 6,
} as const;

export type CoinTransactionTypeEnum =
  (typeof CoinTransactionTypeEnum)[keyof typeof CoinTransactionTypeEnum];

export type OrbitCoinTransaction = {
  id: string;
  amount: number;
  amountVND?: number | null;
  amountVnd?: number | null;
  transactionType: CoinTransactionTypeEnum;
  direction?: "In" | "Out";
  category?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  paymentRecordId?: string | null;
  gameId?: string | null;
  packageId?: string | null;
  counterpartyName?: string | null;
  grossAmount?: number;
  netAmount?: number;
  feeAmount: number;
  status?: string | null;
  balanceAfter?: number | null;
  note?: string | null;
  createdAt: string;
};

export type OrbitCoinTransactionHistoryResponse = {
  items: OrbitCoinTransaction[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  availableStatuses?: string[];
};

export type ExchangeRate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
};

export type WalletDashboardSummary = {
  role: "Buyer" | "Creator";
  currency?: "VND";
  periodFrom: string;
  periodTo: string;
  currentBalance: number;
  currentBalanceVnd?: number;
  currentBalanceOc?: number;
  pendingBalance: number;
  totalIn: number;
  totalOut: number;
  netFlow: number;
  incomeThisMonth: number;
  spendingThisMonth: number;
  netProfitThisMonth: number;
  totalTransactions: number;
  inflowTransactions: number;
  outflowTransactions: number;
  grossRevenue: number;
  platformFee: number;
  netRevenue: number;
  uniqueBuyers: number;
  unitsSold: number;
  averageOrderValue: number;
};

export type WalletDashboardTrendItem = {
  period: string;
  inflow: number;
  outflow: number;
  net: number;
  grossRevenue: number;
  platformFee: number;
  netRevenue: number;
};

export type WalletDashboardTrend = {
  role: "Buyer" | "Creator";
  bucket: "Day" | "Week" | "Month";
  items: WalletDashboardTrendItem[];
};

export type WalletDashboardGameItem = {
  gameId: string;
  gameTitle: string;
  buyersCount: number;
  ordersCount: number;
  pendingOrdersCount: number;
  refundedOrdersCount: number;
  gross: number;
  fee: number;
  net: number;
  averageOrderValue: number;
  lastSoldAt?: string | null;
};

export type WalletDashboardGames = {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  items: WalletDashboardGameItem[];
};

export type EscrowPendingTransaction = {
  paymentRecordId: string;
  gameId: string;
  gameTitle: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  feeAmount: number;
  sellerReceives: number;
  paidAt?: string | null;
  paymentStatus: string;
};

export type EscrowPendingList = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: EscrowPendingTransaction[];
  isSuccess?: boolean;
  message?: string | null;
};

export type EscrowPendingParams = {
  pageNumber?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  search?: string;
};

export type TransactionHistoryParams = {
  pageNumber?: number;
  pageSize?: number;
  direction?: "In" | "Out";
  categories?: number[];
  relatedEntityType?: string;
  relatedEntityId?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: string;
  statuses?: string[];
  search?: string;
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

  getTransactionHistory: async (params: TransactionHistoryParams = {}) => {
    const { data } = await learnerAxios.get<ApiResult<OrbitCoinTransactionHistoryResponse>>(
      "/api/learner/orbitcoin/transactions",
      {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
          direction: params.direction,
          categories: params.categories,
          relatedEntityType: params.relatedEntityType,
          relatedEntityId: params.relatedEntityId,
          from: params.from,
          to: params.to,
          minAmount: params.minAmount,
          maxAmount: params.maxAmount,
          status: params.status,
          statuses: params.statuses,
          search: params.search,
        },
      },
    );
    return data;
  },
  getDashboardSummary: async (params: { role: "Buyer" | "Creator"; from?: string; to?: string }) => {
    const { data } = await learnerAxios.get<ApiResult<WalletDashboardSummary>>(
      "/api/learner/orbitcoin/dashboard/summary",
      { params },
    );
    return data;
  },
  getDashboardTrend: async (params: {
    role: "Buyer" | "Creator";
    bucket: "Day" | "Week" | "Month";
    from?: string;
    to?: string;
  }) => {
    const { data } = await learnerAxios.get<ApiResult<WalletDashboardTrend>>(
      "/api/learner/orbitcoin/dashboard/trend",
      { params },
    );
    return data;
  },
  getDashboardGames: async (params: { from?: string; to?: string; pageNumber?: number; pageSize?: number }) => {
    const { data } = await learnerAxios.get<ApiResult<WalletDashboardGames>>(
      "/api/learner/orbitcoin/dashboard/games",
      { params },
    );
    return data;
  },
  getExchangeRate: async (params: { fromCurrency?: string; toCurrency?: string } = {}) => {
    const { data } = await learnerAxios.get<ApiResult<ExchangeRate>>(
      "/api/learner/orbitcoin/exchange-rate",
      { params: { fromCurrency: params.fromCurrency ?? "OrbitCoin", toCurrency: params.toCurrency ?? "VND" } },
    );
    return data;
  },

  getEscrowPending: async (params: EscrowPendingParams = {}) => {
    const { data } = await learnerAxios.get<ApiResult<EscrowPendingList>>(
      "/api/learner/orbitcoin/escrow/pending",
      {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
          from: params.from,
          to: params.to,
          search: params.search,
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
