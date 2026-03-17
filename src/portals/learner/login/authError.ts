// src/portals/learner/login/authError.ts

import type { MessageCode } from "./messages";

/**
 * Map HTTP status or thrown errors into MessageCode.
 * You can extend this mapping based on your backend contract.
 */
export function mapAuthStatusToMessage(status: number): MessageCode {
  if (status === 401) return "AUTH_INVALID";
  if (status === 423) return "AUTH_LOCKED";
  if (status === 429) return "AUTH_TOO_MANY_ATTEMPTS";
  if (status >= 500) return "AUTH_SERVER_ERROR";
  // default for unexpected status
  return "AUTH_SERVER_ERROR";
}

export function mapAuthErrorToMessage(err: unknown): MessageCode {
  // If your app throws AxiosError / Fetch errors differently, adapt here
  // Basic network/offline fallback:
  if (err instanceof TypeError) {
    // often fetch network failure
    return "AUTH_NETWORK_ERROR";
  }
  return "AUTH_SERVER_ERROR";
}
