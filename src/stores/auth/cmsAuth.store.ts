import { create } from "zustand";
import { cmsAuthApi } from "@/services/api/cms/auth.api";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { resolveCmsRole, type CmsRole } from "@/lib/auth/role";

interface CmsAuthState {
  token: string | null;
  role: CmsRole | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<CmsRole>;
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
      const role = resolveCmsRole(null, token);
      if (role) {
        set({ token, role, isAuthenticated: true });
        return;
      }

      tokenStorage.removeCmsToken();
    }

    set({ token: null, role: null, isAuthenticated: false });
  },

  login: async (email, password) => {
    const res = await cmsAuthApi.login({ email, password });

    const token = res.data.data?.accessToken;
    const roles = res.data.data?.roles;

    if (!token) {
      throw new Error("Login failed: No token received");
    }

    tokenStorage.setCmsToken(token);

    const role = resolveCmsRole(roles, token);
    if (!role) {
      tokenStorage.removeCmsToken();
      throw new Error("Login failed: Account does not have CMS role");
    }

    set({
      token,
      role,
      isAuthenticated: true,
    });

    return role;
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
