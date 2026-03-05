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
 * 0 = Inactive/Draft
 * 1 = Active
 * 2 = Archived
 */
export type PackageStatusEnum = 0 | 1 | 2;

/**
 * Package item in list view
 */
export interface PackageListItem {
  id: string;
  name: string;
  durationDays: number;
  limit: number;
  price: number;
  featuresSpec: string;
  isActive: boolean;
  status: PackageStatusEnum;
}

/**
 * Detailed package information
 */
export interface PackageDetail {
  id: string;
  name: string;
  durationDays: number;
  limit: number;
  price: number;
  featuresSpec: string;
  isActive: boolean;
  status: PackageStatusEnum;
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
  searchTerm?: string;
  isActive?: boolean;
  status?: PackageStatusEnum;
}

/**
 * Create package request
 */
export interface CreatePackageRequest {
  name: string;
  durationDays: number;
  limit: number;
  price: number;
  featuresSpec: string;
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
  limit: number;
  price: number;
  featuresSpec: string;
  isActive: boolean;
}

/**
 * Update package response
 */
export type UpdatePackageResult = ApiResult<null>;
