
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
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

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
    textDecoration: "none",
    color: "#1f2937",
    whiteSpace: "nowrap",
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "18px",
        padding: "15px 25px",
        borderBottom: "1px solid #ddd",
        background: "white",
        flexWrap: "wrap",
      }}
    >
      <h2 style={{ marginRight: "10px" }}>DonateChain</h2>

      <Link style={linkStyle} to="/">Home</Link>

      <Link style={linkStyle} to="/campaigns">Campaigns</Link>

      <Link style={linkStyle} to="/transparency">Transparency</Link>

      {user && (
        <>
          <Link style={linkStyle} to="/dashboard">Dashboard</Link>

          <Link style={linkStyle} to="/donation-history">
            My Donations
          </Link>
        </>
      )}

      {user?.role === "ngo" && (
  <Link style={linkStyle} to="/create-campaign">
    Add Campaign
  </Link>
)}

      {user?.role === "ngo" && (
        <>
          <Link style={linkStyle} to="/add-expense">
            Add Expense
          </Link>

          <Link style={linkStyle} to="/expense-history">
            Expense History
          </Link>
        </>
      )}

      {user?.role === "admin" && (
        <Link style={linkStyle} to="/admin">
          Approve NGO / Admin
        </Link>
      )}

      {!user ? (
        <>
          <Link style={linkStyle} to="/login">Login</Link>
          <Link style={linkStyle} to="/register">Register</Link>
        </>
      ) : (
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      )}
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
          element={<DonationHistory />}
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
          element={<ExpenseHistory />}
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
          path="/add-expense"
          element={
            <ProtectedRoute allowedRoles={["ngo"]}>
              <AddExpense />
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
