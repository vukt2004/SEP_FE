import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentAuthStore } from "@/stores/auth/studentAuth.store";
import { ROUTES } from "@/lib/constants/routes";

import Starfield from "../components/login/Starfield";
import OrbitBlocks from "../components/login/OrbitBlocks";
import PixelConfetti from "../components/login/PixelConfetti";
import styles from "../components/login/LoginScene.module.css";
import LoginLoadingOverlay from "../components/login/LoginLoadingOverlay";
import DuckSpeechBubble from "../components/login/DuckSpeechBubble";
import { selectDuckMode } from "../login/duckMode";
import DuckAstronaut from "../components/login/DuckAstronaut";

// ===== Message System (A) =====
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
  const login = useStudentAuthStore((s) => s.login);

  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });

  // micro-interactions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // message system state
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
        isSubmitting,
        isSuccess,
        focusedField,
        capsLockOn,
        fieldErrors,
        formErrorCode,
        systemErrorCode,
      }),
    [
      isSubmitting,
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
        isSubmitting,
        isSuccess,
        focusedField,
        fieldErrors,
        formErrorCode,
        systemErrorCode,
      }),
    [isSubmitting, isSuccess, focusedField, fieldErrors, formErrorCode, systemErrorCode],
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

    // clear field error as user edits that field
    setFieldErrors((prev) => {
      const fk = key as FieldKey;
      if (!prev[fk]) return prev;
      const next: FieldErrors = { ...prev };
      delete next[fk];
      return next;
    });

    // optional: clear form/system errors on any edit
    clearNonFieldErrors();
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSuccess(false);

    // ===== Client validation (A) =====
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
      // ===== Real API: store login(email, password) =====
      await login(values.email, values.password);

      // success micro + game-like loading
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

      navigate(ROUTES.STUDENT_HOME);
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
        // fallback safety
        setSystemErrorCode("AUTH_SERVER_ERROR");
      }
    } finally {
      setIsSubmitting(false);
      // nếu navigate nhanh, overlay tự mất theo route; nếu không navigate, đảm bảo tắt:
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
        {/* ====== SET 2: Parallax Starfield (nền tổng) ====== */}
        <div className={styles.sceneRoot} aria-hidden="true">
          <Starfield />
        </div>

        {/* LEFT: DUCK PANEL */}
        <div className="login-duck" style={{ position: "relative", overflow: "visible" }}>
          {/* overlay nhẹ để chữ/nhân vật nổi */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,0.25)" }} />

          {/* orbiting blocks (decor) */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
            <OrbitBlocks />
          </div>

          <div className="login-duck-content" style={{ position: "relative" }}>
            <h1 style={{ color: "#2563EB", marginBottom: 8 }}>QuackOrbit</h1>
            <p style={{ maxWidth: 420 }}>
              Learn logic through fun 2D gameplay. Build skills while exploring levels.
            </p>

            {/* Anchor bubble + duck */}
            <div style={{ marginTop: 18, position: "relative", minHeight: 340 }}>
              <DuckSpeechBubble
                key={`${bubble.code}:${String(bubble.type)}`}
                message={bubble}
                placement="top-center"
              />

              {/* Duck placeholder: thay bằng component vịt thật */}
              <DuckAstronaut mode={duckMode} />

              {/* TODO: <DuckAstronaut mode={...} /> */}
            </div>
          </div>
        </div>

        {/* FORM PANEL */}
        <div className="login-form-wrapper" style={{ position: "relative" }}>
          {/* orbit nhỏ phía sau card (nhẹ, không ảnh hưởng layout) */}
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
            {/* ====== SET 3: Loading bar khi submit ====== */}
            {isSubmitting && (
              <div className={styles.loadingBarWrap} aria-hidden="true">
                <div className={styles.loadingBar} />
              </div>
            )}

            {/* ====== SET 3: Pixel confetti khi success ====== */}
            <PixelConfetti show={confetti} />

            <h2>Student Login</h2>

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
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="login-footer">Continue your learning journey</div>
          </div>
        </div>
      </div>

      {/* ====== SET 4: Mini grid game “loading” khi submit ====== */}
      <LoginLoadingOverlay show={showLoading} step={loadingStep} />
    </>
  );
}
