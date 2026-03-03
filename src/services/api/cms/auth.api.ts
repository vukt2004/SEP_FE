// src/services/api/cms/auth.api.ts
import { cmsAxios } from "@/services/http/axios.cms";
import type {
  AuthResponseResult,
  LoginRequest,
  ProfileResponseResult,
  Result,
  UpdateProfileRequest,
} from "@/types/api/cms/auth";

/**
 * Convert UpdateProfileRequest to FormData for multipart/form-data upload
 */
function toFormData(payload: UpdateProfileRequest): FormData {
  const fd = new FormData();

  if (payload.firstName) fd.append("firstName", payload.firstName);
  if (payload.lastName) fd.append("lastName", payload.lastName);
  if (payload.phoneNumber) fd.append("phoneNumber", payload.phoneNumber);
  if (payload.avatarFile) fd.append("avatarFile", payload.avatarFile);

  return fd;
}

export const cmsAuthApi = {
  /**
   * Login to CMS system
   * POST /api/cms/auth/login
   *
   * @param payload - Login credentials (email, password, grantType)
   * @returns Access token and user roles
   */
  login(payload: LoginRequest) {
    return cmsAxios.post<AuthResponseResult>("/api/cms/auth/login", {
      ...payload,
      grantType: payload.grantType ?? 0,
    });
  },

  /**
   * Logout from CMS system
   * POST /api/cms/auth/logout
   * Requires access token in header
   */
  logout() {
    return cmsAxios.post<Result>("/api/cms/auth/logout");
  },

  /**
   * Get current user profile
   * GET /api/cms/auth/profile
   * Requires access token in header
   */
  getProfile() {
    return cmsAxios.get<ProfileResponseResult>("/api/cms/auth/profile");
  },

  /**
   * Update current user profile
   * PUT /api/cms/auth/profile
   * Content-Type: multipart/form-data
   * Requires access token in header
   *
   * @param payload - Profile data to update (firstName, lastName, phoneNumber, avatarFile)
   */
  updateProfile(payload: UpdateProfileRequest) {
    const fd = toFormData(payload);
    return cmsAxios.put<ProfileResponseResult>("/api/cms/auth/profile", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * Refresh access token
   * POST /api/cms/auth/refresh-token
   * Requires current access token in header
   */
  refreshToken() {
    return cmsAxios.post<AuthResponseResult>("/api/cms/auth/refresh-token");
  },
};
