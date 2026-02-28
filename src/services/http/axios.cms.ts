import { axiosBase } from "./axios.base";
import { tokenStorage } from "@/lib/storage/tokenStorage";

export const cmsAxios = axiosBase.create();

cmsAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getCmsToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
