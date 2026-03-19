// src/stores/auth/learnerAuth.store.ts
import { create } from "zustand";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { learnerAuthApi } from "@/services/api/learner/auth.api";

interface LearnerAuthState {
  token: string | null;
  isAuthenticated: boolean;

  setToken: (token: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;

  // hydrate có thể bỏ luôn, hoặc giữ cho backward-compat (không cần dùng ở guard nữa)
  hydrate: () => void;
}

const bootToken = tokenStorage.getLearnerToken(); // 👈 đọc ngay khi load app

export const useLearnerAuthStore = create<LearnerAuthState>((set) => ({
  token: bootToken,
  isAuthenticated: !!bootToken,

  setToken: (token) => {
    tokenStorage.setLearnerToken(token);
    set({ token, isAuthenticated: true });
  },

  hydrate: () => {
    const token = tokenStorage.getLearnerToken();
    set({ token, isAuthenticated: !!token });
  },

  login: async (email, password) => {
    const res = await learnerAuthApi.login({ email, password, grantType: 0 });

    if (!res.data.isSuccess) throw new Error(res.data.message ?? "Login failed");

    const token = res.data.data?.accessToken ?? null;
    if (!token) throw new Error("Missing accessToken");

    tokenStorage.setLearnerToken(token);
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    tokenStorage.removeLearnerToken();
    set({ token: null, isAuthenticated: false });
  },
}));
