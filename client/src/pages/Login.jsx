
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://blockchain-donation-tracking.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      sessionStorage.setItem("donatechainToken", data.token);
      sessionStorage.setItem(
        "donatechainUser",
        JSON.stringify(data.user)
      );

      setStatus("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      setStatus(error.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-content">
          <span className="login-brand-label">
            <span className="login-brand-symbol">♧</span>
            DONATECHAIN
          </span>

          <div className="login-message">
            <span className="login-eyebrow">WELCOME BACK</span>

            <h1>
              Giving with
              <br />
              purpose.
              <br />
              <span>Tracking with trust.</span>
            </h1>

            <p>
              Your generosity can make a difference. Sign in to follow
              donations, explore causes, and see fundraising progress.
            </p>
          </div>

          <div className="login-trust-card">
            <span className="login-trust-icon">✓</span>
            <div>
              <strong>Transparency matters</strong>
              <span>Follow donations and fund utilization.</span>
            </div>
          </div>

          <div className="login-decoration" aria-hidden="true">
            <div className="login-decoration-ring ring-a" />
            <div className="login-decoration-ring ring-b" />
            <span>♧</span>
            <i className="decoration-star star-a">✳</i>
            <i className="decoration-star star-b">✦</i>
          </div>
        </div>

        <p className="login-visual-footer">
          A college blockchain project · Sepolia test network
        </p>
      </section>

      <section className="login-form-section">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <span className="login-brand-symbol">♧</span>
            <strong>DonateChain</strong>
          </div>

          <span className="login-form-eyebrow">YOUR ACCOUNT</span>
          <h2>Welcome back</h2>
          <p className="login-form-intro">
            Sign in to continue your DonateChain journey.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="login-password-heading">
              <label htmlFor="login-password">Password</label>
            </div>

            <div className="login-password-field">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {status && (
              <p
                className={`login-status ${
                  status === "Login successful!" ? "status-success" : "status-error"
                }`}
                role="status"
              >
                {status}
              </p>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing you in..." : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="login-divider">
            <span />
            <small>NEW TO DONATECHAIN?</small>
            <span />
          </div>

          <Link to="/register" className="login-register-link">
            Create an account <span aria-hidden="true">↗</span>
          </Link>

          <p className="login-security-note">
            <span aria-hidden="true">◇</span>
            Your account session is stored in this browser.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
