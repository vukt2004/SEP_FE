import { create } from "zustand";
import { cmsAuthApi } from "@/services/api/cms/auth.api";
import { tokenStorage } from "@/lib/storage/tokenStorage";

type CmsRole = "admin" | "mod";

interface CmsAuthState {
  token: string | null;
  role: CmsRole | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  login: async (email, password) => {
    const res = await cmsAuthApi.login({ email, password });

    const token = res.data.data?.accessToken;
    const roles = res.data.data?.roles;

    if (!token) {
      throw new Error("Login failed: No token received");
    }

    tokenStorage.setCmsToken(token);

    // Determine role from roles array (admin takes precedence)
    const role: CmsRole = roles?.includes("admin") ? "admin" : "mod";

    set({
      token,
      role,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await cmsAuthApi.logout();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      tokenStorage.removeCmsToken();
      set({ token: null, role: null, isAuthenticated: false });
    }
  },
}));
