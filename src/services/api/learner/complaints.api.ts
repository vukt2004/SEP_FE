import { learnerAxios } from "@/services/http/axios.learner";
import type {
  AddLearnerComplaintMessageRequest,
  AddLearnerComplaintMessageResult,
  ComplaintCategoryConfigListResult,
  CreateComplaintRequest,
  CreateComplaintResult,
  LearnerAgainstMeChangeStatusRequest,
  LearnerAgainstMeChangeStatusResult,
  LearnerComplaintDetailResult,
  LearnerComplaintListQuery,
  LearnerComplaintListResult,
} from "@/types/api/learner/complaints";

function appendIfValue(formData: FormData, key: string, value: string | undefined) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (trimmed.length === 0) return;
  formData.append(key, trimmed);
}

export const learnerComplaintsApi = {
  createComplaint(body: CreateComplaintRequest) {
    const formData = new FormData();
    formData.append("subject", body.subject.trim());
    formData.append("categoryKey", body.categoryKey.trim());
    formData.append("description", body.description.trim());

    appendIfValue(formData, "context.paymentRecordId", body.context.paymentRecordId);
    appendIfValue(formData, "Context.GameId", body.context.mapId);
    appendIfValue(formData, "context.packageId", body.context.packageId);
    appendIfValue(formData, "context.submissionId", body.context.submissionId);
    appendIfValue(formData, "context.playHistoryId", body.context.playHistoryId);
    appendIfValue(formData, "context.xpTransactionId", body.context.xpTransactionId);
    appendIfValue(formData, "context.orbitCoinTransactionId", body.context.orbitCoinTransactionId);
    appendIfValue(formData, "context.occurredAt", body.context.occurredAt);

    (body.attachments ?? []).forEach((file) => {
      formData.append("attachments", file, file.name);
    });

    return learnerAxios.post<CreateComplaintResult>("/api/learner/complaints", formData);
  },
  getCategoryConfigs() {
    return learnerAxios.get<ComplaintCategoryConfigListResult>(
      "/api/learner/complaints/categories",
    );
  },
  getComplaints(params: LearnerComplaintListQuery) {
    return learnerAxios.get<LearnerComplaintListResult>("/api/learner/complaints", { params });
  },
  getComplaintsAgainstMe(params: LearnerComplaintListQuery) {
    return learnerAxios.get<LearnerComplaintListResult>("/api/learner/complaints/against-me", {
      params,
    });
  },
  getComplaintById(complaintId: string) {
    return learnerAxios.get<LearnerComplaintDetailResult>(`/api/learner/complaints/${complaintId}`);
  },
  getComplaintAgainstMeById(complaintId: string) {
    return learnerAxios.get<LearnerComplaintDetailResult>(
      `/api/learner/complaints/against-me/${complaintId}`,
    );
  },
  changeAgainstMeStatus(complaintId: string, body: LearnerAgainstMeChangeStatusRequest) {
    return learnerAxios.post<LearnerAgainstMeChangeStatusResult>(
      `/api/learner/complaints/against-me/${complaintId}/status`,
      body,
    );
  },
  addMessage(complaintId: string, body: AddLearnerComplaintMessageRequest) {
    const formData = new FormData();
    formData.append("content", body.content.trim());
    (body.attachments ?? []).forEach((file) => {
      formData.append("attachments", file, file.name);
    });

    return learnerAxios.post<AddLearnerComplaintMessageResult>(
      `/api/learner/complaints/${complaintId}/messages`,
      formData,
    );
  },
};
