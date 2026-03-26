import { cmsAxios } from "@/services/http/axios.cms";
import type {
  CmsChangeComplaintStatusRequest,
  CmsChangeComplaintStatusResult,
  CmsComplaintDetailResult,
  CmsComplaintListQuery,
  CmsComplaintListResult,
  CmsComplaintMessageRequest,
  CmsComplaintMessageResult,
} from "@/types/api/cms/complaints";

export const cmsComplaintsApi = {
  getComplaints(params: CmsComplaintListQuery) {
    return cmsAxios.get<CmsComplaintListResult>("/api/cms/complaints", { params });
  },
  getComplaintById(complaintId: string) {
    return cmsAxios.get<CmsComplaintDetailResult>(`/api/cms/complaints/${complaintId}`);
  },
  changeStatus(complaintId: string, body: CmsChangeComplaintStatusRequest) {
    return cmsAxios.post<CmsChangeComplaintStatusResult>(`/api/cms/complaints/${complaintId}/status`, body);
  },
  addMessage(complaintId: string, body: CmsComplaintMessageRequest) {
    return cmsAxios.post<CmsComplaintMessageResult>(`/api/cms/complaints/${complaintId}/messages`, body);
  },
};
