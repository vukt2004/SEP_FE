import type { ComplaintStatus } from "@/types/api/complaints";

export const COMPLAINT_LIMITS = {
  subject: 200,
  categoryKey: 100,
  content: 5000,
} as const;

type CreateComplaintValidationI18n = {
  subjectRequired?: string;
  subjectMax?: (limit: number) => string;
  categoryRequired?: string;
  categoryKeyMax?: (limit: number) => string;
  descriptionRequired?: string;
  descriptionMax?: (limit: number) => string;
  contextRequiredAny?: (labels: string[]) => string;
};

export function validateCreateComplaintForm(
  input: {
    subject: string;
    categoryKey: string;
    description: string;
    context: {
      paymentRecordId?: string;
      gameId?: string;
      mapId?: string;
      packageId?: string;
      submissionId?: string;
      playHistoryId?: string;
      xpTransactionId?: string;
      orbitCoinTransactionId?: string;
      occurredAt?: string;
    };
    requiredAnyContextFields?: string[];
  },
  i18n?: CreateComplaintValidationI18n,
) {
  const errors: Record<string, string> = {};

  if (!input.subject.trim()) errors.subject = i18n?.subjectRequired ?? "Subject is required";
  else if (input.subject.length > COMPLAINT_LIMITS.subject)
    errors.subject =
      i18n?.subjectMax?.(COMPLAINT_LIMITS.subject) ??
      `Subject max ${COMPLAINT_LIMITS.subject} characters`;

  if (!input.categoryKey.trim())
    errors.categoryKey = i18n?.categoryRequired ?? "Category is required";
  else if (input.categoryKey.length > COMPLAINT_LIMITS.categoryKey)
    errors.categoryKey =
      i18n?.categoryKeyMax?.(COMPLAINT_LIMITS.categoryKey) ??
      `Category key max ${COMPLAINT_LIMITS.categoryKey} characters`;

  if (!input.description.trim())
    errors.description = i18n?.descriptionRequired ?? "Description is required";
  else if (input.description.length > COMPLAINT_LIMITS.content)
    errors.description =
      i18n?.descriptionMax?.(COMPLAINT_LIMITS.content) ??
      `Description max ${COMPLAINT_LIMITS.content} characters`;

  const requiredAny = input.requiredAnyContextFields ?? [];
  if (requiredAny.length > 0) {
    const hasAny = requiredAny.some((field) => {
      const raw = input.context[field as keyof typeof input.context];
      return typeof raw === "string" && raw.trim().length > 0;
    });
    if (!hasAny) {
      errors.context =
        i18n?.contextRequiredAny?.(requiredAny) ??
        `Please provide at least one required context: ${requiredAny.join(", ")}`;
    }
  }

  return errors;
}

export function validateMessageContent(content: string) {
  if (!content.trim()) return "Content is required";
  if (content.length > COMPLAINT_LIMITS.content)
    return `Content max ${COMPLAINT_LIMITS.content} characters`;
  return "";
}

export function normalizeComplaintStatus(
  status: string | null | undefined,
): ComplaintStatus | null {
  if (!status) return null;
  const normalized = status.replace(/[\s_-]/g, "").toLowerCase();

  if (normalized === "open") return "Open";
  if (normalized === "inprogress" || normalized === "pending") return "InProgress";
  if (normalized === "resolved" || normalized === "solved" || normalized === "closed")
    return "Resolved";

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
