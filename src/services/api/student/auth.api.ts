// src/services/api/student/auth.api.ts
import { studentAxios } from "@/services/http/axios.student";
import type {
  AuthResponseResult,
  LoginRequest,
  Result,
  StudentRegisterForm,
  VerifyOtpRequest,
  VerifyOtpResponseResult,
} from "@/types/api/student/auth";

function toFormData(payload: StudentRegisterForm): FormData {
  const fd = new FormData();
  fd.append("email", payload.email);
  fd.append("password", payload.password);
  fd.append("confirmPassword", payload.confirmPassword);
  fd.append("firstName", payload.firstName);
  fd.append("lastName", payload.lastName);
  fd.append("phoneNumber", payload.phoneNumber);

  if (payload.studentCode) fd.append("studentCode", payload.studentCode);
  if (payload.gender !== undefined) fd.append("gender", String(payload.gender));
  if (payload.dateOfBirth) fd.append("dateOfBirth", payload.dateOfBirth);

  return fd;
}

export const studentAuthApi = {
  login(payload: LoginRequest) {
    return studentAxios.post<AuthResponseResult>("/api/student/auth/login", {
      ...payload,
      grantType: payload.grantType ?? 0,
    });
  },

  logout() {
    return studentAxios.post<Result>("/api/student/auth/logout");
  },

  register(payload: StudentRegisterForm) {
    const fd = toFormData(payload);
    return studentAxios.post<Result>("/api/student/auth/register", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  verifyOtp(payload: VerifyOtpRequest) {
    return studentAxios.post<VerifyOtpResponseResult>("/api/student/auth/verify-otp", {
      ...payload,
      otpType: payload.otpType ?? 1,
      otpSentChannel: payload.otpSentChannel ?? 1,
    });
  },

  profile() {
    return studentAxios.get<Result>("/api/student/auth/profile");
  },

  refreshToken() {
    return studentAxios.get<AuthResponseResult>("/api/student/auth/refresh-token");
  },
};
