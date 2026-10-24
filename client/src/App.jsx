
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Campaigns from "./pages/Campaigns";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Donate from "./pages/Donate";
import DonationHistory from "./pages/DonationHistory";
import AddExpense from "./pages/AddExpense";
import ExpenseHistory from "./pages/ExpenseHistory";
import AdminDashboard from "./pages/AdminDashboard";
import Transparency from "./pages/Transparency";
import CreateCampaign from "./pages/CreateCampaign";
import ProtectedRoute from "./components/ProtectedRoute";

function RoleNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    const token = sessionStorage.getItem("donatechainToken");

    async function loadUser() {
      if (!token) {
        if (active) setUser(null);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL;

        const response = await fetch(`${apiUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
          sessionStorage.removeItem("donatechainToken");
          sessionStorage.removeItem("donatechainUser");

          if (active) setUser(null);
          return;
        }

        sessionStorage.setItem(
          "donatechainUser",
          JSON.stringify(data.user)
        );

        if (active) setUser(data.user);
      } catch (error) {
        console.error("Could not load navigation user:", error);
        if (active) setUser(null);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [location.pathname]);

  function handleLogout() {
    sessionStorage.removeItem("donatechainToken");
    sessionStorage.removeItem("donatechainUser");
    setUser(null);
    navigate("/login");
  }

  const linkStyle = {
    display: "inline-block",
    textDecoration: "none",
    color: "#53665a",
    fontSize: "14px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    padding: "9px 12px",
    borderRadius: "9px",
    transition: "background 0.2s ease",
  };

  function navLink(to, label) {
    const active = location.pathname === to;

    return (
      <Link
        key={to}
        to={to}
        style={{
          ...linkStyle,
          background: active ? "#e8f1e9" : "transparent",
          color: active ? "#205c43" : "#53665a",
        }}
      >
        {label}
      </Link>
    );
  }

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "15px clamp(18px, 5vw, 72px)",
        background: "rgba(250, 249, 244, 0.96)",
        borderBottom: "1px solid #e7e9e1",
        backdropFilter: "blur(14px)",
        flexWrap: "wrap",
      }}
    >
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
          color: "#205c43",
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: "42px",
            height: "42px",
            borderRadius: "14px",
            background: "#205c43",
            color: "#ffffff",
            fontSize: "22px",
          }}
        >
          ♧
        </span>

        <span>
          <strong
            style={{
              display: "block",
              fontFamily: "Manrope, sans-serif",
              fontSize: "20px",
              letterSpacing: "-0.7px",
            }}
          >
            DonateChain
          </strong>

          <small style={{ color: "#758178", fontSize: "11px" }}>
            Giving with transparency
          </small>
        </span>
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          flexWrap: "wrap",
        }}
      >
        {navLink("/", "Home")}
        {navLink("/campaigns", "Campaigns")}
        {navLink("/transparency", "Transparency")}

        {user && (
          <>
            {navLink("/dashboard", "Dashboard")}
            {navLink("/donation-history", "My Donations")}
          </>
        )}

        {user?.role === "ngo" && (
          <>
            {navLink("/create-campaign", "Add Campaign")}
            {navLink("/add-expense", "Add Expense")}
            {navLink("/expense-history", "Expense History")}
          </>
        )}

        {user?.role === "admin" &&
          navLink("/admin", "Approve NGO / Admin")}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {!user ? (
          <>
            <Link
              to="/login"
              style={{
                ...linkStyle,
                color: "#205c43",
              }}
            >
              Login
            </Link>

            <Link
              to="/register"
              style={{
                ...linkStyle,
                background: "#205c43",
                color: "#ffffff",
                padding: "11px 18px",
              }}
            >
              Get Started ↗
            </Link>
          </>
        ) : (
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 16px",
              border: "1px solid #dce5dc",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#205c43",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RoleNavigation />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/donate/:id" element={<Donate />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/donation-history"
          element={
            <ProtectedRoute>
              <DonationHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-campaign"
          element={
            <ProtectedRoute allowedRoles={["ngo"]}>
              <CreateCampaign />
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-expense"
          element={
            <ProtectedRoute allowedRoles={["ngo"]}>
              <AddExpense />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expense-history"
          element={
            <ProtectedRoute allowedRoles={["ngo"]}>
              <ExpenseHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transparency"
          element={<Transparency />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
