
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ethers } from "ethers";
import { contract } from "../contract";
import "./Donate.css";

const API = "https://blockchain-donation-tracking.onrender.com/api";
const SEPOLIA_CHAIN_ID = 11155111n;

export default function Donate() {
  const { id } = useParams();

  const [campaign, setCampaign] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCampaign() {
      try {
        setError("");

        const response = await fetch(`${API}/campaigns`);

        if (!response.ok) {
          throw new Error("Could not load campaigns from the server.");
        }

        const data = await response.json();
        const campaigns = Array.isArray(data)
          ? data
          : data.campaigns || [];

        const selected = campaigns.find(
          (item) =>
            String(item.blockchainCampaignId ?? item.campaignId ?? item.id) ===
            String(id)
        );

        if (!selected) {
          throw new Error(
            "Campaign not found. Check that the campaign ID in the URL is correct."
          );
        }

        setCampaign(selected);
      } catch (err) {
        setError(err.message || "Failed to load campaign.");
      }
    }

    loadCampaign();
  }, [id]);

  async function makeDonation(event) {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!window.ethereum) {
      setError("Please install MetaMask first.");
      return;
    }

    if (
      !/^\d+(\.\d{1,18})?$/.test(amount) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      setError("Enter a valid donation amount in ETH.");
      return;
    }

    if (!/^[1-9]\d*$/.test(String(id))) {
      setError("Invalid blockchain campaign ID.");
      return;
    }

    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        setError("Please switch MetaMask to Sepolia (chain ID 11155111).");
        return;
      }

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      setStatus("Checking campaign on Sepolia...");

      const onChainCampaign = await contract.getCampaign(Number(id));

      if (Number(onChainCampaign.status) !== 1) {
        throw new Error("This campaign is not approved for donations.");
      }

      const donationAmount = ethers.parseEther(amount);
      const remainingWei =
        onChainCampaign.goalAmount - onChainCampaign.totalRaised;

      if (donationAmount > remainingWei) {
        throw new Error(
          `Donation exceeds the remaining goal of ${ethers.formatEther(
            remainingWei
          )} ETH.`
        );
      }

      setStatus("Please confirm the donation in MetaMask...");

      const signerContract = contract.connect(signer);
      const transaction = await signerContract.donate(Number(id), {
        value: donationAmount,
      });

      setStatus(`Transaction submitted: ${transaction.hash}`);

      await transaction.wait();

      setStatus(
        `Donation successful! Donor: ${walletAddress}. Transaction: ${transaction.hash}`
      );

      setAmount("");
    } catch (err) {
      console.error("Donation failed:", err);

      setError(
        err?.shortMessage ||
          err?.reason ||
          err?.message ||
          "Donation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  const campaignName =
    campaign?.name || campaign?.title || `Campaign #${id}`;

  const goal = campaign?.goalAmount ?? campaign?.goal;
  const numericGoal = Number(goal);
  const numericRaised = Number(campaign?.totalRaised ?? campaign?.raised ?? 0);
  const progress =
    Number.isFinite(numericGoal) && numericGoal > 0
      ? Math.min(100, (numericRaised / numericGoal) * 100)
      : 0;

  return (
    <main className="donate-page">
      <div className="donate-shell">
        <Link to="/campaigns" className="donate-back-link">
          ← Back to campaigns
        </Link>

        <section className="donate-hero">
          <span className="donate-eyebrow">MAKE A DIFFERENCE</span>
          <h1>Small acts. <span>Meaningful impact.</span></h1>
          <p>
            Your contribution helps a campaign move closer to its goal.
            Every donation is recorded on the blockchain for transparent
            tracking.
          </p>
        </section>

        {campaign && (
          <section className="donate-layout">
            <article className="donate-campaign-card">
              <div className="donate-campaign-top">
                <span className="donate-chip">
                  <span className="donate-chip-dot" />
                  Campaign #{id}
                </span>
                <span className="donate-chain-label">On-chain giving</span>
              </div>

              <h2>{campaignName}</h2>

              {campaign.description && (
                <p className="donate-campaign-description">
                  {campaign.description}
                </p>
              )}

              <div className="donate-progress-heading">
                <span>Campaign progress</span>
                <strong>{progress.toFixed(0)}%</strong>
              </div>

              <div
                className="donate-progress-track"
                role="progressbar"
                aria-label="Campaign funding progress"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="donate-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="donate-goal-row">
                <div>
                  <span className="donate-muted-label">Campaign goal</span>
                  <strong>
                    {goal !== undefined && goal !== null
                      ? `${goal} ETH`
                      : "See campaign details"}
                  </strong>
                </div>
                <div className="donate-goal-icon" aria-hidden="true">↗</div>
              </div>

              <div className="donate-trust-note">
                <div className="donate-trust-icon">✓</div>
                <div>
                  <strong>Transparent by design</strong>
                  <p>Your confirmed transaction can be verified on Sepolia.</p>
                </div>
              </div>
            </article>

            <section className="donate-form-card">
              <span className="donate-eyebrow">YOUR CONTRIBUTION</span>
              <h2>Make a donation</h2>
              <p className="donate-form-intro">
                Choose an amount in Sepolia test ETH to support this campaign.
              </p>

              <form onSubmit={makeDonation}>
                <label htmlFor="donation-amount">
                  Donation amount <span>(ETH)</span>
                </label>

                <div className="donate-amount-input-wrap">
                  <input
                    id="donation-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.05"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={loading}
                    autoComplete="off"
                    required
                  />
                  <span className="donate-eth-suffix">ETH</span>
                </div>

                <div className="donate-quick-amounts">
                  {[ "0.01", "0.05", "0.1", "0.5" ].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`donate-quick-button ${
                        amount === value ? "selected" : ""
                      }`}
                      onClick={() => setAmount(value)}
                      disabled={loading}
                    >
                      {value}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="donate-submit-button"
                  disabled={loading || !campaign}
                >
                  {loading ? "Processing donation…" : "Continue with MetaMask"}
                  {!loading && <span aria-hidden="true">↗</span>}
                </button>
              </form>

              {status && (
                <div className="donate-message donate-message-success" role="status">
                  <strong>Transaction update</strong>
                  <p>{status}</p>
                </div>
              )}

              {error && (
                <div className="donate-message donate-message-error" role="alert">
                  <strong>Something needs attention</strong>
                  <p>{error}</p>
                </div>
              )}

              <div className="donate-network-note">
                <span className="donate-network-dot" />
                <p>
                  Sepolia test network only. This is test ETH, not a real
                  currency payment.
                </p>
              </div>
            </section>
          </section>
        )}

        {!campaign && !error && (
          <div className="donate-loading">
            <span className="donate-spinner" />
            <p>Loading campaign details…</p>
          </div>
        )}

        {error && !campaign && (
          <div className="donate-message donate-message-error donate-load-error" role="alert">
            <strong>Unable to load this campaign</strong>
            <p>{error}</p>
            <Link to="/campaigns" className="donate-error-link">
              Browse campaigns
            </Link>
          </div>
        )}

        <footer className="donate-footer">
          <span>DONATECHAIN</span>
          <span>Giving with clarity and confidence.</span>
        </footer>
      </div>
    </main>
  );
}
