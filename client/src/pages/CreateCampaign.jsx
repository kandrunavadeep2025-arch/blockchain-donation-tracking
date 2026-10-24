
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { contract } from "../contract";
import "./CreateCampaign.css";

const API = "https://blockchain-donation-tracking.onrender.com/api";
const SEPOLIA_CHAIN_ID = 11155111n;

function CreateCampaign() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setStatus("");

    if (!name.trim() || !description.trim()) {
      setStatus("Enter the campaign name and description.");
      return;
    }

    if (!/^\d+(\.\d{1,18})?$/.test(goalAmount.trim())) {
      setStatus("Enter a valid ETH goal with up to 18 decimal places.");
      return;
    }

    let goalWei;

    try {
      goalWei = ethers.parseEther(goalAmount.trim());

      if (goalWei <= 0n) {
        setStatus("The fundraising goal must be greater than zero.");
        return;
      }
    } catch {
      setStatus("Please enter a valid ETH fundraising goal.");
      return;
    }

    const token = sessionStorage.getItem("donatechainToken");

    if (!token) {
      setStatus("Please log in first.");
      navigate("/login");
      return;
    }

    if (!window.ethereum) {
      setStatus("Please install or unlock MetaMask.");
      return;
    }

    setLoading(true);

    let createdCampaignId = null;
    let blockchainTransactionConfirmed = false;

    try {
      setStatus("Checking your NGO account...");

      const response = await fetch(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const authData = await response.json();

      if (!response.ok || !authData.success) {
        throw new Error(
          authData.message || "Your login has expired. Please log in again."
        );
      }

      const user = authData.user;

      if (!user || user.role !== "ngo") {
        throw new Error("Only approved NGO accounts can create campaigns.");
      }

      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        throw new Error(
          "Please switch MetaMask to the Sepolia test network."
        );
      }

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      if (
        !user.walletAddress ||
        user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
      ) {
        throw new Error(
          "Your MetaMask account must match your approved NGO wallet."
        );
      }

      const signerContract = contract.connect(signer);

      const isAuthorized = await signerContract.authorizedNGO(walletAddress);

      if (!isAuthorized) {
        throw new Error(
          "This MetaMask wallet is not authorized by the smart contract."
        );
      }

      setStatus("Confirm campaign creation in MetaMask...");

      const transaction = await signerContract.createCampaign(
        name.trim(),
        description.trim(),
        goalWei,
        imageUrl.trim()
      );

      setStatus(
        "Transaction submitted. Waiting for blockchain confirmation..."
      );

      const receipt = await transaction.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("The blockchain transaction failed.");
      }

      blockchainTransactionConfirmed = true;

      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);

          if (parsed?.name === "CampaignCreated") {
            createdCampaignId = Number(parsed.args.campaignId);
            break;
          }
        } catch {
          // Ignore logs that do not match the campaign ABI.
        }
      }

      if (
        !Number.isSafeInteger(createdCampaignId) ||
        createdCampaignId <= 0
      ) {
        throw new Error(
          `Transaction ${receipt.hash} succeeded, but the campaign ID could not be read. Do not submit another transaction.`
        );
      }

      setStatus(
        `Campaign #${createdCampaignId} is on the blockchain. Saving its details to MongoDB...`
      );

      let saveResponse;
      let saveData;

      try {
        saveResponse = await fetch(`${API}/campaigns`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            goalAmount: Number(goalAmount.trim()),
            imageUrl: imageUrl.trim(),
            blockchainCampaignId: createdCampaignId,
          }),
        });

        saveData = await saveResponse.json();
      } catch (error) {
        console.error("MongoDB campaign save request failed:", error);

        setStatus(
          `Campaign #${createdCampaignId} was confirmed on the blockchain, but the server could not be reached or returned an invalid response. Do not create it again. Transaction: ${receipt.hash}`
        );

        return;
      }

      if (!saveResponse.ok || !saveData.success) {
        console.error("MongoDB campaign save error:", saveData);

        setStatus(
          `Campaign #${createdCampaignId} exists on the blockchain, but the backend could not save it: ${
            saveData.message || "Unknown server error"
          }. Do not create another campaign.`
        );

        return;
      }

      setStatus(
        `Campaign #${createdCampaignId} saved successfully and is waiting for admin approval!`
      );

      window.setTimeout(() => {
        navigate("/campaigns");
      }, 2500);
    } catch (error) {
      console.error("Campaign creation error:", error);

      if (blockchainTransactionConfirmed) {
        setStatus(
          `The blockchain transaction succeeded, but a later step failed. Do not submit another transaction. ${
            error?.shortMessage ||
            error?.reason ||
            error?.message ||
            "Unknown error"
          }`
        );
      } else {
        setStatus(
          error?.shortMessage ||
            error?.reason ||
            error?.message ||
            "Campaign creation failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const isSuccess = status.toLowerCase().includes("saved successfully");
  const isBlockchainConfirmed =
    status.toLowerCase().includes("blockchain transaction succeeded") ||
    status.toLowerCase().includes("confirmed on the blockchain") ||
    status.toLowerCase().includes("exists on the blockchain") ||
    status.toLowerCase().includes("transaction succeeded");

  return (
    <main className="create-campaign-page">
      <div className="create-campaign-shell">
        <button
          type="button"
          className="create-campaign-back"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          ← Back
        </button>

        <section className="create-campaign-hero">
          <span className="create-campaign-eyebrow">
            FOR NON-PROFIT ORGANIZATIONS
          </span>

          <h1>
            Turn your mission into <span>meaningful impact.</span>
          </h1>

          <p>
            Introduce your cause, set a transparent fundraising goal, and
            invite donors to be part of your story.
          </p>
        </section>

        <div className="create-campaign-layout">
          <section className="create-campaign-form-card">
            <div className="create-campaign-card-heading">
              <div>
                <span className="create-campaign-step">CAMPAIGN DETAILS</span>
                <h2>Tell us about your cause</h2>
                <p>Complete the details below to submit your campaign.</p>
              </div>

              <div className="create-campaign-heading-icon" aria-hidden="true">
                ↗
              </div>
            </div>

            <form onSubmit={handleSubmit} className="create-campaign-form">
              <div className="create-campaign-field">
                <label htmlFor="campaign-name">Campaign name</label>
                <input
                  id="campaign-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Education for Every Child"
                  required
                  maxLength={100}
                  disabled={loading}
                />
                <span className="create-campaign-hint">
                  Choose a clear, memorable name for your cause.
                </span>
              </div>

              <div className="create-campaign-field">
                <label htmlFor="campaign-description">Campaign description</label>
                <textarea
                  id="campaign-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Tell donors about the problem, who you want to help, and how their contributions will make a difference..."
                  required
                  maxLength={2000}
                  rows={6}
                  disabled={loading}
                />
                <div className="create-campaign-character-count">
                  <span>Be specific about the impact donations can make.</span>
                  <span>{description.length}/2000</span>
                </div>
              </div>

              <div className="create-campaign-field">
                <label htmlFor="campaign-goal">Fundraising goal</label>
                <div className="create-campaign-goal-input">
                  <input
                    id="campaign-goal"
                    type="text"
                    inputMode="decimal"
                    minLength={1}
                    placeholder="0.50"
                    value={goalAmount}
                    onChange={(event) => setGoalAmount(event.target.value)}
                    required
                    disabled={loading}
                  />
                  <span>ETH</span>
                </div>
                <span className="create-campaign-hint">
                  Set a positive goal using Sepolia test ETH, up to 18 decimal
                  places.
                </span>
              </div>

              <div className="create-campaign-field">
                <label htmlFor="campaign-image">
                  Campaign image URL <span>(optional)</span>
                </label>
                <input
                  id="campaign-image"
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://example.com/campaign-image.jpg"
                  disabled={loading}
                />
                <span className="create-campaign-hint">
                  Add a publicly accessible image URL to represent your cause.
                </span>
              </div>

              <button
                type="submit"
                className="create-campaign-submit"
                disabled={loading}
              >
                <span>
                  {loading ? "Processing your campaign..." : "Submit campaign"}
                </span>
                {!loading && <span aria-hidden="true">↗</span>}
              </button>

              <p className="create-campaign-submit-note">
                Your campaign must be approved by an administrator before it
                can accept donations.
              </p>
            </form>

            {status && (
              <div
                className={`create-campaign-status ${
                  isSuccess
                    ? "is-success"
                    : isBlockchainConfirmed
                      ? "is-warning"
                      : "is-neutral"
                }`}
                role="status"
                aria-live="polite"
              >
                <strong>
                  {isSuccess
                    ? "Campaign created"
                    : isBlockchainConfirmed
                      ? "Blockchain transaction confirmed"
                      : loading
                        ? "Working on your campaign"
                        : "Campaign update"}
                </strong>
                <p>{status}</p>
              </div>
            )}
          </section>

          <aside className="create-campaign-sidebar">
            <div className="create-campaign-preview">
              <span className="create-campaign-preview-label">
                YOUR CAMPAIGN PREVIEW
              </span>

              {imageUrl.trim() ? (
                <img
                  className="create-campaign-preview-image"
                  src={imageUrl}
                  alt="Campaign preview"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.display = "block";
                  }}
                />
              ) : (
                <div className="create-campaign-preview-placeholder">
                  <div className="create-campaign-preview-art" aria-hidden="true">
                    <span>✳</span>
                    <span>↗</span>
                    <span>✦</span>
                  </div>
                  <span>Your cause, your story.</span>
                </div>
              )}

              <div className="create-campaign-preview-body">
                <span className="create-campaign-preview-tag">COMMUNITY IMPACT</span>
                <h3>{name.trim() || "Your campaign name"}</h3>
                <p>
                  {description.trim() ||
                    "Your campaign description will appear here, helping donors understand your mission."}
                </p>

                <div className="create-campaign-preview-goal">
                  <span>Fundraising goal</span>
                  <strong>
                    {goalAmount.trim() ? `${goalAmount} ETH` : "Set your goal"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="create-campaign-trust-card">
              <div className="create-campaign-trust-symbol" aria-hidden="true">
                ✓
              </div>
              <div>
                <h3>Built for transparency</h3>
                <p>
                  Campaign details are saved to the platform, while campaign
                  creation is recorded on the Sepolia blockchain.
                </p>
              </div>
            </div>

            <div className="create-campaign-steps-card">
              <h3>What happens next?</h3>

              <div className="create-campaign-timeline">
                <div className="create-campaign-timeline-item">
                  <span>1</span>
                  <div>
                    <strong>Connect your approved NGO wallet</strong>
                    <p>Use the wallet associated with your NGO account.</p>
                  </div>
                </div>

                <div className="create-campaign-timeline-item">
                  <span>2</span>
                  <div>
                    <strong>Confirm on the blockchain</strong>
                    <p>Review and confirm the transaction in MetaMask.</p>
                  </div>
                </div>

                <div className="create-campaign-timeline-item">
                  <span>3</span>
                  <div>
                    <strong>Wait for admin approval</strong>
                    <p>Your campaign becomes eligible for donations after approval.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="create-campaign-footer">
          <span>DONATECHAIN</span>
          <span>Giving with clarity and confidence.</span>
        </footer>
      </div>
    </main>
  );
}

export default CreateCampaign;
