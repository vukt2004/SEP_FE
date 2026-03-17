// src/services/api/learner/packages.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type { PackagesListResult, PackageDetailResult } from "@/types/api/learner/packages";

export const learnerPackagesApi = {
  getAll(page: number = 1, pageSize: number = 20) {
    return learnerAxios.get<PackagesListResult>("/api/learner/marketplace/packages", {
      params: { page, pageSize },
    });
  },

  getById(id: string) {
    return learnerAxios.get<PackageDetailResult>(`/api/learner/marketplace/packages/${id}`);
  },
};
