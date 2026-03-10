import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // ✅ add Link
import { useLearnerAuthStore } from "@/stores/auth/learnerAuth.store";
import { ROUTES } from "@/lib/constants/routes";

import Starfield from "../components/login/Starfield";
import OrbitBlocks from "../components/login/OrbitBlocks";
import PixelConfetti from "../components/login/PixelConfetti";
import styles from "../components/login/LoginScene.module.css";
import LoginLoadingOverlay from "../components/login/LoginLoadingOverlay";
import DuckSpeechBubble from "../components/login/DuckSpeechBubble";
import { selectDuckMode } from "../login/duckMode";
import DuckAstronaut from "../components/login/DuckAstronaut";

import type { FieldKey, MessageCode } from "../login/messages";
import { buildMessage } from "../login/messages";
import { validateForm, firstErrorField } from "../login/validation";
import { mapAuthErrorToMessage, mapAuthStatusToMessage } from "../login/authError";
import { selectTopBubbleMessage } from "../login/messageSelector";
import LoginAriaAnnouncer from "../components/login/LoginAriaAnnouncer";

type LoginValues = { email: string; password: string };
type FieldErrors = Partial<Record<FieldKey, MessageCode>>;

type AuthFormErrorCode = Extract<
  MessageCode,
  "AUTH_INVALID" | "AUTH_LOCKED" | "AUTH_TOO_MANY_ATTEMPTS"
>;
type AuthSystemErrorCode = Extract<MessageCode, "AUTH_SERVER_ERROR" | "AUTH_NETWORK_ERROR">;

