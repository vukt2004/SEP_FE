/**
 * Hydrate Auth Stores
 *
 * Restores authentication state from localStorage on app startup
 * for both Student and CMS portals
 */

import { useStudentAuthStore } from "@/stores/auth/studentAuth.store";
import { useCmsAuthStore } from "@/stores/auth/cmsAuth.store";

export function hydrateAuth() {
  // Restore student auth state
  useStudentAuthStore.getState().hydrate();

  // Restore CMS auth state
  useCmsAuthStore.getState().hydrate();
}
