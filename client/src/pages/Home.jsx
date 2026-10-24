
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "https://blockchain-donation-tracking.onrender.com/api";

const actionData = {
  guest: [
    { title: "Explore campaigns", description: "Discover causes and see which campaigns need support.", path: "/campaigns", icon: "↗", tag: "Discover" },
    { title: "Follow the funds", description: "Explore campaign funding and recorded expenses.", path: "/transparency", icon: "⌕", tag: "Open records" },
    { title: "Welcome back", description: "Sign in to access your DonateChain account.", path: "/login", icon: "↪", tag: "Your account" },
    { title: "Join our community", description: "Create an account and take part in transparent giving.", path: "/register", icon: "+", tag: "Get started" },
  ],
  donor: [
    { title: "Explore campaigns", description: "Find a cause and make a donation using test ETH.", path: "/campaigns", icon: "↗", tag: "Make an impact" },
    { title: "My donations", description: "Review the donations associated with your account.", path: "/donation-history", icon: "↗", tag: "Your records" },
    { title: "Follow the funds", description: "Review campaign funding and recorded expenses.", path: "/transparency", icon: "⌕", tag: "Open records" },
    { title: "My dashboard", description: "Visit your personal DonateChain dashboard.", path: "/dashboard", icon: "↗", tag: "Your account" },
  ],
  ngo: [
    { title: "Create a campaign", description: "Submit a fundraising campaign for admin approval.", path: "/create-campaign", icon: "+", tag: "Campaign tools" },
    { title: "Record an expense", description: "Submit an expense against your campaign funds.", path: "/add-expense", icon: "↗", tag: "Fund utilization" },
    { title: "Expense history", description: "Review recorded expenses and payment details.", path: "/expense-history", icon: "↗", tag: "Your records" },
    { title: "Explore campaigns", description: "View approved public fundraising campaigns.", path: "/campaigns", icon: "↗", tag: "Discover" },
  ],
  admin: [
    { title: "Admin dashboard", description: "Review NGOs, campaigns, expenses and fund releases.", path: "/admin", icon: "↗", tag: "Administration" },
    { title: "Campaign management", description: "Review campaign submissions and their status.", path: "/admin", icon: "↗", tag: "Review queue" },
    { title: "Expense history", description: "Review recorded expenses and payment statuses.", path: "/expense-history", icon: "↗", tag: "Fund utilization" },
    { title: "Transparency records", description: "View public fundraising and expense information.", path: "/transparency", icon: "⌕", tag: "Open records" },
  ],
};

const styles = {
  page: {
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
    padding: "28px 28px 64px",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 13px",
    border: "1px solid #dce8db",
    borderRadius: "999px",
    background: "#f2f6ed",
    color: "#315c43",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.3px",
  },
  buttonPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "14px 20px",
    borderRadius: "11px",
    background: "#205c43",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "14px",
  },
  buttonSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 20px",
    borderRadius: "11px",
    background: "#fff",
    border: "1px solid #dfe6dc",
    color: "#315c43",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "14px",
  },
};

