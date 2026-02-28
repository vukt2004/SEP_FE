const STUDENT_TOKEN_KEY = "qo_student_token";
const CMS_TOKEN_KEY = "qo_cms_token";

export const tokenStorage = {
  // Student
  getStudentToken: () => localStorage.getItem(STUDENT_TOKEN_KEY),
  setStudentToken: (token: string) => localStorage.setItem(STUDENT_TOKEN_KEY, token),
  removeStudentToken: () => localStorage.removeItem(STUDENT_TOKEN_KEY),

  // CMS
  getCmsToken: () => localStorage.getItem(CMS_TOKEN_KEY),
  setCmsToken: (token: string) => localStorage.setItem(CMS_TOKEN_KEY, token),
  removeCmsToken: () => localStorage.removeItem(CMS_TOKEN_KEY),
};
