
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { contract } from "../contract";
import { ethers } from "ethers";
import "./Dashboard.css";

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
  const [loadError, setLoadError] = useState(false);

  function handleLogout() {
    sessionStorage.removeItem("donatechainToken");
    sessionStorage.removeItem("donatechainUser");
    setUser(null);
    navigate("/login");
  }

  async function loadDashboardData() {
    setLoading(true);
    setLoadError(false);

    try {
      const donationCount = await contract.getDonationCount();
      let donationTotal = 0;

      for (let i = 0; i < Number(donationCount); i++) {
        const donation = await contract.getDonation(i);
        donationTotal += Number(ethers.formatEther(donation.amount));
      }

      const expenseCount = await contract.getExpenseCount();
      let expenseTotal = 0;
      let verified = 0;
      let pending = 0;

      for (let i = 0; i < Number(expenseCount); i++) {
        const expense = await contract.getExpense(i);
        expenseTotal += Number(ethers.formatEther(expense.amount));

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
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <main className="donor-dashboard">
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">YOUR DONATECHAIN SPACE</span>
          <h1>
            Welcome back{user?.name ? `, ${user.name}` : ""}
            <span className="welcome-period">.</span>
          </h1>
          <p>
            Every contribution matters. Here's a transparent view of
            donations and fund utilization on the blockchain.
          </p>
          {user?.email && (
            <div className="dashboard-user-email">
              <span className="user-email-dot" />
              {user.email}
            </div>
          )}
        </div>

        <button
          type="button"
          className="dashboard-logout"
          onClick={handleLogout}
        >
          <span aria-hidden="true">↗</span> Log out
        </button>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-eyebrow">THE BIG PICTURE</span>
            <h2>Fund overview</h2>
          </div>
          <button
            type="button"
            className="dashboard-refresh"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <span className="dashboard-spinner" />
            <p>Reading live data from the blockchain...</p>
          </div>
        ) : loadError ? (
          <div className="dashboard-error" role="alert">
            <span>We couldn't load the blockchain data.</span>
            <button type="button" onClick={loadDashboardData}>
              Try again
            </button>
          </div>
        ) : (
          <div className="dashboard-stat-grid">
            <article className="dashboard-stat-card donations-stat">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon" aria-hidden="true">↗</span>
                <span className="dashboard-stat-tag">INCOMING</span>
              </div>
              <p className="dashboard-stat-label">Total donations</p>
              <h3>{Number(totalDonations).toFixed(4)} <span>ETH</span></h3>
              <p className="dashboard-stat-note">
                <span className="stat-dot green-dot" />
                Recorded on the blockchain
              </p>
            </article>

            <article className="dashboard-stat-card expenses-stat">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon" aria-hidden="true">↘</span>
                <span className="dashboard-stat-tag">UTILIZATION</span>
              </div>
              <p className="dashboard-stat-label">Total expenses</p>
              <h3>{Number(totalExpenses).toFixed(4)} <span>ETH</span></h3>
              <p className="dashboard-stat-note">
                <span className="stat-dot amber-dot" />
                Recorded on the blockchain
              </p>
            </article>

            <article className="dashboard-stat-card verified-stat">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon" aria-hidden="true">✓</span>
                <span className="dashboard-stat-tag">APPROVED</span>
              </div>
              <p className="dashboard-stat-label">Verified expenses</p>
              <h3>{verifiedExpenses}</h3>
              <p className="dashboard-stat-note">
                <span className="stat-dot green-dot" />
                Verified by the admin
              </p>
            </article>

            <article className="dashboard-stat-card pending-stat">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon" aria-hidden="true">◷</span>
                <span className="dashboard-stat-tag">IN REVIEW</span>
              </div>
              <p className="dashboard-stat-label">Pending expenses</p>
              <h3>{pendingExpenses}</h3>
              <p className="dashboard-stat-note">
                <span className="stat-dot amber-dot" />
                Awaiting verification
              </p>
            </article>
          </div>
        )}
      </section>

      <section className="dashboard-actions-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-eyebrow">PICK UP WHERE YOU LEFT OFF</span>
            <h2>Quick actions</h2>
          </div>
        </div>

        <div className="dashboard-action-grid">
          <Link to="/campaigns" className="dashboard-action-card">
            <span className="dashboard-action-icon action-icon-green">♡</span>
            <span className="dashboard-action-copy">
              <strong>Explore campaigns</strong>
              <span>Find causes you care about and make a difference.</span>
            </span>
            <span className="dashboard-action-arrow" aria-hidden="true">↗</span>
          </Link>

          <Link to="/donation-history" className="dashboard-action-card">
            <span className="dashboard-action-icon action-icon-mint">≡</span>
            <span className="dashboard-action-copy">
              <strong>My donations</strong>
              <span>Review your donation history and contributions.</span>
            </span>
            <span className="dashboard-action-arrow" aria-hidden="true">↗</span>
          </Link>

          <Link to="/transparency" className="dashboard-action-card">
            <span className="dashboard-action-icon action-icon-cream">◇</span>
            <span className="dashboard-action-copy">
              <strong>Transparency centre</strong>
              <span>Explore fund usage and verification records.</span>
            </span>
            <span className="dashboard-action-arrow" aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className="dashboard-trust-banner">
        <div className="dashboard-trust-mark" aria-hidden="true">✓</div>
        <div>
          <strong>Built around transparency.</strong>
          <p>Donation and expense totals are read from the connected blockchain.</p>
        </div>
        <span className="dashboard-trust-label">BLOCKCHAIN RECORDED</span>
      </section>
    </main>
  );
}

export default Dashboard;
