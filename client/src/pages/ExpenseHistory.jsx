
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { contract } from "../contract";
import "./ExpenseHistory.css";

const campaignStatuses = [
  "Pending",
  "Active",
  "Completed",
  "Removed",
];

function formatEth(value) {
  const amount = Number(ethers.formatEther(value));

  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function ExpenseHistory() {
  const [expenses, setExpenses] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const campaignCount = Number(await contract.getCampaignCount());
      const expenseCount = Number(await contract.getExpenseCount());

      const campaignResults = await Promise.all(
        Array.from({ length: campaignCount }, async (_, index) => {
          const campaignId = index + 1;

          const [campaign, reserved] = await Promise.all([
            contract.getCampaign(campaignId),
            contract.campaignExpenses(campaignId),
          ]);

          const raised = campaign.totalRaised;

          return {
            id: campaignId,
            name: campaign.name,
            status: campaignStatuses[Number(campaign.status)],
            goal: formatEth(campaign.goalAmount),
            raised: formatEth(raised),
            reserved: formatEth(reserved),
            paid: formatEth(campaign.totalPaid),
            available: formatEth(
              raised >= reserved ? raised - reserved : 0n
            ),
          };
        })
      );

      const expenseResults = await Promise.all(
        Array.from({ length: expenseCount }, async (_, index) => {
          const expense = await contract.getExpenseDetails(index);

          let campaignName = `Campaign #${expense.campaignId}`;

          try {
            const campaign = await contract.getCampaign(
              Number(expense.campaignId)
            );
            campaignName = campaign.name;
          } catch {
            // Retain the campaign ID if details are unavailable.
          }

          return {
            index,
            campaignId: Number(expense.campaignId),
            campaignName,
            amount: formatEth(expense.amount),
            purpose: expense.purpose,
            timestamp: new Date(
              Number(expense.timestamp) * 1000
            ).toLocaleString(),
            verified: expense.verified,
            released: expense.released,
            recipient: expense.recipient,
          };
        })
      );

      setCampaigns(campaignResults.reverse());
      setExpenses(expenseResults.reverse());
    } catch (err) {
      console.error("Expense history loading error:", err);

      setError(
        "Could not load blockchain history. Check that your blockchain is running and the contract address is correct."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const totalRaised = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.raised),
    0
  );

  const totalReserved = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.reserved),
    0
  );

  const totalPaid = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.paid),
    0
  );

  const verifiedCount = expenses.filter(
    (expense) => expense.verified
  ).length;

  const pendingCount = expenses.filter(
    (expense) => !expense.verified
  ).length;

  const releasedCount = expenses.filter(
    (expense) => expense.released
  ).length;

  if (loading) {
    return (
      <main className="expense-history-page">
        <div className="expense-history-loading">
          <span className="expense-history-spinner" />
          <h2>Reading the blockchain</h2>
          <p>Loading campaign funds and recorded expenses…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="expense-history-page">
      <div className="expense-history-container">
        <header className="expense-history-hero">
          <div className="expense-history-hero-copy">
            <span className="expense-history-eyebrow">
              NGO WORKSPACE · FINANCIAL RECORDS
            </span>

            <h1>
              Every fund.
              <br />
              <span>Every expense.</span>
            </h1>

            <p>
              Follow campaign funds from donations to recorded expenses.
              Review verification and payment statuses using data read
              directly from the DonationTracker smart contract.
            </p>

            <div className="expense-history-hero-actions">
              <button
                className="expense-history-primary-button"
                onClick={() => loadHistory(true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <>
                    <span className="expense-history-button-spinner" />
                    Refreshing…
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">↻</span>
                    Refresh blockchain data
                  </>
                )}
              </button>

              <Link
                className="expense-history-secondary-button"
                to="/add-expense"
              >
                + Record an expense
              </Link>
            </div>
          </div>

          <div className="expense-history-hero-art" aria-hidden="true">
            <div className="expense-history-art-circle expense-history-art-circle-one" />
            <div className="expense-history-art-circle expense-history-art-circle-two" />

            <div className="expense-history-art-card">
              <span className="expense-history-art-icon">↗</span>
              <span className="expense-history-art-label">
                FUND TRANSPARENCY
              </span>
              <strong>Visible by design.</strong>
              <div className="expense-history-art-line">
                <span />
              </div>
              <div className="expense-history-art-footer">
                <span>On-chain records</span>
                <span className="expense-history-live-dot" />
              </div>
            </div>

            <div className="expense-history-art-orbit">
              <span>✓</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="expense-history-error" role="alert">
            <span className="expense-history-error-icon">!</span>
            <div>
              <strong>Couldn’t load blockchain data</strong>
              <p>{error}</p>
              <button onClick={() => loadHistory()}>
                Try again
              </button>
            </div>
          </div>
        )}

        <section className="expense-history-overview">
          <div className="expense-history-section-heading">
            <div>
              <span className="expense-history-eyebrow">
                THE BIG PICTURE
              </span>
              <h2>Campaign fund summary</h2>
            </div>

            <span className="expense-history-chain-label">
              <span className="expense-history-live-dot" />
              Smart contract data
            </span>
          </div>

          <div className="expense-history-stat-grid">
            <article className="expense-history-stat-card expense-history-stat-highlight">
              <div className="expense-history-stat-top">
                <span>Total raised</span>
                <span className="expense-history-stat-icon">↗</span>
              </div>
              <strong>{totalRaised.toLocaleString("en-US", {
                maximumFractionDigits: 8,
              })}</strong>
              <span className="expense-history-stat-unit">Test ETH across campaigns</span>
            </article>

            <article className="expense-history-stat-card">
              <div className="expense-history-stat-top">
                <span>Funds reserved</span>
                <span className="expense-history-stat-icon">◷</span>
              </div>
              <strong>{totalReserved.toLocaleString("en-US", {
                maximumFractionDigits: 8,
              })}</strong>
              <span className="expense-history-stat-unit">Test ETH allocated to expenses</span>
            </article>

            <article className="expense-history-stat-card">
              <div className="expense-history-stat-top">
                <span>Actually paid</span>
                <span className="expense-history-stat-icon">✓</span>
              </div>
              <strong>{totalPaid.toLocaleString("en-US", {
                maximumFractionDigits: 8,
              })}</strong>
              <span className="expense-history-stat-unit">Test ETH paid to recipients</span>
            </article>

            <article className="expense-history-stat-card">
              <div className="expense-history-stat-top">
                <span>Recorded expenses</span>
                <span className="expense-history-stat-icon">≡</span>
              </div>
              <strong>{expenses.length}</strong>
              <span className="expense-history-stat-unit">
                {verifiedCount} verified · {pendingCount} pending
              </span>
            </article>
          </div>
        </section>

        <section className="expense-history-campaign-section">
          <div className="expense-history-section-heading">
            <div>
              <span className="expense-history-eyebrow">
                CAMPAIGN BY CAMPAIGN
              </span>
              <h2>Where the funds stand</h2>
              <p className="expense-history-section-description">
                A breakdown of fundraising goals, reserved funds, and
                payments recorded by the contract.
              </p>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="expense-history-empty">
              <span className="expense-history-empty-icon">◌</span>
              <h3>No campaigns found</h3>
              <p>Campaign records will appear here when they exist on the blockchain.</p>
              <Link to="/campaigns">Explore campaigns</Link>
            </div>
          ) : (
            <div className="expense-history-campaign-grid">
              {campaigns.map((campaign) => (
                <article
                  className="expense-history-campaign-card"
                  key={campaign.id}
                >
                  <div className="expense-history-campaign-card-top">
                    <span className="expense-history-campaign-id">
                      CAMPAIGN #{campaign.id}
                    </span>
                    <span
                      className={`expense-history-status expense-history-status-${campaign.status?.toLowerCase()}`}
                    >
                      {campaign.status || "Unknown"}
                    </span>
                  </div>

                  <h3>{campaign.name}</h3>

                  <div className="expense-history-raised-label">
                    Total raised
                  </div>

                  <div className="expense-history-raised-amount">
                    {campaign.raised} <span>ETH</span>
                  </div>

                  <div className="expense-history-goal">
                    Goal: {campaign.goal} ETH
                  </div>

                  <div className="expense-history-fund-details">
                    <div>
                      <span>Reserved</span>
                      <strong>{campaign.reserved} ETH</strong>
                    </div>
                    <div>
                      <span>Actually paid</span>
                      <strong>{campaign.paid} ETH</strong>
                    </div>
                    <div className="expense-history-available-row">
                      <span>Unreserved funds</span>
                      <strong>{campaign.available} ETH</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="expense-history-records-section">
          <div className="expense-history-section-heading">
            <div>
              <span className="expense-history-eyebrow">
                THE TRANSACTION TRAIL
              </span>
              <h2>Recorded expenses</h2>
              <p className="expense-history-section-description">
                Each entry shows its purpose, recipient, admin verification,
                and payment status.
              </p>
            </div>

            <div className="expense-history-record-count">
              {expenses.length} {expenses.length === 1 ? "record" : "records"}
            </div>
          </div>

          <div className="expense-history-status-summary">
            <div>
              <span className="expense-history-status-summary-icon verified">✓</span>
              <span>Verified</span>
              <strong>{verifiedCount}</strong>
            </div>
            <div>
              <span className="expense-history-status-summary-icon pending">◷</span>
              <span>Awaiting review</span>
              <strong>{pendingCount}</strong>
            </div>
            <div>
              <span className="expense-history-status-summary-icon paid">↗</span>
              <span>Paid to recipient</span>
              <strong>{releasedCount}</strong>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="expense-history-empty">
              <span className="expense-history-empty-icon">≡</span>
              <h3>No expenses recorded yet</h3>
              <p>
                When an expense is recorded on the blockchain, its details
                and verification status will appear here.
              </p>
              <Link to="/add-expense">Record an expense</Link>
            </div>
          ) : (
            <div className="expense-history-record-list">
              {expenses.map((expense) => (
                <article
                  className="expense-history-record-card"
                  key={expense.index}
                >
                  <div className="expense-history-record-icon">
                    <span>↗</span>
                  </div>

                  <div className="expense-history-record-main">
                    <div className="expense-history-record-title-row">
                      <div>
                        <span className="expense-history-record-number">
                          EXPENSE #{expense.index + 1}
                        </span>
                        <h3>{expense.purpose || "Expense record"}</h3>
                      </div>

                      <strong className="expense-history-record-amount">
                        {expense.amount} <span>ETH</span>
                      </strong>
                    </div>

                    <p className="expense-history-record-campaign">
                      {expense.campaignName} · Campaign #{expense.campaignId}
                    </p>

                    <div className="expense-history-record-meta">
                      <div>
                        <span>Recipient</span>
                        <code title={expense.recipient}>
                          {expense.recipient}
                        </code>
                      </div>
                      <div>
                        <span>Recorded at</span>
                        <strong>{expense.timestamp}</strong>
                      </div>
                    </div>

                    <div className="expense-history-record-badges">
                      <span
                        className={`expense-history-badge ${
                          expense.verified ? "is-verified" : "is-pending"
                        }`}
                      >
                        <span>{expense.verified ? "✓" : "◷"}</span>
                        {expense.verified ? "Admin verified" : "Pending verification"}
                      </span>

                      <span
                        className={`expense-history-badge ${
                          expense.released ? "is-paid" : "is-unpaid"
                        }`}
                      >
                        <span>{expense.released ? "✓" : "○"}</span>
                        {expense.released ? "Paid to recipient" : "Not yet paid"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="expense-history-footer-note">
          <span className="expense-history-footer-icon">◇</span>
          <p>
            <strong>Built for accountability.</strong> Recorded transactions
            remain part of the blockchain history, even if a campaign is later
            removed from active listings. Amounts shown here are test ETH.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default ExpenseHistory;
