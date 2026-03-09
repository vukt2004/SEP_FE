// src/types/api/learner/auth.ts
import type { ApiResult } from "../common";

export type LoginRequest = {
  email: string;
  password: string;
  grantType?: 0; // default 0
};

export type AuthResponse = {
  accessToken?: string | null;
  expiresAt: string; // ISO datetime
  roles?: string[] | null;
};

export type AuthResponseResult = ApiResult<AuthResponse>;
export type Result = ApiResult;
export type VerifyOtpResponseResult = ApiResult<AuthResponse>;

export type GenderEnum = 0 | 1 | 2;

export type LearnerRegisterForm = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  gender?: GenderEnum;
  dateOfBirth?: string; // "YYYY-MM-DD"
  studentCode?: string;
};

export type VerifyOtpRequest = {
  contact: string;
  otp: string;
  otpType?: 1 | 2; // default 1 (Registration)
  otpSentChannel?: 1 | 2; // default 1 (Email)
};
