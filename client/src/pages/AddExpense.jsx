
import { useState } from "react";
import { ethers } from "ethers";
import { contract } from "../contract";

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
const user = result.user || (savedUser ? JSON.parse(savedUser) : result);

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

    // Adjust this field if your backend uses a different wallet property.
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

      // Assumes status 1 is Approved/Active in your contract.
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
    <div className="add-expense-page">
      <h1>Record Campaign Expense</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="campaign-id">Blockchain Campaign ID</label>
          <input
            id="campaign-id"
            type="number"
            min="1"
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label htmlFor="expense-amount">
            Expense Amount (Sepolia test ETH)
          </label>
          <input
            id="expense-amount"
            type="text"
            inputMode="decimal"
            placeholder="Enter amount in ETH"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label htmlFor="expense-purpose">Expense Purpose</label>
          <input
            id="expense-purpose"
            type="text"
            placeholder="e.g. Medical supplies"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label htmlFor="expense-recipient">Recipient Wallet Address</label>
          <input
            id="expense-recipient"
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Record Expense"}
        </button>
      </form>

      {status && <p>{status}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <p>
        Expenses are recorded using Sepolia test ETH. Recording an expense
        does not itself transfer funds to the recipient.
      </p>
    </div>
  );
}
