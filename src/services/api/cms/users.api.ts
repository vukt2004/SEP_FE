// src/services/api/cms/users.api.ts
import { cmsAxios } from "@/services/http/axios.cms";
import type {
  GetUsersParams,
  UserListResult,
  UserDetailResult,
  UpdateUserRequest,
  BatchUpdateStatusRequest,
  BatchUpdateStatusResultResponse,
} from "@/types/api/cms/users";
import type { ApiResult } from "@/types/api/common";

/**
 * Convert UpdateUserRequest to FormData for multipart/form-data upload
 */
function toFormData(payload: UpdateUserRequest): FormData {
  const fd = new FormData();

  if (payload.firstName) fd.append("FirstName", payload.firstName);
  if (payload.lastName) fd.append("LastName", payload.lastName);
  if (payload.email) fd.append("Email", payload.email);
  if (payload.phoneNumber) fd.append("PhoneNumber", payload.phoneNumber);
  if (payload.status !== undefined) fd.append("Status", String(payload.status));
  if (payload.newRole !== undefined) fd.append("NewRole", String(payload.newRole));
  if (payload.avatarFile) fd.append("avatarFile", payload.avatarFile);

  return fd;
}

export const cmsUsersApi = {
  /**
   * Get paginated list of users
   * GET /api/cms/users
   *
    * @param params - Query parameters (page, pageSize, search, email, phoneNumber, role, status, joiningFrom, joiningTo, sortBy, isAscending)
   * @returns Paginated user list
   */
  getUsers(params?: GetUsersParams) {
    return cmsAxios.get<UserListResult>("/api/cms/users", { params });
  },

  /**
   * Get user by ID
   * GET /api/cms/users/{id}
   *
   * @param id - User ID
   * @returns User detail information
   */
  getUserById(id: string) {
    return cmsAxios.get<UserDetailResult>(`/api/cms/users/${id}`);
  },

  /**
   * Update user by ID
   * PUT /api/cms/users/{id}
   * Content-Type: multipart/form-data
   *
   * @param id - User ID
   * @param payload - User data to update
   * @returns Success result
   */
  updateUser(id: string, payload: UpdateUserRequest) {
    const fd = toFormData(payload);
    return cmsAxios.put<ApiResult>(`/api/cms/users/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * Batch update user status (activate/deactivate)
   * POST /api/cms/users/batch/status
   *
   * @param payload - User IDs and target status
   * @returns Batch operation result
   */
  batchUpdateStatus(payload: BatchUpdateStatusRequest) {
    return cmsAxios.post<BatchUpdateStatusResultResponse>("/api/cms/users/batch/status", payload);
  },
};
