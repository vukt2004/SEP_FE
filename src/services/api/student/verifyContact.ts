// src/portals/student/auth/verifyContact.ts
const KEY = "student_verify_contact";

export function setVerifyContact(contact: string) {
  sessionStorage.setItem(KEY, contact);
}

export function getVerifyContact(): string | null {
  return sessionStorage.getItem(KEY);
}

export function clearVerifyContact() {
  sessionStorage.removeItem(KEY);
}
