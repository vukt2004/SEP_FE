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
          <div className="login-brand-icon">🦆</div>
          <h1>QuackOrbit</h1>
          <p className="login-brand-tagline">Management System</p>

          <div className="login-features">
            <div className="login-feature-item">
              <span className="login-feature-icon">📊</span>
              <div>
                <div className="login-feature-title">Content Management</div>
                <div className="login-feature-desc">Create & manage challenges</div>
              </div>
            </div>

            <div className="login-feature-item">
              <span className="login-feature-icon">🎮</span>
              <div>
                <div className="login-feature-title">Level Management</div>
                <div className="login-feature-desc">Design game levels</div>
              </div>
            </div>

            <div className="login-feature-item">
              <span className="login-feature-icon">🛡️</span>
              <div>
                <div className="login-feature-title">Moderation</div>
                <div className="login-feature-desc">Review user content</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Admin Login</h2>
            <p className="login-card-subtitle">Access the management panel</p>
          </div>

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
            <div className="login-form-group">
              <label className="login-label">Email Address</label>
              <input
                className="login-input"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="login-form-group">
              <label className="login-label">Password</label>
              <input
                className="login-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="login-button"
              style={{ backgroundColor: "#2563EB" }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-footer">Secure management portal for administrators</div>
        </div>
      </div>
    </div>
  );
}
