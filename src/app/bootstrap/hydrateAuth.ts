/**
 * Hydrate Auth Stores
 *
 * Restores authentication state from localStorage on app startup
 * for both Learner and CMS portals
 */

import { useLearnerAuthStore } from "@/stores/auth/learnerAuth.store";
import { useCmsAuthStore } from "@/stores/auth/cmsAuth.store";

export function hydrateAuth() {
  // Restore learner auth state
  useLearnerAuthStore.getState().hydrate();

  // Restore CMS auth state
  useCmsAuthStore.getState().hydrate();
}
