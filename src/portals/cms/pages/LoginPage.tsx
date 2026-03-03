import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCmsAuthStore } from "@/stores/auth/cmsAuth.store";
import { ROUTES } from "@/lib/constants/routes";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useCmsAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate(ROUTES.CMS_DASHBOARD);
    } catch (err) {
      setError("Login failed. Please check your credentials.");
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
      <div className="login-brand">
        <div className="login-brand-content">
          <h1 style={{ color: "#2563EB" }}>QuackOrbit</h1>
          <p>Manage content, levels, and moderation.</p>
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card">
          <h2>Admin / Moderator Login</h2>

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
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />

            <input
              className="login-input"
              type="password"
              placeholder="Password"
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-footer">Manage your learning platform</div>
        </div>
      </div>
    </div>
  );
}
