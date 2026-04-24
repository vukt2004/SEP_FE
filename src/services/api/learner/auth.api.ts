// src/services/api/learner/auth.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type { AxiosError } from "axios";
import type {
  AuthResponseResult,
  GoogleLoginRequest,
  LoginRequest,
  Result,
  LearnerRegisterForm,
  ResetPasswordRequest,
  VerifyOtpRequest,
  VerifyOtpResponseResult,
} from "@/types/api/learner/auth";

function toFormData(payload: LearnerRegisterForm): FormData {
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

export const learnerAuthApi = {
  login(payload: LoginRequest) {
    return learnerAxios.post<AuthResponseResult>("/api/learner/auth/login", {
      ...payload,
      grantType: payload.grantType ?? 0,
    });
  },

  async googleLogin(payload: GoogleLoginRequest) {
    const preferredUrl = (import.meta.env.VITE_GOOGLE_LOGIN_ENDPOINT as string | undefined)?.trim();

    if (preferredUrl) {
      const body = /\/auth\/login\/google$/i.test(preferredUrl)
        ? { tokenId: payload.idToken }
        : { idToken: payload.idToken };
      return learnerAxios.post<AuthResponseResult>(preferredUrl, body);
    }

    try {
      // BaseBECleanArchitecture endpoint
      return await learnerAxios.post<AuthResponseResult>("/api/learner/auth/google", {
        idToken: payload.idToken,
      });
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const status = axiosError.response?.status;

      // EXE_BE fallback endpoint
      if (status === 404 || status === 405) {
        return learnerAxios.post<AuthResponseResult>("/api/Auth/login/google", {
          tokenId: payload.idToken,
        });
      }
      throw error;
    }
  },

  logout() {
    return learnerAxios.post<Result>("/api/learner/auth/logout");
  },

  register(payload: LearnerRegisterForm) {
    const fd = toFormData(payload);
    return learnerAxios.post<Result>("/api/learner/auth/register", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  resetPassword(payload: ResetPasswordRequest) {
    return learnerAxios.post<Result>("/api/learner/auth/reset-password", {
      ...payload,
      otpSentChannel: 1, // Email only
    });
  },

  verifyOtp(payload: VerifyOtpRequest) {
    return learnerAxios.post<VerifyOtpResponseResult>("/api/learner/auth/verify-otp", {
      ...payload,
      otpType: payload.otpType ?? 1,
      otpSentChannel: payload.otpSentChannel ?? 1,
    });
  },

  profile() {
    return learnerAxios.get<Result>("/api/learner/auth/profile");
  },

  refreshToken() {
    return learnerAxios.post<AuthResponseResult>("/api/learner/auth/refresh-token", undefined, {
      withCredentials: true,
    });
  },
};
