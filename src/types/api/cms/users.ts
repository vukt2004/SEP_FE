// src/types/api/cms/users.ts
import type { ApiResult } from "../common";

export type RoleEnum = 0 | 1 | 2; // 0 = Admin, 1 = Student, 2 = other
export type EntityStatusEnum = 0 | 1 | 2 | 3; // 0 = Inactive, 1 = Active, 2 = Suspended, 3 = Deleted

export interface UserListItem {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  status: EntityStatusEnum;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  avatarPath: string | null;
  lastLoginAt: string | null;
  joiningAt: string | null;
  roles: RoleEnum[];
}

export interface UserDetail extends UserListItem {
  emailConfirmed: boolean;
  phoneNumberConfirmed: boolean;
}

export interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
  isSuccess: boolean;
  message: string | null;
  errors?: string[] | null;
  errorCode?: string | null;
}

export type UserListResult = PaginationResult<UserListItem>;
export type UserDetailResult = ApiResult<UserDetail>;

export interface GetUsersParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: EntityStatusEnum;
  role?: RoleEnum;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  status?: EntityStatusEnum;
  newRole?: RoleEnum;
  avatarFile?: File;
}

export interface BatchUpdateStatusRequest {
  userIds: string[];
  status: EntityStatusEnum;
}

export interface BatchUpdateStatusResult {
  successCount: number;
  failedCount: number;
  notFoundIds: string[];
}

export type BatchUpdateStatusResultResponse = ApiResult<BatchUpdateStatusResult>;
