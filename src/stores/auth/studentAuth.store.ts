import { create } from "zustand";
import { studentAxios } from "@/services/http/axios.student";
import { tokenStorage } from "@/lib/storage/tokenStorage";

interface StudentAuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useStudentAuthStore = create<StudentAuthState>((set) => ({
  token: null,
  isAuthenticated: false,

  hydrate: () => {
    const token = tokenStorage.getStudentToken();
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },

  login: async (email, password) => {
    const res = await studentAxios.post("/api/student/auth/login", {
      email,
      password,
    });

    const token = res.data.data.token;

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
