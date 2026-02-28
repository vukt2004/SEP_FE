// src/types/api/common.ts
export type ApiResult<T = unknown> = {
  isSuccess: boolean;
  message?: string | null;
  data?: T;
  errors?: string[] | null;
  errorCode?: string | null;
};
