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
import { useThemeStore } from "@/stores/theme.store";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";
import { Sun, Moon } from "lucide-react";

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
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const locale = useLanguageStore((s) => s.locale);
  const toggleLocale = useLanguageStore((s) => s.toggle);
  const t = getT(locale);
  const leftOverlayBg =
    theme === "light" ? "rgba(255,255,255,0.08)" : "rgba(2,6,23,0.25)";

  const login = useLearnerAuthStore((s) => s.login);
  const googleLogin = useLearnerAuthStore((s) => s.googleLogin);

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
  const isSubmittingRef = useRef(false);
  const isGoogleSubmittingRef = useRef(false);
  const [googleReady, setGoogleReady] = useState(false);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const rawGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleClientId = rawGoogleClientId
    ?.replace(/[\u200B-\u200D\uFEFF]/g, "")
    ?.replace(/^["']|["']$/g, "")
    ?.trim();

  const loadGoogleIdentityScript = async (): Promise<void> => {
    if ((window.google?.accounts as { oauth2?: unknown } | undefined)?.oauth2) {
      setGoogleReady(true);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        const waitUntilReady = () => {
          if ((window.google?.accounts as { oauth2?: unknown } | undefined)?.oauth2) {
            setGoogleReady(true);
            resolve();
            return;
          }
          window.setTimeout(waitUntilReady, 50);
        };
        waitUntilReady();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const waitUntilReady = () => {
          if ((window.google?.accounts as { oauth2?: unknown } | undefined)?.oauth2) {
            setGoogleReady(true);
            resolve();
            return;
          }
          window.setTimeout(waitUntilReady, 50);
        };
        waitUntilReady();
      };
      script.onerror = () => reject(new Error("Failed to load Google Identity script"));
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    isGoogleSubmittingRef.current = isGoogleSubmitting;
  }, [isGoogleSubmitting]);

  const completeGoogleLogin = async (idToken: string) => {
    if (!idToken) throw new Error("Missing Google credential");

    await googleLogin(idToken);

    setIsSuccess(true);
    setConfetti(true);
    setShowLoading(true);
    setLoadingStep(0);

    await sleep(220);
    setLoadingStep(1);
    await sleep(220);
    setLoadingStep(2);
    await sleep(260);
    setLoadingStep(3);
    await sleep(140);

    navigate(ROUTES.LEARNER_HOME);
  };

  useEffect(() => {
    if (!googleClientId) return;
    loadGoogleIdentityScript().catch((err) => {
      console.error("Google script load failed:", err);
      setGoogleReady(false);
    });
  }, [googleClientId]);

  const handleGoogleLogin = async () => {
    if (isSubmittingRef.current || isGoogleSubmittingRef.current) return;
    if (!googleClientId) {
      setSystemErrorCode("AUTH_SERVER_ERROR");
      return;
    }
    const oauth2 = (window.google?.accounts as { oauth2?: { initTokenClient: (opts: { client_id: string; scope: string; callback: (resp: { access_token?: string; error?: string }) => void; }) => { requestAccessToken: () => void; }; } } | undefined)?.oauth2;
    if (!oauth2) {
      setSystemErrorCode("AUTH_SERVER_ERROR");
      return;
    }

    clearNonFieldErrors();
    setIsGoogleSubmitting(true);
    try {
      const tokenClient = oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "openid email profile",
        callback: async (resp: { access_token?: string; error?: string }) => {
          if (!resp || resp.error || !resp.access_token) {
            triggerShake();
            setSystemErrorCode("AUTH_SERVER_ERROR");
            setIsGoogleSubmitting(false);
            setShowLoading(false);
            return;
          }

          try {
            await completeGoogleLogin(resp.access_token);
          } catch (err) {
            triggerShake();
            setSystemErrorCode("AUTH_SERVER_ERROR");
            console.error("Google login failed:", err);
          } finally {
            setIsGoogleSubmitting(false);
            setShowLoading(false);
          }
        },
      });
      tokenClient.requestAccessToken();
    } catch (err) {
      triggerShake();
      setSystemErrorCode("AUTH_SERVER_ERROR");
      console.error("Google login init failed:", err);
      setIsGoogleSubmitting(false);
      setShowLoading(false);
    }
  };

  useEffect(() => {
    if (!confetti) return;
    const t = window.setTimeout(() => setConfetti(false), 800);
    return () => window.clearTimeout(t);
  }, [confetti]);

  useEffect(() => {
    document.documentElement.classList.add("auth-no-scroll");
    document.body.classList.add("auth-no-scroll");
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyHeight = document.body.style.height;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    return () => {
      document.documentElement.classList.remove("auth-no-scroll");
      document.body.classList.remove("auth-no-scroll");
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
    };
  }, []);

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
  const copy =
    locale === "vi"
      ? {
          title: "Đăng nhập học viên",
          subtitle: "Học logic qua game 2D vui nhộn. Nâng kỹ năng qua từng màn.",
          email: "Email",
          password: "Mật khẩu",
          signIn: "Đăng nhập",
          signingIn: "Đang đăng nhập...",
          noAccount: "Chưa có tài khoản?",
          createAccount: "Tạo tài khoản",
          or: "hoặc",
          googleContinue: "Tiếp tục với Google",
          googleLoading: "Đang tải Google...",
          googleSigning: "Đang đăng nhập Google...",
          footer: "Tiếp tục hành trình học tập của bạn",
        }
      : {
          title: "Learner Login",
          subtitle: "Learn logic through fun 2D gameplay. Build skills while exploring levels.",
          email: "Email",
          password: "Password",
          signIn: "Sign In",
          signingIn: "Signing in...",
          noAccount: "Don't have an account yet?",
          createAccount: "Create Account",
          or: "or",
          googleContinue: "Continue with Google",
          googleLoading: "Loading Google...",
          googleSigning: "Signing in with Google...",
          footer: "Continue your learning journey",
        };

  return (
    <>
      <div className="login-page" style={pageStyle}>
        <div className="auth-topbar">
          <button
            type="button"
            className="auth-icon-btn"
            onClick={() => toggleTheme()}
            title={theme === "dark" ? t("themeLight") : t("themeDark")}
            aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
          >
            {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            className="auth-icon-btn"
            onClick={() => toggleLocale()}
            title={t("language")}
            aria-label={t("language")}
          >
            <span>{locale === "en" ? "EN" : "VI"}</span>
          </button>
        </div>
        <LoginAriaAnnouncer message={bubble} />
        <div className={styles.sceneRoot} aria-hidden="true">
          <Starfield />
        </div>

        <div className="login-duck" style={{ position: "relative", overflow: "visible" }}>
          <div style={{ position: "absolute", inset: 0, background: leftOverlayBg }} />

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
            <OrbitBlocks />
          </div>

          <div className="login-duck-content" style={{ position: "relative" }}>
            <h1 className="auth-brand-title">QuackOrbit</h1>
            <p className="auth-brand-subtitle">{copy.subtitle}</p>

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

            <h2>{copy.title}</h2>

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
                  color: "var(--text)",
                }}
              >
                {infoMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <input
                ref={emailRef}
                className="login-input"
                placeholder={copy.email}
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
                  className="auth-error"
                >
                  {buildMessage(fieldErrors.email).text}
                </div>
              ) : null}

              <input
                ref={passRef}
                className="login-input"
                type="password"
                placeholder={copy.password}
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
                  className="auth-error"
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
                {isSubmitting ? copy.signingIn : copy.signIn}
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
              <span className="auth-muted">{copy.noAccount}</span>
              <Link to={ROUTES.LEARNER_REGISTER} className="auth-link">
                {copy.createAccount}
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
              <div style={{ fontSize: 12 }} className="auth-muted">
                {copy.or}
              </div>
              <div style={{ height: 1, background: "rgba(229,231,235,0.18)", flex: 1 }} />
            </div>

            <div style={{ display: "grid", justifyItems: "center", marginTop: 4 }}>
              <button
                type="button"
                className="login-button auth-google-btn"
                onClick={handleGoogleLogin}
                disabled={isSubmitting || isGoogleSubmitting || !googleReady}
              >
                {isGoogleSubmitting
                  ? copy.googleSigning
                  : !googleReady
                    ? copy.googleLoading
                    : copy.googleContinue}
              </button>
              {!googleClientId ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "#fca5a5" }}>
                  Missing `VITE_GOOGLE_CLIENT_ID`
                </div>
              ) : null}
            </div>

            <div className="login-footer">{copy.footer}</div>
          </div>
        </div>
      </div>

      <LoginLoadingOverlay show={showLoading} step={loadingStep} />
    </>
  );
}
