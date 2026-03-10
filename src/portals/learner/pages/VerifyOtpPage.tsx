import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

import { learnerAuthApi } from "@/services/api/learner/auth.api";
import { useLearnerAuthStore } from "@/stores/auth/learnerAuth.store";

// ✅ FIX: import helper đúng vị trí (khuyến nghị)
import {
  clearVerifyContact,
  getVerifyContact,
  setVerifyContact,
} from "@/services/api/learner/verifyContact";

type NavState = { contact: string };

const OTP_LEN = 6;

function sanitizeOtp(v: string) {
  return v.replace(/\D/g, "").slice(0, OTP_LEN);
}

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const loc = useLocation();
  const st = (loc.state ?? null) as NavState | null;

  const setToken = useLearnerAuthStore((s) => s.setToken);

  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [shake, setShake] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const contactFromState = st?.contact ?? "";
  const contact = contactFromState || getVerifyContact() || "";

  // ✅ Persist contact nếu có từ state (chống refresh mất state)
  useEffect(() => {
    if (contactFromState) setVerifyContact(contactFromState);
  }, [contactFromState]);

  useEffect(() => {
    if (!confetti) return;
    const t = window.setTimeout(() => setConfetti(false), 800);
    return () => window.clearTimeout(t);
  }, [confetti]);

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 520);
  }

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

  async function onVerify(ev: React.FormEvent) {
    ev.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    setIsSuccess(false);

    if (!contact) {
      // missing state + no session
      clearVerifyContact();
      navigate(ROUTES.LEARNER_LOGIN, { replace: true });
      return;
    }

    const cleaned = sanitizeOtp(otp);
    if (cleaned.length < OTP_LEN) {
      triggerShake();
      setSubmitError("OTP is too short");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await learnerAuthApi.verifyOtp({
        contact,
        otp: cleaned,
        otpType: 1,
        otpSentChannel: 1,
      });

      if (!res.data.isSuccess) {
        setSubmitError(res.data.message ?? "Verify OTP failed");
        triggerShake();
        return;
      }

      const token = res.data.data?.accessToken ?? null;

      setIsSuccess(true);
      setConfetti(true);

      // ✅ cleanup contact sau khi verify ok
      clearVerifyContact();

      if (token) {
        setToken(token);
        navigate(ROUTES.LEARNER_HOME, { replace: true });
      } else {
        // ✅ fallback “vẹn cả đôi đường”
        navigate(ROUTES.LEARNER_LOGIN, {
          replace: true,
          state: { info: "Verified successfully. Please login to continue." },
        });
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Verify OTP failed");
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <h1 style={{ color: "#2563EB", marginBottom: 8 }}>QuackOrbit</h1>
          <p style={{ maxWidth: 420 }}>
            Enter the OTP to verify your account.
            {contact ? (
              <span style={{ display: "block", opacity: 0.85, marginTop: 6 }}>
                Sent to: <strong>{contact}</strong>
              </span>
            ) : null}
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

        <div className={["login-card", shake ? styles.shake : ""].join(" ")}>
          <PixelConfetti show={confetti} />

          <h2>Verify OTP</h2>

          <form onSubmit={onVerify}>
            {submitError ? (
              <div role="alert" style={{ margin: "8px 0", fontSize: 12, color: "crimson" }}>
                {submitError}
              </div>
            ) : null}

            <input
              className="login-input"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => {
                setOtp(sanitizeOtp(e.target.value));
                setSubmitError(null);
              }}
              onPaste={(e) => {
                const txt = e.clipboardData.getData("text");
                const next = sanitizeOtp(txt);
                if (next) {
                  e.preventDefault();
                  setOtp(next);
                }
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LEN}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              className="login-button"
              style={{ backgroundColor: "#2563EB", marginTop: 12 }}
              disabled={isSubmitting || sanitizeOtp(otp).length < OTP_LEN}
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>
          </form>

          <div className="login-footer">
            <button
              type="button"
              onClick={() => {
                clearVerifyContact();
                navigate(ROUTES.LEARNER_LOGIN, { replace: true });
              }}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: "#2563EB",
                cursor: "pointer",
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
