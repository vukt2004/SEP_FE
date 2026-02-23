import { create } from "zustand";
import { cmsAxios } from "@/services/http/axios.cms";
import { tokenStorage } from "@/lib/storage/tokenStorage";

type CmsRole = "admin" | "mod";

interface CmsAuthState {
  token: string | null;
  role: CmsRole | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useCmsAuthStore = create<CmsAuthState>((set) => ({
  token: null,
  role: null,
  isAuthenticated: false,

  hydrate: () => {
    const token = tokenStorage.getCmsToken();
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },

  login: async (username, password) => {
    const res = await cmsAxios.post("/api/cms/auth/login", {
      username,
      password,
    });

    const token = res.data.data.token;
    const role = res.data.data.role;

    tokenStorage.setCmsToken(token);

    set({
      token,
      role,
      isAuthenticated: true,
    });
  },

  logout: () => {
    tokenStorage.removeCmsToken();
    set({ token: null, role: null, isAuthenticated: false });
  },
}));
