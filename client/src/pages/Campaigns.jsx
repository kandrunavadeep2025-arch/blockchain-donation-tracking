
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Campaigns.css";

const API = "https://blockchain-donation-tracking.onrender.com/api";

function formatEth(value) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) return "0";

  if (amount !== 0 && Math.abs(amount) < 0.00000001) {
    return "<0.00000001";
  }

  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function Campaigns() {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCampaigns() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/campaigns`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to fetch campaigns.");
      }

      const visibleCampaigns = (data.campaigns || []).filter(
        (campaign) =>
          ["active", "completed"].includes(campaign.status) &&
          Number.isInteger(Number(campaign.blockchainCampaignId))
      );

      setCampaigns(visibleCampaigns);
    } catch (err) {
      console.error("Campaign loading error:", err);
      setError(
        "Could not load campaigns. Please check the backend connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  if (loading) {
    return (
      <div className="campaigns-page">
        <h1>Donation Campaigns</h1>
        <p>Loading verified blockchain campaign data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaigns-page">
        <h1>Donation Campaigns</h1>
        <p className="campaigns-error" role="alert">{error}</p>
        <button type="button" onClick={loadCampaigns}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <main className="campaigns-page">
      <div className="campaigns-header">
        <p className="campaigns-eyebrow">TRANSPARENCY STARTS HERE</p>
        <h1>Donation Campaigns</h1>
        <p className="campaigns-subtitle">
          Support verified campaigns and follow how funds are raised and used.
          All amounts are displayed in test ETH.
        </p>

        <button
          type="button"
          className="refresh-button"
          onClick={loadCampaigns}
        >
          Refresh Campaigns
        </button>
      </div>

      <div className="campaign-container">
        {campaigns.length === 0 ? (
          <section className="campaign-empty">
            <div className="empty-icon">♡</div>
            <h2>No approved campaigns yet</h2>
            <p>
              Campaigns will appear here after an administrator approves them.
              Sample campaigns are not displayed.
            </p>
          </section>
        ) : (
          campaigns.map((campaign) => {
            const goal = Number(campaign.goalAmount ?? 0);
            const raised = Number(campaign.totalRaisedEth ?? 0);
            const paid = Number(campaign.totalPaidEth ?? 0);
            const remaining = Number(
              campaign.remainingGoalEth ?? Math.max(goal - raised, 0)
            );

            const progress =
              goal > 0
                ? Math.min(100, Math.max(0, (raised / goal) * 100))
                : 0;

            const completed =
              campaign.status === "completed" ||
              (goal > 0 && raised >= goal);

            return (
              <article
                className="campaign-card"
                key={campaign.blockchainCampaignId}
              >
                {campaign.imageUrl && (
                  <img
                    className="campaign-image"
                    src={campaign.imageUrl}
                    alt={campaign.name || "Campaign"}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}

                <div className="campaign-card-content">
                  <span
                    className={`campaign-status ${
                      completed ? "status-completed" : "status-active"
                    }`}
                  >
                    <span className="status-dot" />
                    {completed ? "Completed" : "Active"}
                  </span>

                  <h2>{campaign.name}</h2>

                  <p className="description">
                    {campaign.description || "No description provided."}
                  </p>

                  <p className="campaign-id">
                    Campaign ID: {campaign.blockchainCampaignId}
                  </p>

                  <div className="funding-summary">
                    <div>
                      <span className="metric-label">Total raised</span>
                      <strong className="raised-amount">
                        {formatEth(raised)} ETH
                      </strong>
                    </div>

                    <div className="goal-amount">
                      <span className="metric-label">Goal</span>
                      <strong>{formatEth(goal)} ETH</strong>
                    </div>
                  </div>

                  <div
                    className="campaign-progress"
                    role="progressbar"
                    aria-label={`Fundraising progress for ${campaign.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                  >
                    <div
                      className={`campaign-progress-fill ${
                        completed ? "progress-completed" : ""
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="progress-label">
                    <span>{progress.toFixed(1)}% funded</span>
                    <span>{formatEth(remaining)} ETH remaining</span>
                  </p>

                  <div className="expense-summary">
                    <span>Expenses paid to recipients</span>
                    <strong>{formatEth(paid)} ETH</strong>
                  </div>

                  {completed ? (
                    <button
                      type="button"
                      className="donate-button"
                      disabled
                    >
                      Fundraising Goal Reached
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="donate-button"
                      onClick={() =>
                        navigate(`/donate/${campaign.blockchainCampaignId}`)
                      }
                    >
                      Donate ETH <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}

export default Campaigns;
