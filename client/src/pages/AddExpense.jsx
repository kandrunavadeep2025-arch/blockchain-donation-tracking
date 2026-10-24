
import { useState } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { contract } from "../contract";
import "./AddExpense.css";

const API = "https://blockchain-donation-tracking.onrender.com/api";
const SEPOLIA_CHAIN_ID = 11155111n;

export default function AddExpense() {
  const [campaignId, setCampaignId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function getAuthorizedNGO() {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask first.");
    }

    const token = sessionStorage.getItem("donatechainToken");

    if (!token) {
      throw new Error("Please log in using your NGO account first.");
    }

    const response = await fetch(`${API}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Could not verify your login. Please log in again.");
    }

    const result = await response.json();
    const savedUser = sessionStorage.getItem("donatechainUser");
    const user =
      result.user || (savedUser ? JSON.parse(savedUser) : result);

    if (user.role !== "ngo") {
      throw new Error("Only an NGO account can record an expense.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();

    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error(
        "Please switch MetaMask to Sepolia (chain ID 11155111)."
      );
    }

    const signer = await provider.getSigner();
    const account = await signer.getAddress();

    const databaseWallet =
      user.walletAddress || user.wallet || user.address;

    if (
      databaseWallet &&
      ethers.getAddress(databaseWallet) !== ethers.getAddress(account)
    ) {
      throw new Error(
        "The connected MetaMask account does not match your NGO account wallet."
      );
    }

    const signerContract = contract.connect(signer);
    const isAuthorized = await signerContract.authorizedNGO(account);

    if (!isAuthorized) {
      throw new Error(
        "This wallet is not authorized as an NGO in the deployed contract."
      );
    }

    return { signerContract, account };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!/^[1-9]\d*$/.test(campaignId)) {
      setError("Enter a valid positive blockchain campaign ID.");
      return;
    }

    if (
      !/^\d+(\.\d{1,18})?$/.test(amount) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      setError("Enter a valid expense amount in ETH.");
      return;
    }

    if (!purpose.trim()) {
      setError("Enter the purpose of the expense.");
      return;
    }

    if (!ethers.isAddress(recipient)) {
      setError("Enter a valid recipient wallet address.");
      return;
    }

    setLoading(true);

    try {
      setStatus("Verifying NGO account and Sepolia network...");

      const { signerContract, account } = await getAuthorizedNGO();

      setStatus("Checking campaign...");

      const onChainCampaign = await signerContract.getCampaign(
        Number(campaignId)
      );

      if (Number(onChainCampaign.status) !== 1) {
        throw new Error(
          "This campaign is not active. Check its status before recording an expense."
        );
      }

      const campaignNGO = ethers.getAddress(onChainCampaign.ngo);

      if (campaignNGO !== ethers.getAddress(account)) {
        throw new Error(
          "Your connected wallet is not the NGO assigned to this campaign."
        );
      }

      const amountWei = ethers.parseEther(amount);

      if (amountWei > onChainCampaign.totalRaised) {
        throw new Error(
          "The expense cannot exceed the campaign's total raised amount."
        );
      }

      setStatus("Please confirm the expense transaction in MetaMask...");

      const transaction = await signerContract.recordExpense(
        Number(campaignId),
        amountWei,
        purpose.trim(),
        ethers.getAddress(recipient)
      );

      setStatus(`Expense transaction submitted: ${transaction.hash}`);

      await transaction.wait();

      setStatus(
        `Expense recorded successfully! Transaction: ${transaction.hash}. The admin may need to verify it before payment.`
      );

      setCampaignId("");
      setAmount("");
      setPurpose("");
      setRecipient("");
    } catch (err) {
      console.error("Expense recording failed:", err);

      setError(
        err?.shortMessage ||
          err?.reason ||
          err?.message ||
          "Failed to record the expense."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="add-expense-page">
      <section className="ae-hero">
        <div className="ae-hero-copy">
          <span className="ae-eyebrow">NGO WORKSPACE</span>
          <h1>
            Every expense.
            <br />
            <span>Accounted for.</span>
          </h1>
          <p>
            Record how campaign funds are used and create a transparent,
            verifiable expense trail on the blockchain.
          </p>
          <Link to="/expense-history" className="ae-back-link">
            View expense history <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="ae-hero-art" aria-hidden="true">
          <div className="ae-art-ring ae-ring-one" />
          <div className="ae-art-ring ae-ring-two" />
          <div className="ae-art-icon">✓</div>
          <span className="ae-art-spark ae-spark-one">✳</span>
          <span className="ae-art-spark ae-spark-two">✦</span>
        </div>
      </section>

      <div className="ae-content-grid">
        <section className="ae-form-panel">
          <div className="ae-section-heading">
            <span className="ae-eyebrow">EXPENSE DETAILS</span>
            <h2>Record a campaign expense</h2>
            <p>
              Enter the details carefully. Your transaction will require
              confirmation in MetaMask.
            </p>
          </div>

          <form className="ae-form" onSubmit={handleSubmit}>
            <div className="ae-field">
              <label htmlFor="campaign-id">Blockchain campaign ID</label>
              <input
                id="campaign-id"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 1"
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
                disabled={loading}
                required
              />
              <span className="ae-field-hint">
                Use the campaign ID recorded on the blockchain.
              </span>
            </div>

            <div className="ae-field">
              <label htmlFor="expense-amount">Expense amount</label>
              <div className="ae-input-with-suffix">
                <input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={loading}
                  required
                />
                <span>ETH</span>
              </div>
              <span className="ae-field-hint">
                Sepolia test ETH only — this records an expense, not a payment.
              </span>
            </div>

            <div className="ae-field">
              <label htmlFor="expense-purpose">Purpose of expense</label>
              <input
                id="expense-purpose"
                type="text"
                placeholder="e.g. Medical supplies"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                disabled={loading}
                maxLength={200}
                required
              />
            </div>

            <div className="ae-field">
              <label htmlFor="expense-recipient">Recipient wallet address</label>
              <input
                id="expense-recipient"
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
                required
              />
              <span className="ae-field-hint">
                Check the recipient address before confirming.
              </span>
            </div>

            {status && (
              <div className="ae-status" role="status" aria-live="polite">
                <span className={loading ? "ae-status-dot ae-pulse" : "ae-status-dot"} />
                <span>{status}</span>
              </div>
            )}

            {error && (
              <div className="ae-error" role="alert">
                <strong>Something needs your attention</strong>
                <p>{error}</p>
              </div>
            )}

            <button
              className="ae-submit-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Processing transaction..." : "Record expense on-chain"}
              {!loading && <span aria-hidden="true">↗</span>}
            </button>

            <p className="ae-form-footnote">
              Your wallet will ask you to approve the blockchain transaction.
            </p>
          </form>
        </section>

        <aside className="ae-info-column">
          <div className="ae-info-card">
            <span className="ae-info-icon">◇</span>
            <h3>Before you submit</h3>
            <ul>
              <li>Log in with your NGO account.</li>
              <li>Connect the authorized NGO wallet in MetaMask.</li>
              <li>Switch to the Sepolia test network.</li>
              <li>Make sure the campaign is active and assigned to your NGO.</li>
              <li>Verify the recipient address and expense amount.</li>
            </ul>
          </div>

          <div className="ae-trust-card">
            <span className="ae-trust-symbol">✓</span>
            <h3>Built for transparency</h3>
            <p>
              The expense record is stored through the smart contract.
              Administrators may still need to verify it before payment.
            </p>
          </div>

          <div className="ae-network-note">
            <span className="ae-network-dot" />
            <div>
              <strong>Sepolia test network</strong>
              <p>Chain ID: 11155111</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
