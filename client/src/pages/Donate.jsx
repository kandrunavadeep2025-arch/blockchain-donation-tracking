
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import { contract } from "../contract";

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

    if (!/^\d+(\.\d{1,18})?$/.test(amount) ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0) {
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
        setError(
          "Please switch MetaMask to Sepolia (chain ID 11155111)."
        );
        return;
      }

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      setStatus("Checking campaign on Sepolia...");

      const onChainCampaign = await contract.getCampaign(Number(id));

      // This contract assumes status 1 means Approved/Active.
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
      const transaction = await signerContract.donate(
        Number(id),
        { value: donationAmount }
      );

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

  return (
    <div className="donate-page">
      <h1>Make a Donation</h1>

      {campaign && (
        <div>
          <h2>
            Donate to {campaign.name || campaign.title || `Campaign #${id}`}
          </h2>

          {campaign.description && <p>{campaign.description}</p>}

          <p>
            Goal:{" "}
            {campaign.goalAmount
              ? `${campaign.goalAmount} ETH`
              : campaign.goal
                ? `${campaign.goal} ETH`
                : "See campaign details"}
          </p>
        </div>
      )}

      <form onSubmit={makeDonation}>
        <label htmlFor="donation-amount">
          Donation Amount (Sepolia test ETH)
        </label>

        <input
          id="donation-amount"
          type="text"
          inputMode="decimal"
          placeholder="Enter amount in ETH"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={loading}
          required
        />

        <button type="submit" disabled={loading || !campaign}>
          {loading ? "Processing..." : "Donate ETH"}
        </button>
      </form>

      {status && <p>{status}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <p>
        Donations use Sepolia test ETH. This is a test network, not a real
        currency payment.
      </p>
    </div>
  );
}
