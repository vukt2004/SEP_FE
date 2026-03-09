import type { FieldKey, MessageCode } from "./messages";

export type DuckMode = "idle" | "look" | "shy" | "thinking" | "happy" | "oops";

export type DuckModeState = {
  isSubmitting: boolean;
  isSuccess: boolean;
  focusedField: FieldKey | null;
  fieldErrors: Partial<Record<FieldKey, MessageCode>>;
  formErrorCode: MessageCode | null;
  systemErrorCode: MessageCode | null;
};

function hasAnyError(s: DuckModeState): boolean {
  return Boolean(
    s.fieldErrors.email || s.fieldErrors.password || s.formErrorCode || s.systemErrorCode,
  );
}

export function selectDuckMode(s: DuckModeState): DuckMode {
  if (s.isSubmitting) return "thinking";
  if (s.isSuccess) return "happy";
  if (hasAnyError(s)) return "oops";
  if (s.focusedField === "password") return "shy";
  if (s.focusedField === "email") return "look";
  return "idle";
}
