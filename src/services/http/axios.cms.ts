import type { AxiosError } from "axios";
import { axiosBase } from "./axios.base";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { ROUTES } from "@/lib/constants/routes";
import type { AuthResponseResult } from "@/types/api/cms/auth";

export const cmsAxios = axiosBase.create();

/** Endpoints that must not receive Bearer (e.g. login). Refresh-token should receive current token (even expired). */
function isLoginOnlyEndpoint(url?: string): boolean {
  return /auth\/login/.test(url ?? "");
}

cmsAxios.interceptors.request.use((config) => {
  if (isLoginOnlyEndpoint(config.url)) {
    config.withCredentials = true;
    return config;
  }

  const token = tokenStorage.getCmsToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = cmsAxios
    .post<AuthResponseResult>("/api/cms/auth/refresh-token", undefined, {
      withCredentials: true,
    })
    .then((res) => {
      refreshPromise = null;
      const token = res.data?.data?.accessToken;
      if (!token) throw new Error("No token in refresh response");
      tokenStorage.setCmsToken(token);
      return token;
    })
    .catch((err) => {
      refreshPromise = null;
      tokenStorage.removeCmsToken();
      if (typeof window !== "undefined") {
        window.location.href = ROUTES.CMS_LOGIN;
      }
      throw err;
    });

  return refreshPromise;
}

cmsAxios.interceptors.response.use(
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
      return cmsAxios.request(config);
    });
  },
);
