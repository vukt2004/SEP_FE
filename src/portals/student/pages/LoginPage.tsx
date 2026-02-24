import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentAuthStore } from "@/stores/auth/studentAuth.store";
import { ROUTES } from "@/lib/constants/routes";

import Starfield from "../components/login/Starfield";
import OrbitBlocks from "../components/login/OrbitBlocks";
import PixelConfetti from "../components/login/PixelConfetti";
import styles from "../components/login/LoginScene.module.css";
import LoginLoadingOverlay from "../components/login/LoginLoadingOverlay";
import MiniGridGame from "../components/login/MiniGridGame";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useStudentAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // micro-interactions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    if (!confetti) return;
    const t = window.setTimeout(() => setConfetti(false), 800);
    return () => window.clearTimeout(t);
  }, [confetti]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await login(email, password);

      // success micro + game-like loading
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
    } catch {
      setShake(true);
      window.setTimeout(() => setShake(false), 520);
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
        {/* ====== SET 2: Parallax Starfield (nền tổng) ====== */}
        <div className={styles.sceneRoot} aria-hidden="true">
          <Starfield />
        </div>

        {/* BRAND PANEL */}
        <div className="login-brand" style={{ position: "relative", overflow: "hidden" }}>
          {/* starfield đã là background global; thêm lớp overlay nhẹ để chữ nổi */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,0.35)" }} />

          {/* ====== SET 1: Orbiting Blocks quanh brand ====== */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
            <OrbitBlocks />
          </div>

          <div className="login-brand-content" style={{ position: "relative" }}>
            <h1 style={{ color: "#2563EB" }}>QuackOrbit</h1>
            <p>Learn logic through fun 2D gameplay. Build skills while exploring levels.</p>
          </div>

          <div style={{ marginTop: 16, maxWidth: 360 }}>
            <MiniGridGame />
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
                className="login-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <input
                className="login-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

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
