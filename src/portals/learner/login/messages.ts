// src/portals/learner/login/messages.ts

export type MessageType = "idle" | "hint" | "error" | "loading" | "success";
export type MessageScope = "field" | "form" | "system";
export type FieldKey = "email" | "password";

export type MessageCode =
  // Idle
  | "IDLE_WELCOME"
  | "IDLE_READY"
  // Hint
  | "HINT_EMAIL_EXAMPLE"
  | "HINT_PASSWORD_PRIVACY"
  | "HINT_CAPSLOCK_ON"
  | "HINT_FORGOT_PASSWORD"
  // Validation errors
  | "VALID_REQUIRED_EMAIL"
  | "VALID_INVALID_EMAIL_FORMAT"
  | "VALID_REQUIRED_PASSWORD"
  | "VALID_PASSWORD_MINLEN"
  // Auth / API errors
  | "AUTH_INVALID"
  | "AUTH_LOCKED"
  | "AUTH_TOO_MANY_ATTEMPTS"
  | "AUTH_SERVER_ERROR"
  | "AUTH_NETWORK_ERROR"
  // Flow
  | "AUTH_LOADING"
  | "AUTH_SUCCESS";

export type UiMessage = {
  type: MessageType;
  text: string;
  code: MessageCode;
  scope: MessageScope;
  field?: FieldKey;
  /** Higher = more important */
  priority: number;
  /** Optional auto-hide for non-critical messages */
  ttlMs?: number;
};

type MessageTemplate = Omit<UiMessage, "code">;

/**
 * Priority convention:
 *  1000: loading
 *  900 : field error
 *  850 : form error
 *  800 : system error
 *  600 : success
 *  300 : hint
 *  100 : idle
 */
export const COPY: Record<MessageCode, MessageTemplate> = {
  // Idle
  IDLE_WELCOME: {
    type: "idle",
    scope: "system",
    text: "Hi Captain! Are you ready to log in?",
    priority: 100,
    ttlMs: 3500,
  },
  IDLE_READY: {
    type: "idle",
    scope: "system",
    text: "I'm here. Just enter your information!",
    priority: 100,
    ttlMs: 3500,
  },

  // Hint
  HINT_EMAIL_EXAMPLE: {
    type: "hint",
    scope: "field",
    field: "email",
    text: "Please, enter your email address (e.g., name@domain.com).",
    priority: 300,
    ttlMs: 4000,
  },
  HINT_PASSWORD_PRIVACY: {
    type: "hint",
    scope: "field",
    field: "password",
    text: "Please enter the password, and I'll look somewhere else. Promise.",
    priority: 300,
    ttlMs: 4000,
  },
  HINT_CAPSLOCK_ON: {
    type: "hint",
    scope: "field",
    field: "password",
    text: " Captain, Caps Lock is on. Be careful not to enter the wrong password.",
    priority: 320,
    ttlMs: 4500,
  },
  HINT_FORGOT_PASSWORD: {
    type: "hint",
    scope: "form",
    text: "Captain, are you having trouble logging in? Click on the “Forgot password” link if you need help.",
    priority: 300,
    ttlMs: 4500,
  },

  // Validation errors
  VALID_REQUIRED_EMAIL: {
    type: "error",
    scope: "field",
    field: "email",
    text: "Missing email Captain.",
    priority: 900,
  },
  VALID_INVALID_EMAIL_FORMAT: {
    type: "error",
    scope: "field",
    field: "email",
    text: "This email appears to be incorrectly formatted. Please check and try again.",
    priority: 900,
  },
  VALID_REQUIRED_PASSWORD: {
    type: "error",
    scope: "field",
    field: "password",
    text: "You haven't entered a password.",
    priority: 900,
  },
  VALID_PASSWORD_MINLEN: {
    type: "error",
    scope: "field",
    field: "password",
    text: "Your password is too short. Please enter a longer password, at least 6 characters.",
    priority: 900,
  },

  // Auth / API errors
  AUTH_INVALID: {
    type: "error",
    scope: "form",
    text: "Invalid email or password. Please try again.",
    priority: 850,
  },
  AUTH_LOCKED: {
    type: "error",
    scope: "form",
    text: "Your account is temporarily locked. Please try again later.",
    priority: 850,
  },
  AUTH_TOO_MANY_ATTEMPTS: {
    type: "error",
    scope: "form",
    text: "You've tried too many times. Please take a break and try logging in again later.",
    priority: 850,
  },
  AUTH_SERVER_ERROR: {
    type: "error",
    scope: "system",
    text: "The system is malfunctioning. I'll try again in a few minutes.",
    priority: 800,
  },
  AUTH_NETWORK_ERROR: {
    type: "error",
    scope: "system",
    text: "No network or weak connection. Please check your internet connection.",
    priority: 800,
  },

  // Flow
  AUTH_LOADING: {
    type: "loading",
    scope: "form",
    text: "Preparing for launch…",
    priority: 1000,
  },
  AUTH_SUCCESS: {
    type: "success",
    scope: "form",
    text: "OK! Let's take off! 🚀",
    priority: 600,
    ttlMs: 2000,
  },
};

export function buildMessage(code: MessageCode, overrides?: Partial<UiMessage>): UiMessage {
  const tpl = COPY[code];
  return {
    code,
    ...tpl,
    ...overrides,
  };
}
