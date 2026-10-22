
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:5000/api";

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "20px",
  textDecoration: "none",
  color: "inherit",
  background: "#ffffff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  display: "block",
};

const actionData = {
  guest: [
    {
      title: "Browse Campaigns",
      description: "Explore approved fundraising campaigns.",
      path: "/campaigns",
      icon: "❤️",
    },
    {
      title: "Transparency",
      description: "Review campaign funding and expense records.",
      path: "/transparency",
      icon: "🔎",
    },
    {
      title: "Login",
      description: "Sign in to access your DonateChain account.",
      path: "/login",
      icon: "🔐",
    },
    {
      title: "Register",
      description: "Create an account to join DonateChain.",
      path: "/register",
      icon: "👤",
    },
  ],

  donor: [
    {
      title: "Browse Campaigns",
      description: "Find a cause and make a donation using test ETH.",
      path: "/campaigns",
      icon: "❤️",
    },
    {
      title: "My Donation History",
      description: "View donations recorded by your connected wallet.",
      path: "/donation-history",
      icon: "📜",
    },
    {
      title: "Transparency",
      description: "Review campaign funding and recorded expenses.",
      path: "/transparency",
      icon: "🔎",
    },
    {
      title: "My Dashboard",
      description: "Open your personal dashboard.",
      path: "/dashboard",
      icon: "📊",
    },
  ],

  ngo: [
    {
      title: "Add Campaign",
      description: "Create a fundraising campaign for admin approval.",
      path: "/create-campaign",
      icon: "➕",
    },
    {
      title: "Add Expense",
      description: "Record an expense against your campaign's funds.",
      path: "/add-expense",
      icon: "🧾",
    },
    {
      title: "Expense History",
      description: "Review campaign totals, expenses and payments.",
      path: "/expense-history",
      icon: "📜",
    },
    {
      title: "Browse Campaigns",
      description: "View currently approved public campaigns.",
      path: "/campaigns",
      icon: "❤️",
    },
  ],

  admin: [
    {
      title: "Admin Dashboard",
      description: "Approve NGOs and campaigns, verify expenses and release funds.",
      path: "/admin",
      icon: "🛡️",
    },
    {
      title: "Campaign Management",
      description: "Review pending campaigns and manage their status.",
      path: "/admin",
      icon: "📋",
    },
    {
      title: "Expense History",
      description: "Review recorded expenses and payment statuses.",
      path: "/expense-history",
      icon: "📜",
    },
    {
      title: "Transparency",
      description: "View public fundraising and expense information.",
      path: "/transparency",
      icon: "🔎",
    },
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
          sessionStorage.removeItem("donatechainToken");
          sessionStorage.removeItem("donatechainUser");

          if (!cancelled) setUser(null);
          return;
        }

        sessionStorage.setItem(
          "donatechainUser",
          JSON.stringify(data.user)
        );

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
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      <section style={{ textAlign: "center", padding: "28px 0 35px" }}>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", marginBottom: "12px" }}>
          Welcome to DonateChain
        </h1>

        <p style={{ fontSize: "18px", color: "#4b5563" }}>
          Transparent Donation Tracking and Fund Utilization System
        </p>

        <p style={{ color: "#6b7280", lineHeight: 1.7 }}>
          Donate with confidence and track how funds are utilized.
        </p>

        {user && (
          <p>
            Welcome, <strong>{user.name || user.email}</strong>!
            {" "}Your role: <strong>{user.role.toUpperCase()}</strong>
          </p>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "8px" }}>Quick Actions</h2>

        <p style={{ color: "#6b7280", marginBottom: "22px" }}>
          {checkingLogin
            ? "Checking your account..."
            : role === "guest"
              ? "Explore DonateChain or log in to access your account."
              : `Choose an action available to your ${role} account.`}
        </p>

        {!checkingLogin && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "18px",
            }}
          >
            {actions.map((action) => (
              <Link
                key={`${action.title}-${action.path}`}
                to={action.path}
                style={cardStyle}
              >
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>
                  {action.icon}
                </div>

                <h3 style={{ margin: "0 0 10px" }}>
                  {action.title}
                </h3>

                <p style={{ color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p
        style={{
          marginTop: "35px",
          fontSize: "13px",
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        DonateChain currently uses test ETH on a development blockchain.
      </p>
    </main>
  );
}

export default Home;
