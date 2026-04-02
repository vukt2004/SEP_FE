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

export type UserPackage = {
  userPackageId: string;
  packageId: string;
  name: string;
  durationDays: number;
  limit: number | null;
  price: number;
  featuresSpec: string;
  remaining: number | null;
  expiresAt: string;
  purchasedAt: string;
};

export type MyPackagesData = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: UserPackage[];
  isSuccess: boolean;
  message: string;
};

export type PackagesListResult = ApiResult<PackagesListData>;
export type PackageDetailResult = ApiResult<Package>;
export type PurchasePackageResult = ApiResult<string>;
export type MyPackagesResult = ApiResult<MyPackagesData>;
