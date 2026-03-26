import { learnerAxios } from "@/services/http/axios.learner";
import type {
  AddLearnerComplaintMessageRequest,
  AddLearnerComplaintMessageResult,
  CreateComplaintRequest,
  CreateComplaintResult,
  LearnerComplaintDetailResult,
  LearnerComplaintListQuery,
  LearnerComplaintListResult,
} from "@/types/api/learner/complaints";

export const learnerComplaintsApi = {
  createComplaint(body: CreateComplaintRequest) {
    return learnerAxios.post<CreateComplaintResult>("/api/learner/complaints", body);
  },
  getComplaints(params: LearnerComplaintListQuery) {
    return learnerAxios.get<LearnerComplaintListResult>("/api/learner/complaints", { params });
  },
  getComplaintById(complaintId: string) {
    return learnerAxios.get<LearnerComplaintDetailResult>(`/api/learner/complaints/${complaintId}`);
  },
  addMessage(complaintId: string, body: AddLearnerComplaintMessageRequest) {
    return learnerAxios.post<AddLearnerComplaintMessageResult>(
      `/api/learner/complaints/${complaintId}/messages`,
      body,
    );
  },
};
