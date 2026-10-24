
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://blockchain-donation-tracking.onrender.com/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setStatus("Account created successfully!");

      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setStatus(error.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <section className="register-visual">
        <div className="register-visual-content">
          <Link to="/" className="register-brand-label">
            <span className="register-brand-symbol">♧</span>
            DONATECHAIN
          </Link>

          <div className="register-message">
            <span className="register-eyebrow">BE PART OF SOMETHING GOOD</span>

            <h1>
              Small acts.
              <br />
              <span>Meaningful change.</span>
            </h1>

            <p>
              Join a community built around giving with purpose and making
              donations easier to follow and understand.
            </p>
          </div>

          <div className="register-benefit-list">
            <div>
              <span className="register-benefit-icon">01</span>
              <span>Discover causes that matter to you</span>
            </div>
            <div>
              <span className="register-benefit-icon">02</span>
              <span>Keep track of your donations</span>
            </div>
            <div>
              <span className="register-benefit-icon">03</span>
              <span>Explore transparent fund utilization</span>
            </div>
          </div>

          <div className="register-decoration" aria-hidden="true">
            <div className="register-decoration-ring ring-one" />
            <div className="register-decoration-ring ring-two" />
            <span>✳</span>
          </div>
        </div>

        <p className="register-visual-footer">
          A college blockchain project · Sepolia test network
        </p>
      </section>

      <section className="register-form-section">
        <div className="register-form-wrap">
          <div className="register-mobile-brand">
            <span className="register-brand-symbol">♧</span>
            <strong>DonateChain</strong>
          </div>

          <span className="register-form-eyebrow">GET STARTED</span>
          <h2>Create your account</h2>
          <p className="register-form-intro">
            A few details, and you're ready to begin.
          </p>

          <form className="register-form" onSubmit={handleRegister}>
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="register-password">Password</label>
            <div className="register-password-field">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <p className="register-password-hint">
              Use at least 8 characters for your password.
            </p>

            {status && (
              <p
                className={`register-status ${
                  status === "Account created successfully!"
                    ? "register-status-success"
                    : "register-status-error"
                }`}
                role="status"
              >
                {status}
              </p>
            )}

            <button
              className="register-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="register-divider">
            <span />
            <small>ALREADY HAVE AN ACCOUNT?</small>
            <span />
          </div>

          <Link to="/login" className="register-login-link">
            Sign in instead <span aria-hidden="true">↗</span>
          </Link>

          <p className="register-security-note">
            <span aria-hidden="true">◇</span>
            Your information is submitted securely over HTTPS.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;
