import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";

import Starfield from "../components/login/Starfield";
import OrbitBlocks from "../components/login/OrbitBlocks";
import PixelConfetti from "../components/login/PixelConfetti";
import styles from "../components/login/LoginScene.module.css";
import DuckSpeechBubble from "../components/login/DuckSpeechBubble";
import DuckAstronaut from "../components/login/DuckAstronaut";
import { selectDuckMode } from "../login/duckMode";

import type { FieldKey, MessageCode } from "../login/messages";
import { buildMessage } from "../login/messages";
import { validateForm, firstErrorField } from "../login/validation";
import { selectTopBubbleMessage } from "../login/messageSelector";
import LoginAriaAnnouncer from "../components/login/LoginAriaAnnouncer";
import { useThemeStore } from "@/stores/theme.store";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";
import { Sun, Moon, ArrowLeft } from "lucide-react";

import { learnerAuthApi } from "@/services/api/learner/auth.api";
import type { GenderEnum, LearnerRegisterForm } from "@/types/api/learner/auth";
import { setVerifyContact } from "@/services/api/learner/verifyContact";

type RegisterValues = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  gender: GenderEnum | "";
  dateOfBirth: string;
  studentCode?: string;
};

type FieldErrors = Partial<Record<FieldKey, MessageCode>>;
type ExtraErrors = Partial<
  Record<"confirmPassword" | "firstName" | "lastName" | "phoneNumber" | "gender" | "dateOfBirth", string>
>;

