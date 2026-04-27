// src/services/api/learner/profile.api.ts
import { learnerAxios } from "@/services/http/axios.learner";

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
  /** Profile wall / cover image URL from API. */
  coverImagePath?: string | null;
  learnerCode?: string | null;
  teacherCode?: string | null;
  position?: string | null;
  hireDate?: string | null;
  salary?: number | null;
};

export type MyXpProfileResponse = {
  userId: string;
  currentXp: number;
  currentLevel: number;
  nextLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
};

export type ApiResult<T> = {
  isSuccess: boolean;
  message?: string | null;
  data?: T;
  errors?: string[] | null;
  errorCode?: string | null;
};

export const learnerProfileApi = {
  getProfile: async () => {
    const { data } = await learnerAxios.get<ApiResult<ProfileResponse>>("/api/learner/auth/profile");
    return data;
  },

  updateProfile: async (payload: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    avatarFile?: File | null;
    coverImageFile?: File | null;
  }) => {
    const fd = new FormData();
    fd.append("FirstName", payload.firstName);
    fd.append("LastName", payload.lastName);
    fd.append("PhoneNumber", payload.phoneNumber);
    if (payload.avatarFile) fd.append("avatarFile", payload.avatarFile);
    if (payload.coverImageFile) fd.append("coverImageFile", payload.coverImageFile);

    const { data } = await learnerAxios.put<ApiResult<ProfileResponse>>(
      "/api/learner/auth/profile",
      fd,
      {
      headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },

  getMyXpProfile: async () => {
    const { data } = await learnerAxios.get<ApiResult<MyXpProfileResponse>>("/api/learner/xp/profile");
    return data;
  },
};
