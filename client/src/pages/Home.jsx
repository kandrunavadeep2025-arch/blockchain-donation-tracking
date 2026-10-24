
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const API = "https://blockchain-donation-tracking.onrender.com/api";

const actionData = {
  guest: [
    { title: "Explore campaigns", description: "Discover causes and see which campaigns need support.", path: "/campaigns", icon: "↗", tag: "DISCOVER" },
    { title: "Follow the funds", description: "Explore campaign funding and recorded expenses.", path: "/transparency", icon: "◈", tag: "OPEN RECORDS" },
    { title: "Welcome back", description: "Sign in to access your DonateChain account.", path: "/login", icon: "↪", tag: "YOUR ACCOUNT" },
    { title: "Join our community", description: "Create an account and take part in transparent giving.", path: "/register", icon: "+", tag: "GET STARTED" },
  ],
  donor: [
    { title: "Explore campaigns", description: "Find a cause and make a donation using test ETH.", path: "/campaigns", icon: "↗", tag: "MAKE AN IMPACT" },
    { title: "My donations", description: "Review the donations associated with your account.", path: "/donation-history", icon: "◷", tag: "YOUR RECORDS" },
    { title: "Follow the funds", description: "Review campaign funding and recorded expenses.", path: "/transparency", icon: "◈", tag: "OPEN RECORDS" },
    { title: "My dashboard", description: "Visit your personal DonateChain dashboard.", path: "/dashboard", icon: "⌂", tag: "YOUR ACCOUNT" },
  ],
  ngo: [
    { title: "Create a campaign", description: "Submit a fundraising campaign for admin approval.", path: "/create-campaign", icon: "+", tag: "CAMPAIGN TOOLS" },
    { title: "Record an expense", description: "Submit an expense against your campaign funds.", path: "/add-expense", icon: "↗", tag: "FUND UTILIZATION" },
    { title: "Expense history", description: "Review recorded expenses and payment details.", path: "/expense-history", icon: "◷", tag: "YOUR RECORDS" },
    { title: "Explore campaigns", description: "View approved public fundraising campaigns.", path: "/campaigns", icon: "⌕", tag: "DISCOVER" },
  ],
  admin: [
    { title: "Admin dashboard", description: "Review NGOs, campaigns, expenses and fund releases.", path: "/admin", icon: "⌘", tag: "ADMINISTRATION" },
    { title: "Campaign management", description: "Review campaign submissions and their status.", path: "/admin", icon: "↗", tag: "REVIEW QUEUE" },
    { title: "Expense history", description: "Review recorded expenses and payment statuses.", path: "/expense-history", icon: "◷", tag: "FUND UTILIZATION" },
    { title: "Transparency records", description: "View public fundraising and expense information.", path: "/transparency", icon: "◈", tag: "OPEN RECORDS" },
  ],
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
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-eyebrow">
            <span className="home-status-dot" />
            TRANSPARENCY, BUILT INTO GIVING
          </div>

          <h1 className="home-title">
            Giving that feels good.
            <br />
            <span>Tracking that feels clear.</span>
          </h1>

          <p className="home-intro">
            Support meaningful causes and follow the funding journey through
            transparent donation and expense records.
          </p>

          {user && (
            <p className="home-welcome">
              Welcome, <strong>{user.name || user.email}</strong>
              <span> · {user.role.toUpperCase()} account</span>
            </p>
          )}

          <div className="home-hero-actions">
            <Link
              to={user?.role === "ngo" ? "/create-campaign" : "/campaigns"}
              className="home-button home-button-primary"
            >
              {user?.role === "ngo" ? "Manage campaigns" : "Explore campaigns"}
              <span>↗</span>
            </Link>

            <Link
              to="/transparency"
              className="home-button home-button-secondary"
            >
              Explore transparency
            </Link>
          </div>

          <div className="home-trust-points">
            <span>✓ On-chain donation records</span>
            <span>✓ Expense visibility</span>
            <span>✓ Wallet-based giving</span>
          </div>
        </div>

        <div className="home-visual" aria-label="Transparent giving illustration">
          <div className="home-orbit home-orbit-outer" />
          <div className="home-orbit home-orbit-inner" />

          <div className="home-center-mark">♧</div>

          <div className="home-floating-card home-recorded">
            <span className="home-floating-icon">✓</span>
            <span>
              <strong>Recorded</strong>
              <small>Donation activity</small>
            </span>
          </div>

          <div className="home-floating-card home-trail">
            <span className="home-floating-icon">◈</span>
            <span>
              <strong>Transparent trail</strong>
              <small>Traceable records</small>
            </span>
          </div>

          <div className="home-visual-caption">
            <span className="home-caption-dot" />
            Every contribution matters.
          </div>
        </div>

        <div className="home-hero-decoration home-decoration-one" />
        <div className="home-hero-decoration home-decoration-two" />
      </section>

      <section className="home-actions-section">
        <div className="home-section-heading">
          <div>
            <p className="home-section-label">YOUR DONATECHAIN SPACE</p>
            <h2>
              {checkingLogin
                ? "Getting things ready..."
                : role === "guest"
                  ? "A clearer way to give"
                  : "Your next step"}
            </h2>
          </div>

          <p>
            {checkingLogin
              ? "Checking your account details."
              : role === "guest"
                ? "Explore campaigns, review records, or sign in to get started."
                : `Choose a tool for your ${role} account.`}
          </p>
        </div>

        {!checkingLogin && (
          <div className="home-action-grid">
            {actions.map((action, index) => (
              <Link
                key={`${action.title}-${action.path}`}
                to={action.path}
                className="home-action-card"
                style={{ "--card-index": index }}
              >
                <div className="home-action-top">
                  <span className={`home-action-icon home-action-icon-${index % 2}`}>
                    {action.icon}
                  </span>
                  <span className="home-action-tag">{action.tag}</span>
                </div>

                <h3>{action.title}</h3>
                <p>{action.description}</p>

                <span className="home-action-link">
                  Open section <span>↗</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home-steps">
        {[
          {
            number: "01",
            title: "Discover a cause",
            description: "Browse available campaigns and their goals.",
          },
          {
            number: "02",
            title: "Give with confidence",
            description: "Connect your wallet to use the donation flow.",
          },
          {
            number: "03",
            title: "Follow the record",
            description: "Review on-chain transactions and recorded expenses.",
          },
        ].map((item) => (
          <div className="home-step" key={item.number}>
            <span className="home-step-number">{item.number}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </section>

      <footer className="home-footer">
        <span>DonateChain · Transparent giving, clearer records.</span>
        <span>Demo project · Uses test ETH on Sepolia.</span>
      </footer>
    </main>
  );
}

export default Home;
