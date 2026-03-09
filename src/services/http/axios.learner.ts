import { axiosBase } from "./axios.base";
import { tokenStorage } from "@/lib/storage/tokenStorage";

export const learnerAxios = axiosBase.create();

learnerAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getLearnerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
