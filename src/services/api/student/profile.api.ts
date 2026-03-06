// src/services/api/student/profile.api.ts
import axios from "axios";
import { tokenStorage } from "@/lib/storage/tokenStorage";

export type ProfileResponse = {
  email?: string | null;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null; // date-time
  bio?: string | null;
  avatarPath?: string | null;
  learnerCode?: string | null;
  teacherCode?: string | null;
  position?: string | null;
  hireDate?: string | null;
  salary?: number | null;
};

export type ApiResult<T> = {
  isSuccess: boolean;
  message?: string | null;
  data?: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

// Nếu project bạn đã có axios instance sẵn (vd: httpClient), bạn thay axios.create(...) bằng instance đó.
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // đảm bảo env này tồn tại
});

http.interceptors.request.use((config) => {
  const token = tokenStorage.getStudentToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const studentProfileApi = {
  getProfile: async () => {
    const { data } = await http.get<ApiResult<ProfileResponse>>("/api/learner/auth/profile");
    return data;
  },

  updateProfile: async (payload: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    avatarFile?: File | null;
  }) => {
    const fd = new FormData();
    fd.append("FirstName", payload.firstName);
    fd.append("LastName", payload.lastName);
    fd.append("PhoneNumber", payload.phoneNumber);
    if (payload.avatarFile) fd.append("avatarFile", payload.avatarFile);

    const { data } = await http.put<ApiResult<ProfileResponse>>("/api/learner/auth/profile", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
