import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      const response = await fetch("https://blockchain-donation-tracking.onrender.com/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setStatus("Account created successfully!");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>Register</h1>
      <p>Create your DonateChain account.</p>

      <form
        onSubmit={handleRegister}
        style={{
          maxWidth: "350px",
          margin: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (minimum 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      {status && <p>{status}</p>}
    </div>
  );
}

export default Register;