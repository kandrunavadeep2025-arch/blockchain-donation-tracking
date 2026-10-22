import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

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

      // Keep the token and user details for this browser session.
      sessionStorage.setItem("donatechainToken", data.token);
      sessionStorage.setItem(
        "donatechainUser",
        JSON.stringify(data.user)
      );

      setStatus("Login successful! ✅");
      navigate("/dashboard");
    } catch (error) {
      setStatus(error.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>Login</h1>
      <p>Welcome back to DonateChain.</p>

      <form
        onSubmit={handleLogin}
        style={{
          maxWidth: "350px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {status && <p role="status">{status}</p>}
    </div>
  );
}

export default Login;