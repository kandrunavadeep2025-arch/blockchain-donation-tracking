
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { contract } from "../contract";

function formatEth(value) {
  return Number(ethers.formatEther(value)).toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function DonationHistory() {
  const [account, setAccount] = useState("");
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadHistory = useCallback(async (walletAddress) => {
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      setAccount("");
      setDonations([]);
      setMessage("Connect your MetaMask wallet to view your donation history.");
      return;
    }

    setAccount(walletAddress);
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const count = Number(await contract.getDonationCount());
      const results = [];

      for (let index = 0; index < count; index++) {
        const donation = await contract.getDonation(index);

        // Show only donations made by the connected wallet.
        if (donation.donor.toLowerCase() !== walletAddress.toLowerCase()) {
          continue;
        }

        let campaignName = `Campaign #${donation.campaignId}`;

        try {
          const campaign = await contract.getCampaign(
            Number(donation.campaignId)
          );
          campaignName = campaign.name;
        } catch {
          // Keep the campaign ID if its details cannot be loaded.
        }

        results.push({
          index,
          campaignId: Number(donation.campaignId),
          campaignName,
          amount: formatEth(donation.amount),
          timestamp: new Date(
            Number(donation.timestamp) * 1000
          ).toLocaleString(),
        });
      }

      results.sort((a, b) => b.index - a.index);

      setDonations(results);

      if (results.length === 0) {
        setMessage(
          "No donations were found for this wallet on the current blockchain."
        );
      }
    } catch (err) {
      console.error("Donation history error:", err);
      setError(
        "Could not load donation history. Check that the blockchain is running and the contract connection is correct."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  async function connectWallet() {
    setError("");
    setMessage("");

    if (!window.ethereum) {
      setError("Please install MetaMask to view your donation history.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts.length) {
        setMessage("No wallet account was selected.");
        return;
      }

      await loadHistory(accounts[0]);
    } catch (err) {
      console.error(err);
      setError(
        err?.shortMessage ||
          err?.message ||
          "Could not connect to MetaMask."
      );
    }
  }

  useEffect(() => {
    if (!window.ethereum) {
      setMessage("Install MetaMask to view your personal donation history.");
      return;
    }

    async function initialize() {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length) {
          await loadHistory(accounts[0]);
        } else {
          setMessage(
            "Connect MetaMask to view your personal donation history."
          );
        }
      } catch (err) {
        console.error(err);
        setError("Could not check the connected wallet.");
      }
    }

    initialize();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length) {
        loadHistory(accounts[0]);
      } else {
        setAccount("");
        setDonations([]);
        setMessage("Connect MetaMask to view your donation history.");
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
    };
  }, [loadHistory]);

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <h1>My Donation History</h1>

      <p>
        Donations are read from the deployed DonationTracker contract.
        Amounts are displayed in ETH.
      </p>

      <p>
        <strong>Connected wallet:</strong>{" "}
        {account || "Not connected"}
      </p>

      <button
        type="button"
        onClick={connectWallet}
        disabled={loading}
      >
        Connect / Refresh Wallet
      </button>

      {loading && <p>Loading blockchain donation records...</p>}

      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}

      {message && <p role="status">{message}</p>}

      {!loading && donations.length > 0 && (
        <>
          <h2>Total donations: {donations.length}</h2>

          {donations.map((donation) => (
            <article
              key={donation.index}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
                marginTop: "16px",
              }}
            >
              <h3>{donation.campaignName}</h3>

              <p>
                <strong>Campaign ID:</strong> {donation.campaignId}
              </p>

              <p>
                <strong>Donation Amount:</strong> {donation.amount} ETH
              </p>

              <p>
                <strong>Transaction record:</strong>{" "}
                Blockchain donation #{donation.index + 1}
              </p>

              <p>
                <strong>Date:</strong> {donation.timestamp}
              </p>
            </article>
          ))}
        </>
      )}
    </div>
  );
}

export default DonationHistory;
