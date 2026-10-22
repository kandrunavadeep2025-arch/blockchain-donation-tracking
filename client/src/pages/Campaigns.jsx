
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

      // The backend already verifies on-chain campaign status.
      // Never add hardcoded or sample campaigns here.
      const visibleCampaigns = (data.campaigns || []).filter(
        (campaign) =>
          ["active", "completed"].includes(campaign.status) &&
          Number.isInteger(Number(campaign.blockchainCampaignId))
      );

      setCampaigns(visibleCampaigns);
    } catch (err) {
      console.error("Campaign loading error:", err);

      setError(
        "Could not load campaigns. Check that the backend and Hardhat node are running."
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
        <p role="alert">{error}</p>
        <button onClick={loadCampaigns}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="campaigns-page">
      <h1>Donation Campaigns</h1>

      <p className="campaigns-subtitle">
        Support verified campaigns. All amounts are shown in test ETH.
      </p>

      <button
        type="button"
        onClick={loadCampaigns}
        disabled={loading}
      >
        Refresh Campaigns
      </button>

      <div className="campaign-container">
        {campaigns.length === 0 ? (
          <div className="campaign-card">
            <h2>No approved campaigns yet</h2>
            <p>
              New NGO campaigns appear here after an administrator approves
              them. Sample campaigns are not displayed.
            </p>
          </div>
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
                    src={campaign.imageUrl}
                    alt={campaign.name}
                    style={{
                      width: "100%",
                      maxHeight: "220px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}

                <h2>{campaign.name}</h2>

                <p className="description">
                  {campaign.description}
                </p>

                <p>
                  <strong>Campaign ID:</strong>{" "}
                  {campaign.blockchainCampaignId}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {completed ? "Completed" : "Active"}
                </p>

                <p>
                  <strong>Fundraising Goal:</strong>{" "}
                  {formatEth(goal)} ETH
                </p>

                <p>
                  <strong>Total Raised:</strong>{" "}
                  {formatEth(raised)} ETH
                </p>

                <div
                  role="progressbar"
                  aria-label={`Fundraising progress for ${campaign.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  style={{
                    height: "10px",
                    background: "#e5e7eb",
                    borderRadius: "999px",
                    overflow: "hidden",
                    margin: "12px 0",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: completed ? "#16a34a" : "#2563eb",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <p>
                  <strong>Progress:</strong> {progress.toFixed(2)}%
                </p>

                <p>
                  <strong>Remaining to Goal:</strong>{" "}
                  {formatEth(remaining)} ETH
                </p>

                <p>
                  <strong>Expenses Paid to Recipients:</strong>{" "}
                  {formatEth(paid)} ETH
                </p>

                {completed ? (
                  <button type="button" disabled>
                    Fundraising Goal Reached
                  </button>
                ) : (
                  <button
                    className="donate-button"
                    onClick={() =>
                      navigate(
                        `/donate/${campaign.blockchainCampaignId}`
                      )
                    }
                  >
                    Donate ETH
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Campaigns;