type ApiErrorLike = { status: number };
type AxiosLikeError = { response: { status: number } };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isApiErrorLike(x: unknown): x is ApiErrorLike {
  return isRecord(x) && typeof x.status === "number";
}
function isAxiosLikeError(x: unknown): x is AxiosLikeError {
  return (
    isRecord(x) &&
    isRecord(x.response) &&
    typeof (x.response as Record<string, unknown>).status === "number"
  );
}
function getHttpStatus(err: unknown): number | null {
  if (isApiErrorLike(err)) return err.status;
  if (isAxiosLikeError(err)) return err.response.status;
  return null;
}
function isAuthFormError(code: MessageCode): code is AuthFormErrorCode {
  return code === "AUTH_INVALID" || code === "AUTH_LOCKED" || code === "AUTH_TOO_MANY_ATTEMPTS";
}
function isAuthSystemError(code: MessageCode): code is AuthSystemErrorCode {
  return code === "AUTH_SERVER_ERROR" || code === "AUTH_NETWORK_ERROR";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const login = useLearnerAuthStore((s) => s.login);

  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });

  const infoMessage = (location.state as { info?: string } | null)?.info ?? null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false); // ✅ add
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrorCode, setFormErrorCode] = useState<AuthFormErrorCode | null>(null);
  const [systemErrorCode, setSystemErrorCode] = useState<AuthSystemErrorCode | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  useEffect(() => {
    if (!confetti) return;
    const t = window.setTimeout(() => setConfetti(false), 800);
    return () => window.clearTimeout(t);
  }, [confetti]);

  const bubble = useMemo(
    () =>
      selectTopBubbleMessage({
        isSubmitting: isSubmitting || isGoogleSubmitting, // ✅ include google
        isSuccess,
        focusedField,
        capsLockOn,
        fieldErrors,
        formErrorCode,
        systemErrorCode,
      }),
    [
      isSubmitting,
      isGoogleSubmitting,
      isSuccess,
      focusedField,
      capsLockOn,
      fieldErrors,
      formErrorCode,
      systemErrorCode,
    ],
  );

  const duckMode = useMemo(
    () =>
      selectDuckMode({
        isSubmitting: isSubmitting || isGoogleSubmitting, // ✅ include google
        isSuccess,
        focusedField,
        fieldErrors,
        formErrorCode,
        systemErrorCode,
      }),
    [
      isSubmitting,
      isGoogleSubmitting,
      isSuccess,
      focusedField,
      fieldErrors,
      formErrorCode,
      systemErrorCode,
    ],
  );

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 520);
  }

  function clearNonFieldErrors() {
    setFormErrorCode(null);
    setSystemErrorCode(null);
  }

  function setField<K extends keyof LoginValues>(key: K, value: LoginValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));

    setFieldErrors((prev) => {
      const fk = key as FieldKey;
      if (!prev[fk]) return prev;
      const next: FieldErrors = { ...prev };
      delete next[fk];
      return next;
    });

    clearNonFieldErrors();
  }

  // ✅ Google OAuth redirect (frontend chỉ cần bấm -> redirect)
  const GOOGLE_OAUTH_URL =
    import.meta.env.VITE_GOOGLE_OAUTH_URL ??
    `${import.meta.env.VITE_API_BASE_URL ?? ""}/auth/google`;

  const handleGoogleLogin = () => {
    if (isSubmitting || isGoogleSubmitting) return;

    clearNonFieldErrors();
    setIsGoogleSubmitting(true);

    // Nếu BE dùng endpoint khác, đổi lại GOOGLE_OAUTH_URL cho đúng.
    window.location.assign(GOOGLE_OAUTH_URL);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || isGoogleSubmitting) return;

    setIsSuccess(false);

    const { fieldErrors: fe } = validateForm(values);
    setFieldErrors(fe);

    const first = firstErrorField(fe);
    if (first) {
      triggerShake();
      if (first === "email") emailRef.current?.focus();
      if (first === "password") passRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    clearNonFieldErrors();

    try {
      await login(values.email, values.password);

      setIsSuccess(true);
      setConfetti(true);
      setShowLoading(true);
      setLoadingStep(0);

      await sleep(260);
      setLoadingStep(1);
      await sleep(280);
      setLoadingStep(2);
      await sleep(320);
      setLoadingStep(3);
      await sleep(180);

      navigate(ROUTES.LEARNER_HOME);
    } catch (err: unknown) {
      triggerShake();

      const status = getHttpStatus(err);
      const code: MessageCode =
        typeof status === "number" ? mapAuthStatusToMessage(status) : mapAuthErrorToMessage(err);

      if (isAuthFormError(code)) {
        setFormErrorCode(code);
        if (code === "AUTH_INVALID") passRef.current?.focus();
      } else if (isAuthSystemError(code)) {
        setSystemErrorCode(code);
      } else {
        setSystemErrorCode("AUTH_SERVER_ERROR");
      }
    } finally {
      setIsSubmitting(false);
      setShowLoading(false);
    }
  };

  const pageStyle = {
    ["--accent" as const]: "#2563EB",
  } as React.CSSProperties;

  return (
    <>
      <div className="login-page" style={pageStyle}>
        <LoginAriaAnnouncer message={bubble} />
        <div className={styles.sceneRoot} aria-hidden="true">
          <Starfield />
        </div>

        <div className="login-duck" style={{ position: "relative", overflow: "visible" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,0.25)" }} />

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
            <OrbitBlocks />
          </div>

          <div className="login-duck-content" style={{ position: "relative" }}>
            <h1 style={{ color: "#2563EB", marginBottom: 8, fontSize: 80 }}>QuackOrbit</h1>
            <p style={{ maxWidth: 420 }}>
              Learn logic through fun 2D gameplay. Build skills while exploring levels.
            </p>

            <div style={{ marginTop: 18, position: "relative", minHeight: 340 }}>
              <DuckSpeechBubble
                key={`${bubble.code}:${String(bubble.type)}`}
                message={bubble}
                placement="top-center"
              />
              <DuckAstronaut mode={duckMode} />
            </div>
          </div>
        </div>

        <div className="login-form-wrapper" style={{ position: "relative" }}>
          <div
            className="hidden md:block"
            style={{ position: "absolute", inset: "-48px", pointerEvents: "none", opacity: 0.9 }}
            aria-hidden="true"
          >
            <OrbitBlocks />
          </div>

          <div
            className={["login-card", shake ? styles.shake : ""].join(" ")}
            style={{ position: "relative" }}
          >
            {(isSubmitting || isGoogleSubmitting) && (
              <div className={styles.loadingBarWrap} aria-hidden="true">
                <div className={styles.loadingBar} />
              </div>
            )}

            <PixelConfetti show={confetti} />

            <h2>Learner Login</h2>

            {infoMessage ? (
              <div
                role="status"
                style={{
                  margin: "8px 0",
                  fontSize: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(37,99,235,0.10)",
                  border: "1px solid rgba(37,99,235,0.25)",
                  color: "#ff7402",
                }}
              >
                {infoMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <input
                ref={emailRef}
                className="login-input"
                placeholder="Email"
                value={values.email}
                onChange={(e) => setField("email", e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                disabled={isSubmitting || isGoogleSubmitting}
              />
              {fieldErrors.email ? (
                <div
                  id="login-email-error"
                  role="alert"
                  style={{ marginTop: 6, fontSize: 12, color: "crimson" }}
                >
                  {buildMessage(fieldErrors.email).text}
                </div>
              ) : null}

              <input
                ref={passRef}
                className="login-input"
                type="password"
                placeholder="Password"
                value={values.password}
                onChange={(e) => setField("password", e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => {
                  setFocusedField(null);
                  setCapsLockOn(false);
                }}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState?.("CapsLock") ?? false)}
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                disabled={isSubmitting || isGoogleSubmitting}
              />
              {fieldErrors.password ? (
                <div
                  id="login-password-error"
                  role="alert"
                  style={{ marginTop: 6, fontSize: 12, color: "crimson" }}
                >
                  {buildMessage(fieldErrors.password).text}
                </div>
              ) : null}

              <button
                type="submit"
                className="login-button"
                style={{ backgroundColor: "#2563EB" }}
                disabled={isSubmitting || isGoogleSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* ✅ Register navigation */}
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                display: "flex",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span style={{ color: "#A7B0C0" }}>Don't have an account yet?</span>
              <Link
                to={ROUTES.LEARNER_REGISTER}
                style={{ color: "#2563EB", fontWeight: 700, textDecoration: "none" }}
              >
                Create Account
              </Link>
            </div>

            {/* ✅ Divider (đặt dưới register) */}
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "14px 0 10px",
                opacity: 0.9,
              }}
            >
              <div style={{ height: 1, background: "rgba(229,231,235,0.18)", flex: 1 }} />
              <div style={{ fontSize: 12, color: "#A7B0C0" }}>or</div>
              <div style={{ height: 1, background: "rgba(229,231,235,0.18)", flex: 1 }} />
            </div>

            {/* ✅ Google login button (xuống dưới) */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="login-button"
              disabled={isSubmitting || isGoogleSubmitting}
              style={{
                backgroundColor: "transparent",
                border: "1px solid rgba(229,231,235,0.25)",
                color: "#E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {/* Google logo (inline SVG) */}
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.73 1.22 9.25 3.61l6.9-6.9C35.97 2.39 30.45 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.02 6.23C12.55 13.27 17.8 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.7c-.55 2.93-2.2 5.41-4.7 7.08l7.22 5.6C43.73 37.29 46.5 31.43 46.5 24.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.58 28.55A14.47 14.47 0 0 1 9.5 24c0-1.58.27-3.11.76-4.55l-8.02-6.23A23.95 23.95 0 0 0 0 24c0 3.89.93 7.57 2.56 10.78l8.02-6.23z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.45 0 11.97-2.13 15.96-5.78l-7.22-5.6c-2 1.35-4.57 2.15-8.74 2.15-6.2 0-11.45-3.77-13.42-9.05l-8.02 6.23C6.51 42.62 14.62 48 24 48z"
                />
              </svg>

              {isGoogleSubmitting ? "Redirecting..." : "Continue with Google"}
            </button>

            <div className="login-footer">Continue your learning journey</div>
          </div>
        </div>
      </div>

      <LoginLoadingOverlay show={showLoading} step={loadingStep} />
    </>
  );
}
