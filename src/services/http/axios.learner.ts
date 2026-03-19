import type { AxiosError } from "axios";
import { axiosBase } from "./axios.base";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { ROUTES } from "@/lib/constants/routes";
import type { AuthResponseResult } from "@/types/api/learner/auth";

export const learnerAxios = axiosBase.create();

/** Endpoints that must not receive Bearer (e.g. login, register). Refresh-token should receive current token (even expired). */
function isLoginOnlyEndpoint(url?: string): boolean {
  return /auth\/login|auth\/register|auth\/verify-otp/.test(url ?? "");
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
        (res.data as { data?: { accessToken?: string }; accessToken?: string })?.data?.accessToken ??
        (res.data as { accessToken?: string })?.accessToken;
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
  (response) => response,
  (error: AxiosError) => {
    const config = error.config;
    if (!config || !error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }
    if (isLoginOnlyEndpoint(config.url)) {
      return Promise.reject(error);
    }
    return doRefresh().then((newToken) => {
      config.headers.Authorization = `Bearer ${newToken}`;
      return learnerAxios.request(config);
    });
  },
);
