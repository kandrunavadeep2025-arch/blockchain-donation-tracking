
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { contract } from "../contract";
import { ethers } from "ethers";
import "./AdminDashboard.css";

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
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [walletConnecting, setWalletConnecting] = useState(false);

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
      setWalletConnecting(true);
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
      setStatus(
        error.shortMessage || error.message || "Wallet connection failed."
      );
    } finally {
      setWalletConnecting(false);
    }
  }

  const loadData = useCallback(async () => {
    setLoadingExpenses(true);

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

      setExpenses(expenseList.reverse());
    } catch (error) {
      console.error("Admin data error:", error);
      setStatus(
        "Unable to load blockchain data. Check your blockchain connection and contract address."
      );
    } finally {
      setLoadingExpenses(false);
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
      setNgoStatus(
        "Enter a registered NGO email and valid wallet address."
      );
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
      setNgoStatus(
        error.shortMessage ||
          error.reason ||
          error.message ||
          "NGO approval failed."
      );
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

        setCampaignStatus(
          `Confirm approval of campaign #${campaignId} in MetaMask...`
        );

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

        setCampaignStatus(
          `Confirm removal of campaign #${campaignId} in MetaMask...`
        );

        const transaction = await signerContract.removeCampaign(campaignId);
        await transaction.wait();
      }

      setCampaignStatus(
        "Blockchain transaction confirmed. Refreshing campaign status..."
      );

      await loadCampaigns();

      setCampaignStatus(
        action === "approve"
          ? `Campaign #${campaignId} approved successfully.`
          : `Campaign #${campaignId} removed from active listings.`
      );
    } catch (error) {
      console.error(error);
      setCampaignStatus(
        error.shortMessage ||
          error.reason ||
          error.message ||
          "Campaign update failed."
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
      setStatus(
        error.shortMessage ||
          error.reason ||
          error.message ||
          "Verification failed."
      );
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
      setStatus(
        error.shortMessage ||
          error.reason ||
          error.message ||
          "Fund release failed."
      );
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

  const pendingCampaigns = campaigns.filter(
    (campaign) => campaign.status === "pending"
  ).length;

  const pendingExpenses = expenses.filter(
    (expense) => !expense.verified && !expense.released
  ).length;

  const verifiedExpenses = expenses.filter(
    (expense) => expense.verified
  ).length;

  const paidExpenses = expenses.filter(
    (expense) => expense.released
  ).length;

  const totalRaised = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.totalRaisedEth || 0),
    0
  );

  const formatAmount = (amount) =>
    Number(amount).toLocaleString("en-US", {
      maximumFractionDigits: 4,
    });

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-container">
        <header className="admin-dashboard-hero">
          <div className="admin-dashboard-hero-copy">
            <span className="admin-dashboard-eyebrow">
              DONATECHAIN · ADMINISTRATION
            </span>

            <h1>
              Trust is built
              <br />
              <span>into every transaction.</span>
            </h1>

            <p>
              Manage campaign approvals, authorize NGO wallets, verify
              expenses, and release funds with blockchain-backed oversight.
            </p>

            <div className="admin-dashboard-hero-actions">
              <button
                className="admin-dashboard-primary-button"
                onClick={connectAdminWallet}
                disabled={walletConnecting}
              >
                {walletConnecting ? "Connecting..." : "↗ Connect admin wallet"}
              </button>

              <Link
                className="admin-dashboard-secondary-button"
                to="/transparency"
              >
                View transparency
              </Link>
            </div>
          </div>

          <div className="admin-dashboard-hero-art" aria-hidden="true">
            <div className="admin-dashboard-art-ring admin-dashboard-art-ring-one" />
            <div className="admin-dashboard-art-ring admin-dashboard-art-ring-two" />

            <div className="admin-dashboard-art-card">
              <span className="admin-dashboard-art-shield">✓</span>
              <span className="admin-dashboard-art-label">
                ADMIN CONTROL
              </span>
              <strong>Accountability, at every step.</strong>
              <div className="admin-dashboard-art-divider" />
              <div className="admin-dashboard-art-foot">
                <span>Blockchain oversight</span>
                <span className="admin-dashboard-live-dot" />
              </div>
            </div>
          </div>
        </header>

        <section className="admin-dashboard-wallet-panel">
          <div className="admin-dashboard-wallet-icon">◇</div>

          <div className="admin-dashboard-wallet-info">
            <span className="admin-dashboard-eyebrow">
              CONTRACT ADMIN WALLET
            </span>
            <strong>{admin || "Loading contract admin..."}</strong>
            <span className="admin-dashboard-wallet-subtitle">
              {account
                ? `Connected wallet: ${account}`
                : "Connect the original contract admin wallet to perform blockchain actions."}
            </span>
          </div>

          <span
            className={`admin-dashboard-wallet-status ${
              isAdmin ? "is-connected" : "is-disconnected"
            }`}
          >
            <span />
            {isAdmin ? "Admin verified" : "Not verified"}
          </span>
        </section>

        {status && (
          <div
            className={`admin-dashboard-notice ${
              /successfully|transferred/i.test(status)
                ? "notice-success"
                : /unable|failed|not the|only the|error/i.test(status)
                  ? "notice-error"
                  : "notice-info"
            }`}
            role="status"
          >
            <span className="admin-dashboard-notice-icon">
              {/successfully|transferred/i.test(status)
                ? "✓"
                : /unable|failed|not the|only the|error/i.test(status)
                  ? "!"
                  : "↻"}
            </span>
            {status}
          </div>
        )}

        <section className="admin-dashboard-stats">
          <div className="admin-dashboard-section-heading">
            <div>
              <span className="admin-dashboard-eyebrow">
                ADMIN OVERVIEW
              </span>
              <h2>Your oversight at a glance</h2>
            </div>
          </div>

          <div className="admin-dashboard-stat-grid">
            <article className="admin-dashboard-stat-card">
              <div className="admin-dashboard-stat-top">
                <span>Campaigns</span>
                <span className="admin-dashboard-stat-icon">◈</span>
              </div>
              <strong>{campaigns.length}</strong>
              <span className="admin-dashboard-stat-caption">
                {pendingCampaigns} awaiting approval
              </span>
            </article>

            <article className="admin-dashboard-stat-card">
              <div className="admin-dashboard-stat-top">
                <span>Funds raised</span>
                <span className="admin-dashboard-stat-icon">↗</span>
              </div>
              <strong>{formatAmount(totalRaised)}</strong>
              <span className="admin-dashboard-stat-caption">
                Test ETH reported by campaign records
              </span>
            </article>

            <article className="admin-dashboard-stat-card">
              <div className="admin-dashboard-stat-top">
                <span>Pending expenses</span>
                <span className="admin-dashboard-stat-icon">◷</span>
              </div>
              <strong>{pendingExpenses}</strong>
              <span className="admin-dashboard-stat-caption">
                Awaiting verification or release
              </span>
            </article>

            <article className="admin-dashboard-stat-card">
              <div className="admin-dashboard-stat-top">
                <span>Verified expenses</span>
                <span className="admin-dashboard-stat-icon">✓</span>
              </div>
              <strong>{verifiedExpenses}</strong>
              <span className="admin-dashboard-stat-caption">
                {paidExpenses} payments released
              </span>
            </article>
          </div>
        </section>

        <section className="admin-dashboard-section">
          <div className="admin-dashboard-section-heading">
            <div>
              <span className="admin-dashboard-eyebrow">
                ORGANIZATION ACCESS
              </span>
              <h2>Approve an NGO</h2>
              <p>
                Approve the registered organization and authorize its wallet
                on the smart contract.
              </p>
            </div>
          </div>

          <div className="admin-dashboard-form-card">
            <div className="admin-dashboard-form-intro">
              <div className="admin-dashboard-form-icon">⌘</div>
              <h3>NGO registration details</h3>
              <p>
                Confirm the email belongs to a registered NGO before
                authorizing its wallet.
              </p>
            </div>

            <div className="admin-dashboard-form">
              <label htmlFor="admin-ngo-email">Registered NGO email</label>
              <input
                id="admin-ngo-email"
                type="email"
                placeholder="organization@example.org"
                value={ngoEmail}
                onChange={(event) => setNgoEmail(event.target.value)}
              />

              <label htmlFor="admin-ngo-wallet">NGO MetaMask wallet address</label>
              <input
                id="admin-ngo-wallet"
                type="text"
                placeholder="0x..."
                value={ngoAddress}
                onChange={(event) => setNgoAddress(event.target.value)}
              />

              <button
                className="admin-dashboard-primary-button"
                onClick={authorizeNGO}
                disabled={!isAdmin}
              >
                Approve NGO & authorize wallet
              </button>

              {!isAdmin && (
                <p className="admin-dashboard-form-hint">
                  Connect the verified contract admin wallet to enable approval.
                </p>
              )}

              {ngoStatus && (
                <div className="admin-dashboard-inline-message" role="status">
                  {ngoStatus}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="admin-dashboard-section">
          <div className="admin-dashboard-section-heading admin-dashboard-heading-row">
            <div>
              <span className="admin-dashboard-eyebrow">
                CAMPAIGN GOVERNANCE
              </span>
              <h2>Campaign approvals</h2>
              <p>
                Review campaign details and approve or remove listings.
                Removed campaigns retain their blockchain history.
              </p>
            </div>

            <button
              className="admin-dashboard-outline-button"
              onClick={loadCampaigns}
              disabled={loadingCampaigns}
            >
              {loadingCampaigns ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {campaignStatus && (
            <div className="admin-dashboard-inline-message" role="status">
              {campaignStatus}
            </div>
          )}

          {loadingCampaigns && campaigns.length === 0 ? (
            <div className="admin-dashboard-empty">
              <span className="admin-dashboard-loading-dot" />
              <p>Loading campaign records...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="admin-dashboard-empty">
              <span className="admin-dashboard-empty-icon">◈</span>
              <h3>No campaigns to display</h3>
              <p>
                Campaign records will appear here when available to the admin
                account.
              </p>
            </div>
          ) : (
            <div className="admin-dashboard-campaign-grid">
              {campaigns.map((campaign) => (
                <article
                  className="admin-dashboard-campaign-card"
                  key={campaign.blockchainCampaignId}
                >
                  <div className="admin-dashboard-card-top">
                    <span className="admin-dashboard-record-id">
                      CAMPAIGN #{campaign.blockchainCampaignId}
                    </span>
                    <span
                      className={`admin-dashboard-badge status-${campaign.status}`}
                    >
                      {campaign.status}
                    </span>
                  </div>

                  <h3>{campaign.name}</h3>
                  <p className="admin-dashboard-campaign-description">
                    {campaign.description || "No description provided."}
                  </p>

                  <div className="admin-dashboard-campaign-financials">
                    <div>
                      <span>Fundraising goal</span>
                      <strong>{campaign.goalAmount} ETH</strong>
                    </div>
                    <div>
                      <span>Total raised</span>
                      <strong>{campaign.totalRaisedEth ?? "0"} ETH</strong>
                    </div>
                    <div>
                      <span>Paid to recipients</span>
                      <strong>{campaign.totalPaidEth ?? "0"} ETH</strong>
                    </div>
                  </div>

                  <div className="admin-dashboard-wallet-detail">
                    <span>NGO wallet</span>
                    <code title={campaign.ngoWalletAddress}>
                      {campaign.ngoWalletAddress || "Not available"}
                    </code>
                  </div>

                  <div className="admin-dashboard-card-actions">
                    {campaign.status === "pending" && (
                      <button
                        className="admin-dashboard-primary-button"
                        onClick={() => updateCampaign(campaign, "approve")}
                        disabled={!isAdmin}
                      >
                        ✓ Approve campaign
                      </button>
                    )}

                    {campaign.status !== "removed" && (
                      <button
                        className="admin-dashboard-danger-button"
                        onClick={() => updateCampaign(campaign, "remove")}
                        disabled={!isAdmin}
                      >
                        Remove campaign
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-dashboard-section">
          <div className="admin-dashboard-section-heading">
            <div>
              <span className="admin-dashboard-eyebrow">
                EXPENSE OVERSIGHT
              </span>
              <h2>Verify expenses & release funds</h2>
              <p>
                Review each on-chain expense. Verify it before releasing
                funds to its recipient.
              </p>
            </div>
          </div>

          {loadingExpenses && expenses.length === 0 ? (
            <div className="admin-dashboard-empty">
              <span className="admin-dashboard-loading-dot" />
              <p>Loading blockchain expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="admin-dashboard-empty">
              <span className="admin-dashboard-empty-icon">≡</span>
              <h3>No expenses recorded</h3>
              <p>Expense records from the smart contract will appear here.</p>
            </div>
          ) : (
            <div className="admin-dashboard-expense-list">
              {expenses.map((expense) => (
                <article
                  className="admin-dashboard-expense-card"
                  key={expense.index}
                >
                  <div className="admin-dashboard-expense-icon">↗</div>

                  <div className="admin-dashboard-expense-content">
                    <div className="admin-dashboard-expense-heading">
                      <div>
                        <span className="admin-dashboard-record-id">
                          EXPENSE #{expense.index + 1} · CAMPAIGN #{expense.campaignId}
                        </span>
                        <h3>{expense.purpose || "Expense record"}</h3>
                      </div>
                      <strong className="admin-dashboard-expense-amount">
                        {formatAmount(expense.amount)} <span>ETH</span>
                      </strong>
                    </div>

                    <div className="admin-dashboard-expense-meta">
                      <div>
                        <span>Recipient wallet</span>
                        <code title={expense.recipient}>
                          {expense.recipient}
                        </code>
                      </div>
                      <div>
                        <span>Recorded at</span>
                        <strong>{expense.timestamp}</strong>
                      </div>
                    </div>

                    <div className="admin-dashboard-expense-statuses">
                      <span
                        className={`admin-dashboard-badge ${
                          expense.verified ? "status-verified" : "status-pending"
                        }`}
                      >
                        {expense.verified ? "✓ Verified" : "◷ Verification pending"}
                      </span>
                      <span
                        className={`admin-dashboard-badge ${
                          expense.released ? "status-paid" : "status-unpaid"
                        }`}
                      >
                        {expense.released ? "✓ Payment released" : "Payment not released"}
                      </span>
                    </div>

                    {isAdmin && !expense.verified && !expense.released && (
                      <button
                        className="admin-dashboard-primary-button"
                        onClick={() => verifyExpense(expense.index)}
                      >
                        Verify expense
                      </button>
                    )}

                    {isAdmin && expense.verified && !expense.released && (
                      <button
                        className="admin-dashboard-primary-button"
                        onClick={() => releaseFunds(expense.index)}
                      >
                        Release funds to recipient
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="admin-dashboard-footer">
          <span>◇</span>
          <p>
            <strong>Transparency by design.</strong> Administrative actions
            that change blockchain state require confirmation in MetaMask.
            Test ETH values are for this project's test network.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default AdminDashboard;
