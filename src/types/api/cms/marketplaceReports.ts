import type { ApiResult } from "../common";

export type PaymentsReportGroupBy = "Day" | "Month" | "Year";

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