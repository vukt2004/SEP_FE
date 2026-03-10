import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

import { studentAuthApi } from "@/services/api/student/auth.api";
import type { StudentRegisterForm } from "@/types/api/student/auth";
import { setVerifyContact } from "@/services/api/student/verifyContact";

type RegisterValues = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  studentCode?: string;
};

type FieldErrors = Partial<Record<FieldKey, MessageCode>>;
type ExtraErrors = Partial<
  Record<"confirmPassword" | "firstName" | "lastName" | "phoneNumber", string>
>;

export default function RegisterPage() {
  const navigate = useNavigate();

  const [values, setValues] = useState<RegisterValues>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
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
    if (!v.firstName.trim()) e.firstName = "First name is required";
    if (!v.lastName.trim()) e.lastName = "Last name is required";
    if (!v.phoneNumber.trim()) e.phoneNumber = "Phone number is required";
    if (!v.confirmPassword) e.confirmPassword = "Confirm password is required";
    if (v.confirmPassword && v.confirmPassword !== v.password) {
      e.confirmPassword = "Passwords do not match";
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
      const payload: StudentRegisterForm = {
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
        studentCode: values.studentCode?.trim() || undefined,
      };

      const res = await studentAuthApi.register(payload);

      if (!res.data.isSuccess) {
        setSubmitError(res.data.message ?? "Register failed");
        triggerShake();
        return;
      }

      setIsSuccess(true);
      setConfetti(true);

      // Phase 4.2: persist contact to survive refresh on verify screen
      setVerifyContact(values.email);

      navigate(ROUTES.STUDENT_VERIFY_OTP, {
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

  return (
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
          <p style={{ maxWidth: 420 }}>Create your student account and start learning.</p>

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

          <h2>Learner Register</h2>

          <form onSubmit={handleSubmit}>
            {submitError ? (
              <div role="alert" style={{ margin: "8px 0", fontSize: 12, color: "crimson" }}>
                {submitError}
              </div>
            ) : null}

            <input
              className="login-input"
              placeholder="First name"
              value={values.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              aria-invalid={Boolean(extraErrors.firstName)}
              disabled={isSubmitting}
            />
            {extraErrors.firstName ? (
              <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "crimson" }}>
                {extraErrors.firstName}
              </div>
            ) : null}

            <input
              className="login-input"
              placeholder="Last name"
              value={values.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              aria-invalid={Boolean(extraErrors.lastName)}
              disabled={isSubmitting}
            />
            {extraErrors.lastName ? (
              <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "crimson" }}>
                {extraErrors.lastName}
              </div>
            ) : null}

            <input
              className="login-input"
              placeholder="Phone number"
              value={values.phoneNumber}
              onChange={(e) => setField("phoneNumber", e.target.value)}
              aria-invalid={Boolean(extraErrors.phoneNumber)}
              disabled={isSubmitting}
            />
            {extraErrors.phoneNumber ? (
              <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "crimson" }}>
                {extraErrors.phoneNumber}
              </div>
            ) : null}

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
              disabled={isSubmitting}
            />
            {fieldErrors.email ? (
              <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "crimson" }}>
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
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              disabled={isSubmitting}
            />
            {fieldErrors.password ? (
              <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "crimson" }}>
                {buildMessage(fieldErrors.password).text}
              </div>
            ) : null}

            <input
              className="login-input"
              type="password"
              placeholder="Confirm password"
              value={values.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(extraErrors.confirmPassword)}
              disabled={isSubmitting}
            />
            {extraErrors.confirmPassword ? (
              <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "crimson" }}>
                {extraErrors.confirmPassword}
              </div>
            ) : null}

            <input
              className="login-input"
              placeholder="Student code (optional)"
              value={values.studentCode ?? ""}
              onChange={(e) => setField("studentCode", e.target.value)}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              className="login-button"
              style={{ backgroundColor: "#2563EB" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create account"}
            </button>
          </form>

          <div className="login-footer">
            Already have an account?{" "}
            <a href={ROUTES.STUDENT_LOGIN} style={{ color: "#2563EB" }}>
              Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