function normalizeDateOfBirth(dateOfBirth: string) {
  return `${dateOfBirth}T00:00:00`;
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isRequiredFieldMessage(code: MessageCode) {
  return code === "VALID_REQUIRED_EMAIL" || code === "VALID_REQUIRED_PASSWORD";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const locale = useLanguageStore((s) => s.locale);
  const toggleLocale = useLanguageStore((s) => s.toggle);
  const t = getT(locale);
  const leftOverlayBg =
    theme === "light" ? "rgba(255,255,255,0.08)" : "rgba(2,6,23,0.25)";

  const [values, setValues] = useState<RegisterValues>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    gender: "",
    dateOfBirth: "",
    studentCode: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [extraErrors, setExtraErrors] = useState<ExtraErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const maxDateOfBirth = getTodayDateInputValue();

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
        focusedField,
        capsLockOn,
        fieldErrors,
        formErrorCode: null,
        systemErrorCode: null,
      }),
    [isSubmitting, isSuccess, focusedField, capsLockOn, fieldErrors],
  );

  const duckMode = useMemo(
    () =>
      selectDuckMode({
        isSubmitting,
        isSuccess,
        focusedField,
        fieldErrors,
        formErrorCode: null,
        systemErrorCode: null,
      }),
    [isSubmitting, isSuccess, focusedField, fieldErrors],
  );

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 520);
  }

  function setField<K extends keyof RegisterValues>(key: K, value: RegisterValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));

    if (key === "email" || key === "password") {
      setFieldErrors((prev) => {
        const fk = key as FieldKey;
        if (!prev[fk]) return prev;
        const next: FieldErrors = { ...prev };
        delete next[fk];
        return next;
      });
    }

    setExtraErrors((prev) => {
      if (!prev[key as keyof ExtraErrors]) return prev;
      const next = { ...prev };
      delete next[key as keyof ExtraErrors];
      return next;
    });

    setSubmitError(null);
  }

  function validateExtra(v: RegisterValues): ExtraErrors {
    const e: ExtraErrors = {};
    const requiredMessage = locale === "vi" ? "Trường này là bắt buộc" : "This field is required";
    const mismatchMessage = locale === "vi" ? "Mật khẩu xác nhận không khớp" : "Passwords do not match";
    if (!v.firstName.trim()) e.firstName = requiredMessage;
    if (!v.lastName.trim()) e.lastName = requiredMessage;
    if (!v.phoneNumber.trim()) e.phoneNumber = requiredMessage;
    if (!v.confirmPassword) e.confirmPassword = requiredMessage;
    if (v.confirmPassword && v.confirmPassword !== v.password) {
      e.confirmPassword = mismatchMessage;
    }
    return e;
  }

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (isSubmitting) return;

    setIsSuccess(false);
    setSubmitError(null);

    const { fieldErrors: fe } = validateForm({ email: values.email, password: values.password });
    setFieldErrors(fe);

    const extra = validateExtra(values);
    setExtraErrors(extra);

    const first = firstErrorField(fe);
    if (first) {
      triggerShake();
      if (first === "email") emailRef.current?.focus();
      if (first === "password") passRef.current?.focus();
      return;
    }
    if (Object.keys(extra).length > 0) {
      triggerShake();
      return;
    }

    setIsSubmitting(true);

    try {
      const gender = values.gender === "" ? undefined : values.gender;
      const payload: LearnerRegisterForm = {
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
        gender,
        dateOfBirth: values.dateOfBirth ? normalizeDateOfBirth(values.dateOfBirth) : undefined,
        studentCode: values.studentCode?.trim() || undefined,
      };

      const res = await learnerAuthApi.register(payload);

      if (!res.data.isSuccess) {
        setSubmitError(res.data.message ?? "Register failed");
        triggerShake();
        return;
      }

      setIsSuccess(true);
      setConfetti(true);

      // Phase 4.2: persist contact to survive refresh on verify screen
      setVerifyContact(values.email);

      navigate(ROUTES.LEARNER_VERIFY_OTP, {
        state: { contact: values.email },
      });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Register failed");
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
          title: "Đăng ký học viên",
          subtitle: "Tạo tài khoản học viên và bắt đầu hành trình học.",
          firstName: "Tên",
          lastName: "Họ",
          phone: "Số điện thoại",
          email: "Email",
          password: "Mật khẩu",
          confirmPassword: "Nhập lại mật khẩu",
          studentCode: "Mã học viên (không bắt buộc)",
          creating: "Đang tạo...",
          create: "Tạo tài khoản",
          haveAccount: "Đã có tài khoản?",
          login: "Đăng nhập",
        }
      : {
          title: "Learner Register",
          subtitle: "Create your learner account and start learning.",
          firstName: "First name",
          lastName: "Last name",
          phone: "Phone number",
          email: "Email",
          password: "Password",
          confirmPassword: "Confirm password",
          studentCode: "Learner code (optional)",
          creating: "Creating...",
          create: "Create account",
          haveAccount: "Already have an account?",
          login: "Login",
        };
  const genderFieldLabel = locale === "vi" ? "Gi\u1edbi t\u00ednh" : "Gender";
  const dateOfBirthFieldLabel = locale === "vi" ? "Ng\u00e0y sinh" : "Date of birth";
  const selectGenderLabel = locale === "vi" ? "Ch\u1ecdn gi\u1edbi t\u00ednh" : "Select gender";
  const genderOptions: Array<{ value: GenderEnum; label: string }> = [
    { value: 0, label: locale === "vi" ? "Nữ" : "Female" },
    { value: 1, label: locale === "vi" ? "Nam" : "Male" },
    { value: 2, label: locale === "vi" ? "Khác" : "Other" },
  ];

  const requiredMessage = locale === "vi" ? "Trường này là bắt buộc" : "This field is required";
  const getFieldErrorText = (code: MessageCode) =>
    isRequiredFieldMessage(code) ? requiredMessage : buildMessage(code).text;
  const renderFieldLabel = (label: string, required = false) => (
    <div className="auth-field-label">
      <span>{label}</span>
      {required ? <span className="auth-field-required">*</span> : null}
    </div>
  );

  return (
    <div className="login-page" style={pageStyle}>
      <button
          type="button"
          className="auth-back-btn"
          onClick={() => navigate(ROUTES.LANDING)}
          title={locale === "vi" ? "Quay lại" : "Go back"}
          aria-label={locale === "vi" ? "Quay lại trang chủ" : "Go back to home"}
        >
          <ArrowLeft size={15} />
          <span>{locale === "vi" ? "Trang chủ" : "Home"}</span>
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

        <div className={["login-card", shake ? styles.shake : ""].join(" ")}>
          <PixelConfetti show={confetti} />

          <h2>{copy.title}</h2>

          <form onSubmit={handleSubmit}>
            {submitError ? (
              <div role="alert" className="auth-error" style={{ margin: "8px 0" }}>
                {submitError}
              </div>
            ) : null}

            <div className="auth-field">
              {renderFieldLabel(copy.firstName, true)}
              <input
                className="login-input"
                placeholder={copy.firstName}
                value={values.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                aria-invalid={Boolean(extraErrors.firstName)}
                disabled={isSubmitting}
              />
              {extraErrors.firstName ? (
                <div role="alert" className="auth-error">
                  {extraErrors.firstName}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              {renderFieldLabel(copy.lastName, true)}
              <input
                className="login-input"
                placeholder={copy.lastName}
                value={values.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                aria-invalid={Boolean(extraErrors.lastName)}
                disabled={isSubmitting}
              />
              {extraErrors.lastName ? (
                <div role="alert" className="auth-error">
                  {extraErrors.lastName}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              {renderFieldLabel(copy.phone, true)}
              <input
                className="login-input"
                placeholder={copy.phone}
                value={values.phoneNumber}
                onChange={(e) => setField("phoneNumber", e.target.value)}
                aria-invalid={Boolean(extraErrors.phoneNumber)}
                disabled={isSubmitting}
              />
              {extraErrors.phoneNumber ? (
                <div role="alert" className="auth-error">
                  {extraErrors.phoneNumber}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              {renderFieldLabel(genderFieldLabel)}
              <select
                className="login-input"
                value={values.gender === "" ? "" : String(values.gender)}
                onChange={(e) =>
                  setField(
                    "gender",
                    e.target.value === "" ? "" : (Number(e.target.value) as GenderEnum),
                  )
                }
                aria-invalid={Boolean(extraErrors.gender)}
                disabled={isSubmitting}
                aria-label={genderFieldLabel}
                title={genderFieldLabel}
              >
                <option value="">{selectGenderLabel}</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {extraErrors.gender ? (
                <div role="alert" className="auth-error">
                  {extraErrors.gender}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              {renderFieldLabel(dateOfBirthFieldLabel)}
              <input
                className="login-input"
                type="date"
                value={values.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
                aria-invalid={Boolean(extraErrors.dateOfBirth)}
                disabled={isSubmitting}
                max={maxDateOfBirth}
                aria-label={dateOfBirthFieldLabel}
                title={dateOfBirthFieldLabel}
              />
              {extraErrors.dateOfBirth ? (
                <div role="alert" className="auth-error">
                  {extraErrors.dateOfBirth}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              {renderFieldLabel(copy.email, true)}
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
                disabled={isSubmitting}
              />
              {fieldErrors.email ? (
                <div role="alert" className="auth-error">
                  {getFieldErrorText(fieldErrors.email)}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              {renderFieldLabel(copy.password, true)}
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
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.password)}
                disabled={isSubmitting}
              />
              {fieldErrors.password ? (
                <div role="alert" className="auth-error">
                  {getFieldErrorText(fieldErrors.password)}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              {renderFieldLabel(copy.confirmPassword, true)}
              <input
                className="login-input"
                type="password"
                placeholder={copy.confirmPassword}
                value={values.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                autoComplete="new-password"
                aria-invalid={Boolean(extraErrors.confirmPassword)}
                disabled={isSubmitting}
              />
              {extraErrors.confirmPassword ? (
                <div role="alert" className="auth-error">
                  {extraErrors.confirmPassword}
                </div>
              ) : null}
            </div>

            <div className="auth-field">
              {renderFieldLabel(copy.studentCode)}
              <input
                className="login-input"
                placeholder={copy.studentCode}
                value={values.studentCode ?? ""}
                onChange={(e) => setField("studentCode", e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className="login-button"
              style={{ backgroundColor: "#2563EB" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? copy.creating : copy.create}
            </button>
          </form>

          <div className="login-footer">
            {copy.haveAccount}{" "}
            <Link to={ROUTES.LEARNER_LOGIN} className="auth-link">
              {copy.login}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
