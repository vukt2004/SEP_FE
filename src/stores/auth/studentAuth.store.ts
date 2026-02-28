import { create } from "zustand";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { studentAuthApi } from "@/services/api/student/auth.api";

interface StudentAuthState {
  token: string | null;
  isAuthenticated: boolean;

  // Phase 0 thêm: để Verify page set token trực tiếp khi BE trả token
  setToken: (token: string) => void;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useStudentAuthStore = create<StudentAuthState>((set) => ({
  token: null,
  isAuthenticated: false,

  setToken: (token) => {
    tokenStorage.setStudentToken(token);
    set({ token, isAuthenticated: true });
  },

  hydrate: () => {
    const token = tokenStorage.getStudentToken();
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },

  login: async (email, password) => {
    const res = await studentAuthApi.login({ email, password, grantType: 0 });

    if (!res.data.isSuccess) {
      throw new Error(res.data.message ?? "Login failed");
    }

    const token = res.data.data?.accessToken ?? null;
    if (!token) {
      throw new Error("Missing accessToken");
    }

    tokenStorage.setStudentToken(token);

    set({
      token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    tokenStorage.removeStudentToken();
    set({ token: null, isAuthenticated: false });
  },
}));
