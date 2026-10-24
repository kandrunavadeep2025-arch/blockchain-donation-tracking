
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { contract } from "../contract";
import "./DonationHistory.css";

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
          // Keep the campaign ID if details cannot be loaded.
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
        err?.shortMessage || err?.message || "Could not connect to MetaMask."
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

  const shortAccount = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : "Not connected";

  const totalEth = donations.reduce(
    (sum, donation) => sum + Number(donation.amount),
    0
  );

  return (
    <main className="donation-history-page">
      <section className="donation-history-hero">
        <div className="donation-history-hero-copy">
          <span className="dh-eyebrow">YOUR GIVING JOURNEY</span>
          <h1>
            Every gift
            <br />
            <span>leaves a trace.</span>
          </h1>
          <p>
            Your donations, recorded on the blockchain. Review your
            contributions and see the causes you've supported.
          </p>
          <Link to="/campaigns" className="dh-browse-link">
            Explore campaigns <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="dh-hero-art" aria-hidden="true">
          <div className="dh-art-orbit orbit-outer" />
          <div className="dh-art-orbit orbit-inner" />
          <div className="dh-art-center">♡</div>
          <span className="dh-art-star star-top">✳</span>
          <span className="dh-art-star star-bottom">✦</span>
        </div>
      </section>

      <section className="dh-wallet-panel">
        <div className="dh-wallet-info">
          <span className="dh-wallet-icon" aria-hidden="true">◇</span>
          <div>
            <span className="dh-eyebrow">BLOCKCHAIN WALLET</span>
            <strong>{shortAccount}</strong>
            <p>
              {account
                ? "Showing donations made by this wallet."
                : "Connect your wallet to view your personal records."}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="dh-connect-button"
          onClick={connectWallet}
          disabled={loading}
        >
          {loading
            ? "Loading records..."
            : account
              ? "↻ Refresh wallet"
              : "Connect MetaMask"}
        </button>
      </section>

      {account && (
        <section className="dh-summary-grid">
          <article className="dh-summary-card">
            <span className="dh-summary-label">YOUR DONATIONS</span>
            <strong>{donations.length}</strong>
            <span className="dh-summary-caption">Blockchain records</span>
          </article>

          <article className="dh-summary-card dh-summary-highlight">
            <span className="dh-summary-label">TOTAL CONTRIBUTED</span>
            <strong>{totalEth.toLocaleString("en-US", {
              maximumFractionDigits: 8,
            })} <small>ETH</small></strong>
            <span className="dh-summary-caption">Combined donation amount</span>
          </article>
        </section>
      )}

      <section className="dh-records-section">
        <div className="dh-records-heading">
          <div>
            <span className="dh-eyebrow">YOUR TRANSACTION TRAIL</span>
            <h2>Donation history</h2>
          </div>
          {!loading && donations.length > 0 && (
            <span className="dh-record-count">
              {donations.length} {donations.length === 1 ? "record" : "records"}
            </span>
          )}
        </div>

        {loading && (
          <div className="dh-state-card">
            <span className="dh-spinner" />
            <p>Reading donation records from the blockchain...</p>
          </div>
        )}

        {error && (
          <div className="dh-state-card dh-state-error" role="alert">
            <span className="dh-state-symbol">!</span>
            <h3>We couldn't load your records</h3>
            <p>{error}</p>
            <button type="button" onClick={connectWallet}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && message && (
          <div className="dh-state-card">
            <span className="dh-state-symbol">◇</span>
            <h3>
              {!window.ethereum
                ? "MetaMask is needed"
                : account
                  ? "No donations yet"
                  : "Connect your wallet"}
            </h3>
            <p>{message}</p>

            {!account && window.ethereum && (
              <button type="button" onClick={connectWallet}>
                Connect MetaMask
              </button>
            )}

            {account && (
              <Link to="/campaigns" className="dh-state-link">
                Browse campaigns <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        )}

        {!loading && !error && donations.length > 0 && (
          <div className="dh-donation-list">
            {donations.map((donation) => (
              <article className="dh-donation-card" key={donation.index}>
                <div className="dh-donation-icon" aria-hidden="true">♡</div>

                <div className="dh-donation-main">
                  <h3>{donation.campaignName}</h3>
                  <p>
                    Campaign #{donation.campaignId}
                    <span className="dh-record-separator">·</span>
                    Donation #{donation.index + 1}
                  </p>
                  <span className="dh-donation-date">{donation.timestamp}</span>
                </div>

                <div className="dh-donation-amount">
                  <strong>+{donation.amount}</strong>
                  <span>ETH donated</span>
                  <span className="dh-recorded-badge">
                    <span /> Blockchain recorded
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="dh-bottom-note">
        <span aria-hidden="true">✓</span>
        <p>
          These records are retrieved from the deployed DonationTracker
          smart contract. Amounts are displayed in ETH.
        </p>
      </div>
    </main>
  );
}

export default DonationHistory;
