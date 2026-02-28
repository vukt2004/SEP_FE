// src/portals/student/login/messageSelector.ts

import type { FieldKey, MessageCode, UiMessage } from "./messages";
import { buildMessage } from "./messages";

export type LoginMessageState = {
  // runtime states
  isSubmitting: boolean;
  isSuccess: boolean;

  // form interaction states
  focusedField: FieldKey | null;
  capsLockOn: boolean;

  // errors
  fieldErrors: Partial<Record<FieldKey, MessageCode>>;
  formErrorCode: MessageCode | null; // e.g. AUTH_INVALID
  systemErrorCode: MessageCode | null; // e.g. AUTH_NETWORK_ERROR
};

export function selectTopBubbleMessage(s: LoginMessageState): UiMessage {
  // 1) Loading
  if (s.isSubmitting) return buildMessage("AUTH_LOADING");

  // 2) Errors (field > form > system)
  const fieldErrCode = s.fieldErrors.email ?? s.fieldErrors.password ?? null;
  if (fieldErrCode) return buildMessage(fieldErrCode);

  if (s.formErrorCode) return buildMessage(s.formErrorCode);
  if (s.systemErrorCode) return buildMessage(s.systemErrorCode);

  // 3) Success
  if (s.isSuccess) return buildMessage("AUTH_SUCCESS");

  // 4) Hints
  if (s.focusedField === "email") return buildMessage("HINT_EMAIL_EXAMPLE");
  if (s.focusedField === "password") {
    if (s.capsLockOn) return buildMessage("HINT_CAPSLOCK_ON");
    return buildMessage("HINT_PASSWORD_PRIVACY");
  }

  // 5) Idle (pick one)
  return buildMessage("IDLE_WELCOME");
}
