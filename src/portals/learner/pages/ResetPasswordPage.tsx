import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";

import Starfield from "../components/login/Starfield";
import OrbitBlocks from "../components/login/OrbitBlocks";
import PixelConfetti from "../components/login/PixelConfetti";
import styles from "../components/login/LoginScene.module.css";
import DuckSpeechBubble from "../components/login/DuckSpeechBubble";
import DuckAstronaut from "../components/login/DuckAstronaut";
import { selectDuckMode } from "../login/duckMode";

import { selectTopBubbleMessage } from "../login/messageSelector";
import LoginAriaAnnouncer from "../components/login/LoginAriaAnnouncer";
import { useThemeStore } from "@/stores/theme.store";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";
import { Sun, Moon, ArrowLeft } from "lucide-react";

import { learnerAuthApi } from "@/services/api/learner/auth.api";
import { setVerifyContact } from "@/services/api/learner/verifyContact";

type ResetValues = { email: string; newPassword: string };

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const locale = useLanguageStore((s) => s.locale);
  const toggleLocale = useLanguageStore((s) => s.toggle);
  const t = getT(locale);
  const leftOverlayBg =
    theme === "light" ? "rgba(255,255,255,0.08)" : "rgba(2,6,23,0.25)";

  const [values, setValues] = useState<ResetValues>({ email: "", newPassword: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; newPassword?: string }>({});

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
        isSubmitting,
        isSuccess,
        focusedField: null,
        capsLockOn: false,
        fieldErrors: {},
        formErrorCode: null,
        systemErrorCode: null,
      }),
    [isSubmitting, isSuccess],
  );

  const duckMode = useMemo(
    () =>
      selectDuckMode({
        isSubmitting,
        isSuccess,
        focusedField: null,
        fieldErrors: {},
        formErrorCode: null,
        systemErrorCode: null,
      }),
    [isSubmitting, isSuccess],
  );

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 520);
  }

  function setField<K extends keyof ResetValues>(key: K, value: ResetValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSubmitError(null);
  }

  function validate(v: ResetValues): { email?: string; newPassword?: string } {
    const errs: { email?: string; newPassword?: string } = {};
    const required = locale === "vi" ? "Trường này là bắt buộc" : "This field is required";
    const invalidEmail =
      locale === "vi" ? "Email không đúng định dạng" : "Invalid email format";
    const passwordMinLen =
      locale === "vi"
        ? "Mật khẩu phải có ít nhất 6 ký tự"
        : "Password must be at least 6 characters";

    if (!v.email.trim()) {
      errs.email = required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
      errs.email = invalidEmail;
    }

    if (!v.newPassword) {
      errs.newPassword = required;
    } else if (v.newPassword.length < 6) {
      errs.newPassword = passwordMinLen;
    }

    return errs;
  }

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (isSubmitting) return;

    setIsSuccess(false);
    setSubmitError(null);

    const errs = validate(values);
    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      triggerShake();
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await learnerAuthApi.resetPassword({
        contact: values.email.trim(),
        newPassword: values.newPassword,
        otpSentChannel: 1,
      });

      if (!res.data.isSuccess) {
        setSubmitError(res.data.message ?? (locale === "vi" ? "Đặt lại mật khẩu thất bại" : "Reset password failed"));
        triggerShake();
        return;
      }

      setIsSuccess(true);
      setConfetti(true);

      // Persist contact for the OTP verify page
      setVerifyContact(values.email.trim());

      navigate(ROUTES.LEARNER_VERIFY_OTP, {
        state: { contact: values.email.trim(), otpType: 2 },
      });
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : (locale === "vi" ? "Đặt lại mật khẩu thất bại" : "Reset password failed"),
      );
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageStyle = {
    ["--accent" as const]: "#2563EB",
  } as React.CSSProperties;

  const copy =
    locale === "vi"
      ? {
          title: "Đặt lại mật khẩu",
          subtitle: "Nhập email và mật khẩu mới để đặt lại mật khẩu tài khoản của bạn.",
          email: "Email",
          newPassword: "Mật khẩu mới",
          submit: "Đặt lại mật khẩu",
          submitting: "Đang xử lý...",
          backToLogin: "Quay lại đăng nhập",
          footer: "Một mã OTP sẽ được gửi đến email của bạn để xác nhận",
        }
      : {
          title: "Reset Password",
          subtitle: "Enter your email and new password to reset your account password.",
          email: "Email",
          newPassword: "New Password",
          submit: "Reset Password",
          submitting: "Processing...",
          backToLogin: "Back to Login",
          footer: "An OTP code will be sent to your email for verification",
        };

  return (
    <div className="login-page" style={pageStyle}>
      <button
        type="button"
        className="auth-back-btn"
        onClick={() => navigate(ROUTES.LEARNER_LOGIN)}
        title={locale === "vi" ? "Quay lại" : "Go back"}
        aria-label={locale === "vi" ? "Quay lại đăng nhập" : "Go back to login"}
      >
        <ArrowLeft size={15} />
        <span>{copy.backToLogin}</span>
      </button>
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
          {isSubmitting && (
            <div className={styles.loadingBarWrap} aria-hidden="true">
              <div className={styles.loadingBar} />
            </div>
          )}

          <PixelConfetti show={confetti} />

          <h2>{copy.title}</h2>

          <form onSubmit={handleSubmit}>
            {submitError ? (
              <div role="alert" className="auth-error" style={{ margin: "8px 0" }}>
                {submitError}
              </div>
            ) : null}

            <div className="auth-field">
              <div className="auth-field-label">
                <span>{copy.email}</span>
                <span className="auth-field-required">*</span>
              </div>
              <input
                id="reset-email"
                className="login-input"
                placeholder={copy.email}
                type="email"
                value={values.email}
                onChange={(e) => setField("email", e.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "reset-email-error" : undefined}
                disabled={isSubmitting}
              />
              {fieldErrors.email ? (
                <div id="reset-email-error" role="alert" className="auth-error">
                  {fieldErrors.email}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              <div className="auth-field-label">
                <span>{copy.newPassword}</span>
                <span className="auth-field-required">*</span>
              </div>
              <input
                id="reset-new-password"
                className="login-input"
                type="password"
                placeholder={copy.newPassword}
                value={values.newPassword}
                onChange={(e) => setField("newPassword", e.target.value)}
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.newPassword)}
                aria-describedby={fieldErrors.newPassword ? "reset-password-error" : undefined}
                disabled={isSubmitting}
              />
              {fieldErrors.newPassword ? (
                <div id="reset-password-error" role="alert" className="auth-error">
                  {fieldErrors.newPassword}
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              className="login-button"
              style={{ backgroundColor: "#2563EB" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? copy.submitting : copy.submit}
            </button>
          </form>

          <div className="login-footer">
            <Link to={ROUTES.LEARNER_LOGIN} className="auth-link">
              {copy.backToLogin}
            </Link>
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              textAlign: "center",
              opacity: 0.7,
              color: "var(--text)",
            }}
          >
            {copy.footer}
          </div>
        </div>
      </div>
    </div>
  );
}
