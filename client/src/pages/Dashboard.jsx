import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { contract } from "../contract";
import { ethers } from "ethers";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("donatechainUser") || "null"
      );
    } catch {
      return null;
    }
  });

  const [totalDonations, setTotalDonations] = useState("0");
  const [totalExpenses, setTotalExpenses] = useState("0");
  const [verifiedExpenses, setVerifiedExpenses] = useState(0);
  const [pendingExpenses, setPendingExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  function handleLogout() {
    sessionStorage.removeItem("donatechainToken");
    sessionStorage.removeItem("donatechainUser");
    setUser(null);
    navigate("/login");
  }

  async function loadDashboardData() {
    try {
      const donationCount = await contract.getDonationCount();
      let donationTotal = 0;

      for (let i = 0; i < Number(donationCount); i++) {
        const donation = await contract.getDonation(i);
        donationTotal += Number(
          ethers.formatEther(donation.amount)
        );
      }

      const expenseCount = await contract.getExpenseCount();
      let expenseTotal = 0;
      let verified = 0;
      let pending = 0;

      for (let i = 0; i < Number(expenseCount); i++) {
        const expense = await contract.getExpense(i);
        expenseTotal += Number(
          ethers.formatEther(expense.amount)
        );

        if (expense.verified) {
          verified++;
        } else {
          pending++;
        }
      }

      setTotalDonations(donationTotal);
      setTotalExpenses(expenseTotal);
      setVerifiedExpenses(verified);
      setPendingExpenses(pending);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div
      style={{
        padding: "40px",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <h1 style={{ color: "#111827" }}>
            {user?.name
              ? `${user.name}'s Dashboard`
              : "Donor Dashboard"}
          </h1>

          <p style={{ color: "#475569" }}>
            Welcome{user?.name ? `, ${user.name}` : ""} to your DonateChain dashboard.
          </p>

          {user?.email && (
            <p style={{ color: "#64748b" }}>
              {user.email}
            </p>
          )}
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px 18px",
            cursor: "pointer",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            backgroundColor: "black",
          }}
        >
          Logout
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#111827" }}>
          Loading blockchain data...
        </p>
      ) : (
        <>
          <h2 style={{ marginTop: "30px", color: "#111827" }}>
            Fund Overview
          </h2>

          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#eff6ff",
                padding: "25px",
                borderRadius: "12px",
                width: "200px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h3 style={{ color: "#111827" }}>
                💰 Total Donations
              </h3>
              <h2 style={{ color: "#111827" }}>
                {totalDonations.toFixed(4)} ETH
              </h2>
              <p style={{ color: "#475569" }}>
                Recorded on blockchain
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#fef2f2",
                padding: "25px",
                borderRadius: "12px",
                width: "200px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h3 style={{ color: "#111827" }}>
                💸 Total Expenses
              </h3>
              <h2 style={{ color: "#111827" }}>
                {totalExpenses.toFixed(4)} ETH
              </h2>
              <p style={{ color: "#475569" }}>
                Recorded on blockchain
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#f0fdf4",
                padding: "25px",
                borderRadius: "12px",
                width: "200px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h3 style={{ color: "#111827" }}>
                ✅ Verified Expenses
              </h3>
              <h2 style={{ color: "#111827" }}>
                {verifiedExpenses}
              </h2>
              <p style={{ color: "#475569" }}>
                Approved by admin
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#fff7ed",
                padding: "25px",
                borderRadius: "12px",
                width: "200px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h3 style={{ color: "#111827" }}>
                ⏳ Pending Expenses
              </h3>
              <h2 style={{ color: "#111827" }}>
                {pendingExpenses}
              </h2>
              <p style={{ color: "#475569" }}>
                Waiting for verification
              </p>
            </div>
          </div>
        </>
      )}

      <hr
        style={{
          margin: "40px 0",
          border: "none",
          borderTop: "1px solid #cbd5e1",
        }}
      />

      <h2 style={{ color: "#111827" }}>
        Quick Actions
      </h2>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        <Link to="/campaigns">
          <button style={{ padding: "10px 18px", cursor: "pointer" }}>
            Browse Campaigns
          </button>
        </Link>

        <Link to="/donation-history">
          <button style={{ padding: "10px 18px", cursor: "pointer" }}>
            My Donations
          </button>
        </Link>

        <Link to="/transparency">
          <button style={{ padding: "10px 18px", cursor: "pointer" }}>
            View Transparency
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;