function Home() {
  const [user, setUser] = useState(null);
  const [checkingLogin, setCheckingLogin] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const token = sessionStorage.getItem("donatechainToken");

      if (!token) {
        if (!cancelled) {
          setUser(null);
          setCheckingLogin(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
          sessionStorage.removeItem("donatechainToken");
          sessionStorage.removeItem("donatechainUser");
          if (!cancelled) setUser(null);
          return;
        }

        sessionStorage.setItem("donatechainUser", JSON.stringify(data.user));
        if (!cancelled) setUser(data.user);
      } catch (error) {
        console.error("Could not load Home page user:", error);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setCheckingLogin(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const role = ["donor", "ngo", "admin"].includes(user?.role)
    ? user.role
    : "guest";
  const actions = actionData[role];

  return (
    <main style={styles.page}>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "38px",
          alignItems: "center",
          padding: "clamp(30px, 6vw, 76px)",
          border: "1px solid #e5e9dd",
          borderRadius: "28px",
          background: "linear-gradient(135deg, #f3f5e9 0%, #e7f0e5 58%, #dcebdd 100%)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={styles.eyebrow}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4d8a60" }} />
            TRANSPARENCY, BUILT INTO GIVING
          </div>

          <h1
            style={{
              maxWidth: "640px",
              margin: "25px 0 18px",
              fontFamily: "Manrope, sans-serif",
              fontSize: "clamp(38px, 5.5vw, 66px)",
              fontWeight: 800,
              letterSpacing: "-2.8px",
              lineHeight: 1.08,
              color: "#1d3f2d",
            }}
          >
            Giving that feels good.
            <br />
            <span style={{ color: "#43805a" }}>Tracking that feels clear.</span>
          </h1>

          <p style={{ maxWidth: "520px", margin: "0 0 28px", color: "#5e7062", fontSize: "16px", lineHeight: 1.8 }}>
            Support meaningful causes and follow the funding journey through
            transparent donation and expense records.
          </p>

          {user && (
            <p style={{ marginBottom: "20px", color: "#315c43", fontSize: "14px" }}>
              Welcome, <strong>{user.name || user.email}</strong> · {user.role.toUpperCase()} account
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Link to={user?.role === "ngo" ? "/create-campaign" : "/campaigns"} style={styles.buttonPrimary}>
              {user?.role === "ngo" ? "Manage campaigns" : "Explore campaigns"} <span>↗</span>
            </Link>
            <Link to="/transparency" style={styles.buttonSecondary}>
              Explore transparency
            </Link>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", marginTop: "30px", color: "#617366", fontSize: "12px" }}>
            <span>✓ On-chain donation records</span>
            <span>✓ Expense visibility</span>
            <span>✓ Wallet-based giving</span>
          </div>
        </div>

        <div
          aria-label="Abstract illustration of transparent giving"
          style={{
            position: "relative",
            display: "grid",
            placeItems: "center",
            minHeight: "280px",
            borderRadius: "24px",
            background: "rgba(255,255,255,0.46)",
            border: "1px solid rgba(255,255,255,0.8)",
          }}
        >
          <div style={{ position: "absolute", width: "220px", height: "220px", borderRadius: "50%", border: "1px solid #c3d9c3" }} />
          <div style={{ position: "absolute", width: "164px", height: "164px", borderRadius: "50%", border: "1px dashed #a5c5a9" }} />
          <div style={{ display: "grid", placeItems: "center", width: "112px", height: "112px", borderRadius: "32px", background: "#205c43", color: "#fff", boxShadow: "0 20px 40px rgba(32,92,67,0.22)", fontSize: "45px", transform: "rotate(-6deg)" }}>
            ♧
          </div>
          <div style={{ position: "absolute", top: "18%", left: "12%", padding: "12px 15px", borderRadius: "14px", background: "#fff", color: "#315c43", boxShadow: "0 8px 25px rgba(35,65,45,0.08)", fontSize: "12px", fontWeight: 700 }}>
            ✓ Recorded
          </div>
          <div style={{ position: "absolute", right: "8%", bottom: "20%", padding: "13px 15px", borderRadius: "14px", background: "#fff", color: "#315c43", boxShadow: "0 8px 25px rgba(35,65,45,0.08)", fontSize: "12px", fontWeight: 700 }}>
            ◈ Transparent trail
          </div>
        </div>
      </section>

      <section style={{ padding: "58px 0 10px" }}>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "25px" }}>
          <div>
            <p style={{ margin: "0 0 10px", color: "#538060", fontSize: "12px", fontWeight: 800, letterSpacing: "1.5px" }}>
              YOUR DONATECHAIN SPACE
            </p>
            <h2 style={{ margin: 0, fontSize: "clamp(26px, 3vw, 34px)", letterSpacing: "-1px" }}>
              {checkingLogin ? "Getting things ready..." : role === "guest" ? "A clearer way to give" : "Your next step"}
            </h2>
          </div>
          <p style={{ maxWidth: "450px", margin: 0, color: "#758178", fontSize: "14px" }}>
            {checkingLogin
              ? "Checking your account details."
              : role === "guest"
                ? "Explore campaigns, review records, or sign in to get started."
                : `Choose a tool for your ${role} account.`}
          </p>
        </div>

        {!checkingLogin && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 245px), 1fr))", gap: "18px" }}>
            {actions.map((action, index) => (
              <Link
                key={`${action.title}-${action.path}`}
                to={action.path}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "205px",
                  padding: "24px",
                  border: "1px solid #e6e9e1",
                  borderRadius: "18px",
                  background: "#fff",
                  boxShadow: "0 5px 20px rgba(35,65,45,0.035)",
                  textDecoration: "none",
                  color: "#24372d",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.transform = "translateY(-4px)";
                  event.currentTarget.style.boxShadow = "0 14px 30px rgba(35,65,45,0.09)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = "translateY(0)";
                  event.currentTarget.style.boxShadow = "0 5px 20px rgba(35,65,45,0.035)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px" }}>
                  <span style={{ display: "grid", placeItems: "center", width: "44px", height: "44px", borderRadius: "14px", background: index % 2 === 0 ? "#e8f1e9" : "#f2f1e6", color: "#205c43", fontSize: "22px", fontWeight: 700 }}>
                    {action.icon}
                  </span>
                  <span style={{ color: "#7a897c", fontSize: "11px", fontWeight: 700, letterSpacing: "0.4px" }}>
                    {action.tag}
                  </span>
                </div>
                <h3 style={{ margin: "0 0 10px", fontFamily: "Manrope, sans-serif", fontSize: "17px", fontWeight: 800 }}>
                  {action.title}
                </h3>
                <p style={{ margin: 0, color: "#758178", fontSize: "13px", lineHeight: 1.7 }}>
                  {action.description}
                </p>
                <span style={{ marginTop: "auto", paddingTop: "18px", color: "#43805a", fontSize: "13px", fontWeight: 800 }}>
                  Open section&nbsp; ↗
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "14px", marginTop: "42px" }}>
        {[
          { number: "01", title: "Discover a cause", description: "Browse available campaigns and their goals." },
          { number: "02", title: "Give with confidence", description: "Connect your wallet to use the donation flow." },
          { number: "03", title: "Follow the record", description: "Review on-chain transactions and recorded expenses." },
        ].map((item) => (
          <div key={item.number} style={{ display: "flex", gap: "15px", padding: "21px", borderRadius: "16px", background: "#f1f3e9", border: "1px solid #e6e9dc" }}>
            <span style={{ color: "#4b8059", fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: "14px" }}>{item.number}</span>
            <div>
              <h3 style={{ margin: "0 0 7px", fontSize: "14px" }}>{item.title}</h3>
              <p style={{ margin: 0, color: "#758178", fontSize: "12px", lineHeight: 1.6 }}>{item.description}</p>
            </div>
          </div>
        ))}
      </section>

      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "45px", paddingTop: "20px", borderTop: "1px solid #e5e9df", color: "#829084", fontSize: "12px" }}>
        <span>DonateChain · Transparent giving, clearer records.</span>
        <span>Demo project · Uses test ETH on Sepolia.</span>
      </footer>
    </main>
  );
}

export default Home;
