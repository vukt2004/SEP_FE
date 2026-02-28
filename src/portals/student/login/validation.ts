// src/portals/student/login/validation.ts

import type { FieldKey, MessageCode } from "./messages";

export type LoginValues = {
  email: string;
  password: string;
};

export type FieldErrors = Partial<Record<FieldKey, MessageCode>>;

const EMAIL_REGEX =
  // Practical email regex (not perfect RFC, but good UX)
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function validateEmail(value: string): MessageCode | null {
  const v = value.trim();
  if (!v) return "VALID_REQUIRED_EMAIL";
  if (!EMAIL_REGEX.test(v)) return "VALID_INVALID_EMAIL_FORMAT";
  return null;
}

export function validatePassword(value: string, minLen = 6): MessageCode | null {
  const v = value ?? "";
  if (!v) return "VALID_REQUIRED_PASSWORD";
  if (v.length < minLen) return "VALID_PASSWORD_MINLEN";
  return null;
}

export function validateForm(values: LoginValues): { fieldErrors: FieldErrors } {
  const fieldErrors: FieldErrors = {};

  const e = validateEmail(values.email);
  if (e) fieldErrors.email = e;

  const p = validatePassword(values.password);
  if (p) fieldErrors.password = p;

  return { fieldErrors };
}

export function firstErrorField(fieldErrors: FieldErrors): FieldKey | null {
  if (fieldErrors.email) return "email";
  if (fieldErrors.password) return "password";
  return null;
}
