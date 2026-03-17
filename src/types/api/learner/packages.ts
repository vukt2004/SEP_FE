// src/types/api/learner/packages.ts
import type { ApiResult } from "../common";

export type Package = {
  id: string;
  name: string;
  durationDays: number;
  limit: number;
  price: number;
  featuresSpec: string;
  isActive: boolean;
  status: number;
};

export type PackagesListData = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: Package[];
  isSuccess: boolean;
  message: string;
};

export type PackagesListResult = ApiResult<PackagesListData>;
export type PackageDetailResult = ApiResult<Package>;
