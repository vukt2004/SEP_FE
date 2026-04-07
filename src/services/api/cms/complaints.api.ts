import { cmsAxios } from "@/services/http/axios.cms";
import type {
  CmsComplaintCategoryConfigListResult,
  CmsChangeComplaintStatusRequest,
  CmsChangeComplaintStatusResult,
  CmsDeleteComplaintCategoryConfigResult,
  CmsComplaintDetailResult,
  CmsComplaintListQuery,
  CmsComplaintListResult,
  CmsComplaintMessageRequest,
  CmsComplaintMessageResult,
  CmsUpsertComplaintCategoryConfigRequest,
  CmsUpsertComplaintCategoryConfigResult,
} from "@/types/api/cms/complaints";

export const cmsComplaintsApi = {
  getComplaints(params: CmsComplaintListQuery) {
    return cmsAxios.get<CmsComplaintListResult>("/api/cms/complaints", { params });
  },
  getComplaintById(complaintId: string) {
    return cmsAxios.get<CmsComplaintDetailResult>(`/api/cms/complaints/${complaintId}`);
  },
  changeStatus(complaintId: string, body: CmsChangeComplaintStatusRequest) {
    return cmsAxios.post<CmsChangeComplaintStatusResult>(
      `/api/cms/complaints/${complaintId}/status`,
      body,
    );
  },
  addMessage(complaintId: string, body: CmsComplaintMessageRequest) {
    const formData = new FormData();
    formData.append("content", body.content.trim());
    formData.append("isInternal", String(body.isInternal));
    (body.attachments ?? []).forEach((file) => {
      formData.append("attachments", file, file.name);
    });

    return cmsAxios.post<CmsComplaintMessageResult>(
      `/api/cms/complaints/${complaintId}/messages`,
      formData,
    );
  },
  getCategoryConfigs() {
    return cmsAxios.get<CmsComplaintCategoryConfigListResult>(
      "/api/cms/complaints/config/categories",
    );
  },
  upsertCategoryConfig(categoryKey: string, body: CmsUpsertComplaintCategoryConfigRequest) {
    return cmsAxios.put<CmsUpsertComplaintCategoryConfigResult>(
      `/api/cms/complaints/config/categories/${encodeURIComponent(categoryKey)}`,
      body,
    );
  },
  deleteCategoryConfig(categoryKey: string) {
    return cmsAxios.delete<CmsDeleteComplaintCategoryConfigResult>(
      `/api/cms/complaints/config/categories/${encodeURIComponent(categoryKey)}`,
    );
  },
};
