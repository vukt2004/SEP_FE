import type { ApiResult } from "../common";

export type PaymentsReportGroupBy = "Day" | "Week" | "Month" | "Year";

export interface GetPaymentsReportParams {
  from?: string;
  to?: string;
  groupBy?: PaymentsReportGroupBy;
}

export interface PaymentsReportItem {
  period: string;
  amount: number;
  amountVnd: number;
  count: number;
}

export interface PaymentsReportData {
  totalAmount: number;
  totalAmountVnd: number;
  totalCount: number;
  items: PaymentsReportItem[];
}

export type PaymentsReportResult = ApiResult<PaymentsReportData>;

export interface CmsRevenuePoint {
  period: string;
  grossRevenueVnd: number;
  platformFeeVnd: number;
  netPlatformRevenueVnd: number;
  transactionCount: number;
}

export interface CmsRevenueOverviewData {
  grossRevenueVnd: number;
  platformFeeVnd: number;
  creatorPayoutVnd: number;
  netPlatformRevenueVnd: number;
  totalTransactions: number;
  trend: CmsRevenuePoint[];
}

export type CmsRevenueOverviewResult = ApiResult<CmsRevenueOverviewData>;

export interface CmsMarketplaceTransactionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  gameId?: string;
  packageId?: string;
  amount: number;
  amountVnd: number;
  paymentStatus: string;
  externalId?: string;
  paidAt?: string;
}

export interface CmsOrbitCoinTransactionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  feeAmount: number;
  balanceAfter?: number;
  transactionType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  note?: string;
  createdAt: string;
}

export interface CmsOrbitCoinHolder {
  userId: string;
  userName: string;
  userEmail: string;
  balanceOc: number;
}

export interface CmsOrbitCoinInsightsData {
  issuedOc: number;
  consumedOc: number;
  circulatingOc: number;
  topHolders: CmsOrbitCoinHolder[];
}

export interface CmsPagedResponse<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
  isSuccess: boolean;
  message: string | null;
}

export type CmsPagedResult<T> = ApiResult<CmsPagedResponse<T>>;