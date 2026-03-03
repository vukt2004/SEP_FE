// src/services/api/cms/marketplace.api.ts
import { cmsAxios } from "@/services/http/axios.cms";
import type {
  GetPackagesParams,
  PackagesListResult,
  PackageDetailResult,
  CreatePackageRequest,
  CreatePackageResult,
  UpdatePackageRequest,
  UpdatePackageResult,
} from "@/types/api/cms/marketplace";

/**
 * CMS Marketplace API
 * Handles package management operations
 */
export const cmsMarketplaceApi = {
  /**
   * Get paginated list of all packages
   * GET /api/cms/marketplace/packages
   *
   * @param params - Query parameters (page, size, filters)
   * @returns Paginated packages list
   */
  getPackages(params?: GetPackagesParams) {
    return cmsAxios.get<PackagesListResult>("/api/cms/marketplace/packages", { params });
  },

  /**
   * Get detailed package information by ID
   * GET /api/cms/marketplace/packages/{id}
   *
   * @param id - Package ID
   * @returns Detailed package information
   */
  getPackageById(id: string) {
    return cmsAxios.get<PackageDetailResult>(`/api/cms/marketplace/packages/${id}`);
  },

  /**
   * Create a new package
   * POST /api/cms/marketplace/packages
   *
   * @param data - Package creation data
   * @returns New package ID
   */
  createPackage(data: CreatePackageRequest) {
    return cmsAxios.post<CreatePackageResult>("/api/cms/marketplace/packages", data);
  },

  /**
   * Update an existing package
   * PUT /api/cms/marketplace/packages/{id}
   *
   * @param id - Package ID to update
   * @param data - Updated package data
   * @returns Success response
   */
  updatePackage(id: string, data: UpdatePackageRequest) {
    return cmsAxios.put<UpdatePackageResult>(`/api/cms/marketplace/packages/${id}`, data);
  },
};
