import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { emitApiToast } from "@/shared/toast/apiToastBus";

type ApiMessagePayload = {
  message?: unknown;
  isSuccess?: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getApiMessage(payload: unknown): string | null {
  const obj = asObject(payload) as ApiMessagePayload | null;
  const raw = obj?.message;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function isApiSuccess(payload: unknown): boolean | null {
  const obj = asObject(payload) as ApiMessagePayload | null;
  if (typeof obj?.isSuccess === "boolean") {
    return obj.isSuccess;
  }
  return null;
}

function shouldSkipToast(config?: InternalAxiosRequestConfig): boolean {
  const meta = config as InternalAxiosRequestConfig & { skipApiToast?: boolean };
  if (meta.skipApiToast === true) return true;
  if ((config?.method ?? "").toLowerCase() === "get") return true;
  return /auth\/refresh-token/.test(config?.url ?? "");
}

export function notifyApiSuccess(response: AxiosResponse<unknown>) {
  if (shouldSkipToast(response.config)) return;

  const message = getApiMessage(response.data);
  if (!message) return;

  const success = isApiSuccess(response.data);
  emitApiToast({
    type: success === false ? "error" : "success",
    message,
  });
}

export function notifyApiError(error: AxiosError<unknown>) {
  if (shouldSkipToast(error.config)) return;

  const message = getApiMessage(error.response?.data);
  if (!message) return;

  emitApiToast({
    type: "error",
    message,
  });
}
