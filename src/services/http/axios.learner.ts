import type { AxiosError } from "axios";
import { axiosBase } from "./axios.base";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { ROUTES } from "@/lib/constants/routes";
import type { AuthResponseResult } from "@/types/api/learner/auth";
import { notifyApiError, notifyApiSuccess } from "@/services/http/apiToast";

export const learnerAxios = axiosBase.create();

/** Endpoints that must not receive Bearer (e.g. login, register). Refresh-token should receive current token (even expired). */
function isLoginOnlyEndpoint(url?: string): boolean {
  return /auth\/login|auth\/register|auth\/verify-otp|auth\/google|auth\/login\/google/.test(
    url ?? "",
  );
}

function isRefreshTokenEndpoint(url?: string): boolean {
  // Used to prevent the response interceptor from trying to refresh when refreshing fails.
  return /auth\/refresh-token/.test(url ?? "");
}

learnerAxios.interceptors.request.use((config) => {
  if (isLoginOnlyEndpoint(config.url)) {
    config.withCredentials = true;
    return config;
  }

  const token = tokenStorage.getLearnerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = learnerAxios
    .post<AuthResponseResult>("/api/learner/auth/refresh-token", undefined, {
      withCredentials: true,
    })
    .then((res) => {
      refreshPromise = null;
      const token =
        (res.data as { data?: { accessToken?: string }; accessToken?: string })?.data
          ?.accessToken ?? (res.data as { accessToken?: string })?.accessToken;
      if (!token) throw new Error("No token in refresh response");
      tokenStorage.setLearnerToken(token);
      return token;
    })
    .catch((err) => {
      refreshPromise = null;
      tokenStorage.removeLearnerToken();
      if (typeof window !== "undefined") {
        window.location.href = ROUTES.LEARNER_LOGIN;
      }
      throw err;
    });
  return refreshPromise;
}

learnerAxios.interceptors.response.use(
  (response) => {
    notifyApiSuccess(response);
    return response;
  },
  (error: AxiosError) => {
    const config = error.config;
    if (!config || !error.response || error.response.status !== 401) {
      notifyApiError(error);
      return Promise.reject(error);
    }

    // Never retry/refresh on endpoints that should not be handled here.
    // In particular, if `/refresh-token` itself returns 401 (refresh token expired),
    // we must let `doRefresh()` handle the logout/redirect.
    if (isLoginOnlyEndpoint(config.url) || isRefreshTokenEndpoint(config.url)) {
      notifyApiError(error);
      return Promise.reject(error);
    }

    // Avoid infinite retry loops for the same request.
    if ((config as { _retry?: boolean })._retry) {
      // If we already tried refresh once and still got 401, treat it as an auth failure.
      tokenStorage.removeLearnerToken();
      if (typeof window !== "undefined") {
        window.location.href = ROUTES.LEARNER_LOGIN;
      }
      notifyApiError(error);
      return Promise.reject(error);
    }
    (config as { _retry?: boolean })._retry = true;

    return doRefresh().then((newToken) => {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${newToken}`;
      return learnerAxios.request(config);
    });
  },
);
