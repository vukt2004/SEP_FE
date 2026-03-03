// src/services/api/student/packages.api.ts
import { studentAxios } from "@/services/http/axios.student";
import type { PackagesListResult, PackageDetailResult } from "@/types/api/student/packages";

export const studentPackagesApi = {
  getAll(page: number = 1, pageSize: number = 20) {
    return studentAxios.get<PackagesListResult>("/api/learner/marketplace/packages", {
      params: { page, pageSize },
    });
  },

  getById(id: string) {
    return studentAxios.get<PackageDetailResult>(`/api/learner/marketplace/packages/${id}`);
  },
};
