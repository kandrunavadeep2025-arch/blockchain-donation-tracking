
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
  const [refreshing, setRefreshing] = useState(false);

  async function loadCampaigns() {
    setLoading(true);
    setRefreshing(true);
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
        "We couldn't load campaigns right now. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <main className="campaigns-page">
      <section className="campaigns-header">
        <div className="campaigns-heading-copy">
          <span className="campaigns-eyebrow">
            <span className="eyebrow-dot" />
            GIVING WITH TRANSPARENCY
          </span>

          <h1>
            Every contribution.
            <br />
            <span>A meaningful impact.</span>
          </h1>

          <p className="campaigns-subtitle">
            Discover active causes, support the work that matters to you,
            and follow fundraising progress recorded through blockchain.
          </p>

          <div className="campaigns-trust-note">
            <span className="trust-check">✓</span>
            Transparent fundraising · On-chain donation tracking
          </div>
        </div>

        <div className="campaigns-header-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-center">
            <span className="art-leaf">♧</span>
            <span className="art-center-label">GIVE</span>
            <span className="art-center-label">WITH CARE</span>
          </div>
          <span className="art-spark spark-one">✳</span>
          <span className="art-spark spark-two">✦</span>
          <span className="art-small-circle circle-one" />
          <span className="art-small-circle circle-two" />
        </div>
      </section>

      <section className="campaigns-list-section">
        <div className="campaigns-list-heading">
          <div>
            <span className="section-kicker">MAKE A DIFFERENCE</span>
            <h2>Explore campaigns</h2>
            <p>Choose a cause and see its progress in real time.</p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadCampaigns}
            disabled={refreshing}
          >
            <span aria-hidden="true">↻</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="campaign-state">
            <div className="loading-spinner" />
            <h3>Finding verified campaigns</h3>
            <p>Loading campaign information. This may take a moment.</p>
          </div>
        ) : error ? (
          <div className="campaign-state campaign-error-state" role="alert">
            <div className="state-symbol">!</div>
            <h3>Campaigns couldn't load</h3>
            <p>{error}</p>
            <button
              type="button"
              className="donate-button retry-button"
              onClick={loadCampaigns}
            >
              Try again <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="campaign-state">
            <div className="state-symbol">♡</div>
            <h3>Good causes are on their way</h3>
            <p>
              No approved campaigns are available yet. Once an administrator
              approves a campaign, it will appear here.
            </p>
            <button
              type="button"
              className="refresh-button"
              onClick={loadCampaigns}
            >
              Check again
            </button>
          </div>
        ) : (
          <>
            <div className="campaigns-results-line">
              <span>
                Showing <strong>{campaigns.length}</strong>{" "}
                {campaigns.length === 1 ? "campaign" : "campaigns"}
              </span>
              <span className="results-live">
                <span className="status-dot" />
                Live campaign data
              </span>
            </div>

            <div className="campaign-container">
              {campaigns.map((campaign) => {
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
                    <div className="campaign-card-top">
                      {campaign.imageUrl ? (
                        <img
                          className="campaign-image"
                          src={campaign.imageUrl}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          className="campaign-image-placeholder"
                          aria-hidden="true"
                        >
                          <span>♧</span>
                          <small>COMMUNITY IMPACT</small>
                        </div>
                      )}

                      <span
                        className={`campaign-status ${
                          completed ? "status-completed" : "status-active"
                        }`}
                      >
                        <span className="status-dot" />
                        {completed ? "Goal reached" : "Accepting donations"}
                      </span>
                    </div>

                    <div className="campaign-card-content">
                      <div className="campaign-title-row">
                        <h3>{campaign.name || "Community Campaign"}</h3>
                        <span className="campaign-number">
                          #{campaign.blockchainCampaignId}
                        </span>
                      </div>

                      <p className="description">
                        {campaign.description ||
                          "Support this cause and follow its fundraising progress."}
                      </p>

                      <div className="funding-summary">
                        <div>
                          <span className="metric-label">Raised so far</span>
                          <strong className="raised-amount">
                            {formatEth(raised)}
                            <small> ETH</small>
                          </strong>
                        </div>

                        <div className="goal-amount">
                          <span className="metric-label">Fundraising goal</span>
                          <strong>
                            {formatEth(goal)}
                            <small> ETH</small>
                          </strong>
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

                      <div className="progress-label">
                        <strong>{progress.toFixed(1)}% funded</strong>
                        <span>{formatEth(remaining)} ETH to goal</span>
                      </div>

                      <div className="expense-summary">
                        <span>
                          <span className="expense-check">✓</span>
                          Expenses paid to recipients
                        </span>
                        <strong>{formatEth(paid)} ETH</strong>
                      </div>

                      {completed ? (
                        <button
                          type="button"
                          className="donate-button"
                          disabled
                        >
                          Fundraising goal reached
                          <span aria-hidden="true">✓</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="donate-button"
                          onClick={() =>
                            navigate(
                              `/donate/${campaign.blockchainCampaignId}`
                            )
                          }
                        >
                          Support this cause
                          <span aria-hidden="true">↗</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="campaigns-bottom-note">
        <div className="bottom-note-icon">⌁</div>
        <div>
          <h3>Giving should come with clarity.</h3>
          <p>
            Donations and fund utilization are designed to be traceable.
            This project uses test ETH on the Sepolia test network.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Campaigns;
