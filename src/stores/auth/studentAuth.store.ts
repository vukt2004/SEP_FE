// src/stores/auth/studentAuth.store.ts
import { create } from "zustand";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { studentAuthApi } from "@/services/api/student/auth.api";

interface StudentAuthState {
  token: string | null;
  isAuthenticated: boolean;

  setToken: (token: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;

  // hydrate có thể bỏ luôn, hoặc giữ cho backward-compat (không cần dùng ở guard nữa)
  hydrate: () => void;
}

const bootToken = tokenStorage.getStudentToken(); // 👈 đọc ngay khi load app

export const useStudentAuthStore = create<StudentAuthState>((set) => ({
  token: bootToken,
  isAuthenticated: !!bootToken,

  setToken: (token) => {
    tokenStorage.setStudentToken(token);
    set({ token, isAuthenticated: true });
  },

  hydrate: () => {
    const token = tokenStorage.getStudentToken();
    set({ token, isAuthenticated: !!token });
  },

  login: async (email, password) => {
    const res = await studentAuthApi.login({ email, password, grantType: 0 });

    if (!res.data.isSuccess) throw new Error(res.data.message ?? "Login failed");

    const token = res.data.data?.accessToken ?? null;
    if (!token) throw new Error("Missing accessToken");

    tokenStorage.setStudentToken(token);
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    tokenStorage.removeStudentToken();
    set({ token: null, isAuthenticated: false });
  },
}));
