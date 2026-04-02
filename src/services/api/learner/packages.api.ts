// src/services/api/learner/packages.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type {
  PackagesListResult,
  PackageDetailResult,
  PurchasePackageResult,
  MyPackagesResult,
} from "@/types/api/learner/packages";

export const learnerPackagesApi = {
  getAll(page: number = 1, pageSize: number = 20) {
    return learnerAxios.get<PackagesListResult>("/api/learner/marketplace/packages", {
      params: { page, pageSize },
    });
  },

  getById(id: string) {
    return learnerAxios.get<PackageDetailResult>(`/api/learner/marketplace/packages/${id}`);
  },

  purchase(id: string) {
    return learnerAxios.post<PurchasePackageResult>(
      `/api/learner/marketplace/packages/${id}/purchase`,
    );
  },

  getMyPackages(page: number = 1, pageSize: number = 20) {
    return learnerAxios.get<MyPackagesResult>("/api/learner/marketplace/my-packages", {
      params: { page, pageSize },
    });
  },
};
