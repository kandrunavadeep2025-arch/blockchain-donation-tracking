
import { useCallback, useEffect, useState } from "react";
import { contract } from "../contract";
import { ethers } from "ethers";
const API = "https://blockchain-donation-tracking.onrender.com/api";

function AdminDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [admin, setAdmin] = useState("");
  const [account, setAccount] = useState("");
  const [ngoEmail, setNgoEmail] = useState("");
  const [ngoAddress, setNgoAddress] = useState("");
  const [ngoStatus, setNgoStatus] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("");
  const [status, setStatus] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  async function getSignerContract() {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask.");
    }

    await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    return {
      account: await signer.getAddress(),
      signerContract: contract.connect(signer),
    };
  }

  async function connectAdminWallet() {
    try {
      setStatus("Connecting to MetaMask...");

      const { account, signerContract } = await getSignerContract();
      const adminAddress = await signerContract.admin();

      setAccount(account);
      setAdmin(adminAddress);

      if (account.toLowerCase() !== adminAddress.toLowerCase()) {
        setStatus("The connected wallet is not the contract admin.");
        return;
      }

      setStatus("Admin wallet connected successfully.");
    } catch (error) {
      setStatus(error.shortMessage || error.message || "Wallet connection failed.");
    }
  }

  const loadData = useCallback(async () => {
    try {
      const adminAddress = await contract.admin();
      setAdmin(adminAddress);

      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        setAccount(accounts[0] || "");
      }

      const count = await contract.getExpenseCount();
      const expenseList = [];

      for (let i = 0; i < Number(count); i++) {
        const expense = await contract.getExpenseDetails(i);

        expenseList.push({
          index: i,
          campaignId: expense.campaignId.toString(),
          amount: ethers.formatEther(expense.amount),
          purpose: expense.purpose,
          timestamp: new Date(
            Number(expense.timestamp) * 1000
          ).toLocaleString(),
          verified: expense.verified,
          released: expense.released,
          recipient: expense.recipient,
        });
      }

      setExpenses(expenseList);
    } catch (error) {
      console.error("Admin data error:", error);
      setStatus("Unable to load blockchain data. Check Hardhat and the contract address.");
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    const token = sessionStorage.getItem("donatechainToken");

    if (!token) {
      setCampaignStatus("Please log in with your admin account.");
      return;
    }

    try {
      setLoadingCampaigns(true);
      setCampaignStatus("");

      const response = await fetch(`${API}/campaigns/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load campaigns.");
      }

      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error("Campaign loading error:", error);
      setCampaignStatus(error.message || "Could not load campaigns.");
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  async function authorizeNGO() {
    setNgoStatus("");

    if (!ngoEmail.trim() || !ethers.isAddress(ngoAddress)) {
      setNgoStatus("Enter a registered NGO email and valid wallet address.");
      return;
    }

    const token = sessionStorage.getItem("donatechainToken");

    if (!token) {
      setNgoStatus("Please log in as admin.");
      return;
    }

    try {
      const meResponse = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const meData = await meResponse.json();

      if (!meResponse.ok || meData.user?.role !== "admin") {
        setNgoStatus("A valid admin login is required.");
        return;
      }

      const { account, signerContract } = await getSignerContract();
      const adminAddress = await signerContract.admin();

      setAccount(account);
      setAdmin(adminAddress);

      if (account.toLowerCase() !== adminAddress.toLowerCase()) {
        setNgoStatus("Connect the blockchain admin wallet.");
        return;
      }

      setNgoStatus("Confirm wallet authorization in MetaMask...");

      const transaction = await signerContract.setNGO(ngoAddress, true);
      await transaction.wait();

      const response = await fetch(`${API}/auth/approve-ngo`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: ngoEmail.trim().toLowerCase(),
          walletAddress: ngoAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNgoStatus(
          `Blockchain authorization succeeded, but database approval failed: ${data.message || "Unknown error"}`
        );
        return;
      }

      setNgoStatus("NGO approved and wallet authorized successfully!");
      setNgoEmail("");
      setNgoAddress("");
    } catch (error) {
      console.error(error);
      setNgoStatus(error.shortMessage || error.reason || error.message || "NGO approval failed.");
    }
  }

  async function updateCampaign(campaign, action) {
    setCampaignStatus("");

    try {
      const { account, signerContract } = await getSignerContract();
      const adminAddress = await signerContract.admin();

      setAccount(account);
      setAdmin(adminAddress);

      if (account.toLowerCase() !== adminAddress.toLowerCase()) {
        throw new Error("Only the contract admin wallet can manage campaigns.");
      }

      const campaignId = Number(campaign.blockchainCampaignId);

      if (!Number.isSafeInteger(campaignId) || campaignId < 1) {
        throw new Error("Invalid blockchain campaign ID.");
      }

      if (action === "approve") {
        if (campaign.status !== "pending") {
          throw new Error("Only pending campaigns can be approved.");
        }

        setCampaignStatus(`Confirm approval of campaign #${campaignId} in MetaMask...`);

        const transaction = await signerContract.approveCampaign(campaignId);
        await transaction.wait();
      } else {
        if (campaign.status === "removed") {
          throw new Error("This campaign has already been removed.");
        }

        const confirmed = window.confirm(
          `Remove campaign "${campaign.name}" from active listings? Its blockchain history will remain.`
        );

        if (!confirmed) return;

        setCampaignStatus(`Confirm removal of campaign #${campaignId} in MetaMask...`);

        const transaction = await signerContract.removeCampaign(campaignId);
        await transaction.wait();
      }

      setCampaignStatus("Blockchain transaction confirmed. Refreshing campaign status...");

      // The backend reads the authoritative on-chain status and synchronizes MongoDB.
      await loadCampaigns();

      setCampaignStatus(
        action === "approve"
          ? `Campaign #${campaignId} approved successfully.`
          : `Campaign #${campaignId} removed from active listings.`
      );
    } catch (error) {
      console.error(error);
      setCampaignStatus(
        error.shortMessage || error.reason || error.message || "Campaign update failed."
      );
    }
  }

  async function verifyExpense(index) {
    try {
      const { account, signerContract } = await getSignerContract();
      const adminAddress = await signerContract.admin();

      setAccount(account);
      setAdmin(adminAddress);

      if (account.toLowerCase() !== adminAddress.toLowerCase()) {
        throw new Error("Only the admin wallet can verify expenses.");
      }

      setStatus("Confirm verification in MetaMask...");

      const transaction = await signerContract.verifyExpense(index);
      await transaction.wait();

      setStatus("Expense verified successfully.");
      await loadData();
    } catch (error) {
      console.error(error);
      setStatus(error.shortMessage || error.reason || error.message || "Verification failed.");
    }
  }

  async function releaseFunds(index) {
    try {
      const { account, signerContract } = await getSignerContract();
      const adminAddress = await signerContract.admin();

      setAccount(account);
      setAdmin(adminAddress);

      if (account.toLowerCase() !== adminAddress.toLowerCase()) {
        throw new Error("Only the admin wallet can release funds.");
      }

      setStatus("Confirm fund release in MetaMask...");

      const transaction = await signerContract.releaseFunds(index);
      await transaction.wait();

      setStatus("Funds transferred successfully to the recipient.");
      await loadData();
      await loadCampaigns();
    } catch (error) {
      console.error(error);
      setStatus(error.shortMessage || error.reason || error.message || "Fund release failed.");
    }
  }

  useEffect(() => {
    loadData();
    loadCampaigns();
  }, [loadData, loadCampaigns]);

  const isAdmin =
    account &&
    admin &&
    account.toLowerCase() === admin.toLowerCase();

  return (
    <div style={{ padding: "32px", maxWidth: "1100px", margin: "auto" }}>
      <h1>Admin Dashboard</h1>

      <p><strong>Contract admin:</strong> {admin || "Loading..."}</p>
      <p><strong>Connected wallet:</strong> {account || "Not connected"}</p>

      <button onClick={connectAdminWallet}>
        Connect Admin Wallet
      </button>

      <p>
        {isAdmin
          ? "Connected as contract admin."
          : "Connect the original contract admin wallet to manage blockchain actions."}
      </p>

      <hr />

      <h2>Approve NGO and Authorize Wallet</h2>

      <input
        type="email"
        placeholder="NGO registered email"
        value={ngoEmail}
        onChange={(e) => setNgoEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="text"
        placeholder="NGO MetaMask wallet address"
        value={ngoAddress}
        onChange={(e) => setNgoAddress(e.target.value)}
        style={{ width: "360px", maxWidth: "90%" }}
      />

      <br /><br />

      <button onClick={authorizeNGO} disabled={!isAdmin}>
        Approve NGO and Authorize Wallet
      </button>

      {ngoStatus && <p role="status">{ngoStatus}</p>}

      <hr />

      <h2>Campaign Approval and Removal</h2>

      <button onClick={loadCampaigns} disabled={loadingCampaigns}>
        {loadingCampaigns ? "Refreshing..." : "Refresh Campaigns"}
      </button>

      {campaignStatus && <p role="status">{campaignStatus}</p>}

      {campaigns.length === 0 ? (
        <p>No matching on-chain campaigns found in the database.</p>
      ) : (
        campaigns.map((campaign) => (
          <div
            key={campaign.blockchainCampaignId}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "18px",
              marginTop: "16px",
            }}
          >
            <h3>{campaign.name}</h3>
            <p>{campaign.description}</p>
            <p><strong>Campaign ID:</strong> {campaign.blockchainCampaignId}</p>
            <p><strong>NGO wallet:</strong> {campaign.ngoWalletAddress}</p>
            <p><strong>Goal:</strong> {campaign.goalAmount} ETH</p>
            <p><strong>Raised:</strong> {campaign.totalRaisedEth ?? "0"} ETH</p>
            <p><strong>Paid to recipients:</strong> {campaign.totalPaidEth ?? "0"} ETH</p>
            <p><strong>Status:</strong> {campaign.status}</p>

            {campaign.status === "pending" && (
              <button
                onClick={() => updateCampaign(campaign, "approve")}
                disabled={!isAdmin}
              >
                Approve Campaign
              </button>
            )}

            {campaign.status !== "removed" && (
              <button
                onClick={() => updateCampaign(campaign, "remove")}
                disabled={!isAdmin}
                style={{ marginLeft: "8px" }}
              >
                Remove Campaign
              </button>
            )}
          </div>
        ))
      )}

      <hr />

      <h2>Campaign Expenses</h2>

      {expenses.length === 0 ? (
        <p>No expenses found.</p>
      ) : (
        expenses.map((expense) => (
          <div
            key={expense.index}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "18px",
              marginTop: "16px",
            }}
          >
            <h3>Expense #{expense.index + 1}</h3>
            <p><strong>Campaign ID:</strong> {expense.campaignId}</p>
            <p><strong>Amount:</strong> {expense.amount} ETH</p>
            <p><strong>Purpose:</strong> {expense.purpose}</p>
            <p><strong>Recipient:</strong> {expense.recipient}</p>
            <p><strong>Timestamp:</strong> {expense.timestamp}</p>
            <p><strong>Verification:</strong> {expense.verified ? "Verified" : "Pending"}</p>
            <p><strong>Payment:</strong> {expense.released ? "Released" : "Not released"}</p>

            {isAdmin && !expense.verified && !expense.released && (
              <button onClick={() => verifyExpense(expense.index)}>
                Verify Expense
              </button>
            )}

            {isAdmin && expense.verified && !expense.released && (
              <button onClick={() => releaseFunds(expense.index)}>
                Release Funds
              </button>
            )}
          </div>
        ))
      )}

      {status && <p role="status">{status}</p>}
    </div>
  );
}

export default AdminDashboard;
