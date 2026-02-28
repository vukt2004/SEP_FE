import { axiosBase } from "./axios.base";
import { tokenStorage } from "@/lib/storage/tokenStorage";

export const studentAxios = axiosBase.create();

studentAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getStudentToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
