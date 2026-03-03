// src/types/api/cms/auth.ts
import type { ApiResult } from "../common";

export type LoginRequest = {
  email: string;
  password: string;
  grantType?: 0 | 1; // 0 = Password, 1 = other
};

export type AuthResponse = {
  accessToken?: string | null;
  expiresAt: string; // ISO datetime
  roles?: string[] | null;
};

export type AuthResponseResult = ApiResult<AuthResponse>;

export type ProfileResponse = {
  email: string | null;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  gender: number | null;
  dateOfBirth: string | null;
  bio: string | null;
  avatarPath: string | null;
  learnerCode: string | null;
  teacherCode: string | null;
  position: string | null;
  hireDate: string | null;
  salary: number | null;
};

export type ProfileResponseResult = ApiResult<ProfileResponse>;

export type UpdateProfileRequest = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarFile?: File;
};

export type Result = ApiResult;
