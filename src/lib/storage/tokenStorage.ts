const LEARNER_TOKEN_KEY = "qo_learner_token";
const CMS_TOKEN_KEY = "qo_cms_token";

export const tokenStorage = {
  // Learner
  getLearnerToken: () => localStorage.getItem(LEARNER_TOKEN_KEY),
  setLearnerToken: (token: string) => localStorage.setItem(LEARNER_TOKEN_KEY, token),
  removeLearnerToken: () => localStorage.removeItem(LEARNER_TOKEN_KEY),

  // CMS
  getCmsToken: () => localStorage.getItem(CMS_TOKEN_KEY),
  setCmsToken: (token: string) => localStorage.setItem(CMS_TOKEN_KEY, token),
  removeCmsToken: () => localStorage.removeItem(CMS_TOKEN_KEY),
};
