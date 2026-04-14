import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCmsAuthStore } from "@/stores/auth/cmsAuth.store";
import { getCmsHomeRoute } from "@/lib/auth/role";
import { useTranslation } from "@/lib/i18n/translations";
import { useLanguageStore } from "@/stores/language.store";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useCmsAuthStore((s) => s.login);
  const { t } = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const role = await login(email, password);
      navigate(getCmsHomeRoute(role));
    } catch (err) {
      setError(t("cmsLogin.failed"));
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const pageStyle = {
    ["--accent" as const]: "#2563EB",
  } as React.CSSProperties;

  return (
    <div className="login-page" style={pageStyle}>
      <button
        type="button"
        onClick={() => setLocale(locale === "en" ? "vi" : "en")}
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 20,
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          cursor: "pointer",
          fontSize: "13px",
        }}
        title={t("language")}
      >
        {locale === "en" ? t("languageVi") : t("languageEn")}
      </button>

      <div className="login-brand">
        <div className="login-brand-content">
          <h1 style={{ color: "#2563EB" }}>QuackOrbit</h1>
          <p>{t("cmsLogin.subtitle")}</p>
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card">
          <h2>{t("cmsLogin.title")}</h2>

          {error && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--danger)",
                borderRadius: "8px",
                color: "var(--danger)",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              className="login-input"
              type="email"
              placeholder={t("cmsLogin.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />

            <input
              className="login-input"
              type="password"
              placeholder={t("cmsLogin.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />

            <button
              type="submit"
              className="login-button"
              style={{ backgroundColor: "#2563EB" }}
              disabled={loading}
            >
              {loading ? t("cmsLogin.signingIn") : t("cmsLogin.signIn")}
            </button>
          </form>

          <div className="login-footer">{t("cmsLogin.footer")}</div>
        </div>
      </div>
    </div>
  );
}
