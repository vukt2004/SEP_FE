// src/types/api/cms/packages.ts
import type { ApiResult } from "../common";

/**
 * Generic pagination result structure
 */
export interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
  isSuccess: boolean;
  message: string;
  errors: string[];
  errorCode: string;
}

/**
 * Package status enum
 * 0 = Inactive
 * 1 = Active
 * 2 = Pending
 * 3 = Rejected
 */
export type PackageStatusEnum = 0 | 1 | 2 | 3;

/**
 * Package item in list view
 */
export interface PackageListItem {
  id: string;
  name: string;
  durationDays: number;
  limit: number | null;
  price: number;
  featuresSpec: string | null;
  isActive: boolean;
  status: PackageStatusEnum;
  createdAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/**
 * Detailed package information
 */
export interface PackageDetail {
  id: string;
  name: string;
  durationDays: number;
  limit: number | null;
  price: number;
  featuresSpec: string | null;
  isActive: boolean;
  status: PackageStatusEnum;
  createdAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/**
 * Pagination result for packages list
 */
export type PackagesPaginationResult = PaginationResult<PackageListItem>;

/**
 * Full API response wrapper for packages
 */
export type PackagesListResult = ApiResult<PackagesPaginationResult>;

/**
 * Package detail API response
 */
export type PackageDetailResult = ApiResult<PackageDetail>;

/**
 * Query parameters for getting packages list
 */
export interface GetPackagesParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  status?: PackageStatusEnum;
}

/**
 * Create package request
 */
export interface CreatePackageRequest {
  name: string;
  durationDays: number;
  limit: number | null;
  price: number;
  featuresSpec?: string | null;
}

/**
 * Create package response (returns new package ID)
 */
export type CreatePackageResult = ApiResult<string>;

/**
 * Update package request
 */
export interface UpdatePackageRequest {
  name: string;
  durationDays: number;
  limit: number | null;
  price: number;
  featuresSpec?: string | null;
  isActive?: boolean;
  status?: PackageStatusEnum;
}

/**
 * Update package response
 */
export type UpdatePackageResult = ApiResult<null>;
