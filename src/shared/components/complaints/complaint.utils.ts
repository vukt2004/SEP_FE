import type { ComplaintStatus } from "@/types/api/complaints";

export const COMPLAINT_LIMITS = {
  subject: 200,
  category: 50,
  content: 5000,
} as const;

export function validateCreateComplaintForm(input: {
  subject: string;
  category: string;
  description: string;
}) {
  const errors: Partial<Record<"subject" | "category" | "description", string>> = {};

  if (!input.subject.trim()) errors.subject = "Subject is required";
  else if (input.subject.length > COMPLAINT_LIMITS.subject)
    errors.subject = `Subject max ${COMPLAINT_LIMITS.subject} characters`;

  if (!input.category.trim()) errors.category = "Category is required";
  else if (input.category.length > COMPLAINT_LIMITS.category)
    errors.category = `Category max ${COMPLAINT_LIMITS.category} characters`;

  if (!input.description.trim()) errors.description = "Description is required";
  else if (input.description.length > COMPLAINT_LIMITS.content)
    errors.description = `Description max ${COMPLAINT_LIMITS.content} characters`;

  return errors;
}

export function validateMessageContent(content: string) {
  if (!content.trim()) return "Content is required";
  if (content.length > COMPLAINT_LIMITS.content)
    return `Content max ${COMPLAINT_LIMITS.content} characters`;
  return "";
}

export function normalizeComplaintStatus(status: string | null | undefined): ComplaintStatus | null {
  if (!status) return null;
  const normalized = status.replace(/[\s_-]/g, "").toLowerCase();

  if (normalized === "open") return "Open";
  if (normalized === "inprogress" || normalized === "pending") return "InProgress";
  if (normalized === "resolved" || normalized === "solved" || normalized === "closed") return "Resolved";

  return null;
}

export function getNextAllowedStatus(status: string | null | undefined): ComplaintStatus | null {
  const canonical = normalizeComplaintStatus(status);
  if (canonical === "Open") return "InProgress";
  if (canonical === "InProgress") return "Resolved";
  return null;
}

export function getAllowedStatusTransitions(status: string | null | undefined): ComplaintStatus[] {
  const canonical = normalizeComplaintStatus(status);
  if (canonical === "Open") return ["InProgress"];
  if (canonical === "InProgress") return ["Resolved"];
  return [];
}

export function toComplaintStatusEnumValue(status: ComplaintStatus): number {
  if (status === "Open") return 0;
  if (status === "InProgress") return 1;
  return 2;
}
