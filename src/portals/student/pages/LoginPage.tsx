import "@/shared/styles/login.css";
import "@/shared/styles/tokens.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentAuthStore } from "@/stores/auth/studentAuth.store";
import { ROUTES } from "@/lib/constants/routes";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useStudentAuthStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
    navigate(ROUTES.STUDENT_HOME);
  };

  const pageStyle = {
    ["--accent" as const]: "#2563EB",
  } as React.CSSProperties;

  return (
    <div className="login-page" style={pageStyle}>
      <div className="login-brand">
        <div className="login-brand-content">
          <h1 style={{ color: "#2563EB" }}>QuackOrbit</h1>
          <p>Learn logic through fun 2D gameplay. Build skills while exploring levels.</p>
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card">
          <h2>Student Login</h2>

          <form onSubmit={handleSubmit}>
            <input
              className="login-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="login-button" style={{ backgroundColor: "#2563EB" }}>
              Sign In
            </button>
          </form>

          <div className="login-footer">Continue your learning journey</div>
        </div>
      </div>
    </div>
  );
}
