
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { contract } from "../contract";
import "./Transparency.css";

const campaignStatuses = [
  "Pending Approval",
  "Active",
  "Completed",
  "Removed",
];

function formatEth(wei) {
  const amount = Number(ethers.formatEther(wei));

  if (!Number.isFinite(amount)) return "0";

  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function shortAddress(address) {
  if (!address) return "Not available";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function Transparency() {
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [campaignCount, donationCount, expenseCount] =
        await Promise.all([
          contract.getCampaignCount(),
          contract.getDonationCount(),
          contract.getExpenseCount(),
        ]);

      const campaignIds = Array.from(
        { length: Number(campaignCount) },
        (_, index) => index + 1
      );

      const campaignRecords = await Promise.all(
        campaignIds.map(async (id) => {
          const [campaign, reserved] = await Promise.all([
            contract.getCampaign(id),
            contract.campaignExpenses(id),
          ]);

          const raised = campaign.totalRaised;
          const goal = campaign.goalAmount;

          return {
            id,
            name: campaign.name,
            ngo: campaign.ngo,
            description: campaign.description,
            goal,
            raised,
            reserved,
            paid: campaign.totalPaid,
            status: campaignStatuses[Number(campaign.status)],
            remainingGoal: goal > raised ? goal - raised : 0n,
            unreserved: raised > reserved ? raised - reserved : 0n,
          };
        })
      );

      const donationRecords = await Promise.all(
        Array.from(
          { length: Number(donationCount) },
          async (_, index) => {
            const donation = await contract.getDonation(index);

            let campaignName = `Campaign #${donation.campaignId}`;

            try {
              const campaign = await contract.getCampaign(
                Number(donation.campaignId)
              );
              campaignName = campaign.name;
            } catch {
              // Preserve the campaign ID if its details cannot be read.
            }

            return {
              index,
              donor: donation.donor,
              campaignId: Number(donation.campaignId),
              campaignName,
              amount: donation.amount,
              timestamp: new Date(
                Number(donation.timestamp) * 1000
              ).toLocaleString(),
            };
          }
        )
      );

      const expenseRecords = await Promise.all(
        Array.from(
          { length: Number(expenseCount) },
          async (_, index) => {
            const expense = await contract.getExpenseDetails(index);

            let campaignName = `Campaign #${expense.campaignId}`;

            try {
              const campaign = await contract.getCampaign(
                Number(expense.campaignId)
              );
              campaignName = campaign.name;
            } catch {
              // Preserve the campaign ID if details are unavailable.
            }

            return {
              index,
              campaignId: Number(expense.campaignId),
              campaignName,
              amount: expense.amount,
              purpose: expense.purpose,
              recipient: expense.recipient,
              verified: expense.verified,
              released: expense.released,
              timestamp: new Date(
                Number(expense.timestamp) * 1000
              ).toLocaleString(),
            };
          }
        )
      );

      setCampaigns(campaignRecords.reverse());
      setDonations(donationRecords.reverse());
      setExpenses(expenseRecords.reverse());
    } catch (err) {
      console.error("Transparency loading error:", err);

      setError(
        "Unable to load transparency data. Check the blockchain connection and contract address."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalDonations = donations.reduce(
    (sum, donation) => sum + donation.amount,
    0n
  );

  const totalReserved = campaigns.reduce(
    (sum, campaign) => sum + campaign.reserved,
    0n
  );

  const totalPaid = campaigns.reduce(
    (sum, campaign) => sum + campaign.paid,
    0n
  );

  const totalUnreserved = campaigns.reduce(
    (sum, campaign) => sum + campaign.unreserved,
    0n
  );

  const verifiedCount = expenses.filter(
    (expense) => expense.verified
  ).length;

  const pendingCount = expenses.filter(
    (expense) => !expense.verified
  ).length;

  const paidCount = expenses.filter(
    (expense) => expense.released
  ).length;

  const pendingPaymentCount = expenses.filter(
    (expense) => expense.verified && !expense.released
  ).length;

  const progressFor = (campaign) => {
    const goal = Number(ethers.formatEther(campaign.goal));
    const raised = Number(ethers.formatEther(campaign.raised));

    return goal > 0
      ? Math.min(100, Math.max(0, (raised / goal) * 100))
      : 0;
  };

  return (
    <main className="transparency-page">
      <div className="transparency-container">
        <section className="transparency-hero">
          <div className="transparency-hero-copy">
            <span className="transparency-eyebrow">
              OPEN RECORDS · ON-CHAIN DATA
            </span>

            <h1>
              Every rupee deserves
              <br />
              <span>a clear trail.</span>
            </h1>

            <p>
              Follow campaign funding, review donations and see how
              recorded expenses move from verification to payment.
              Every financial record below is read from the blockchain.
            </p>

            <div className="transparency-hero-actions">
              <button
                className="transparency-primary-button"
                onClick={loadData}
                disabled={loading}
              >
                {loading ? "Refreshing records..." : "↻ Refresh blockchain data"}
              </button>

              <span className="transparency-live-label">
                <span className="transparency-live-dot" />
                Read-only public dashboard
              </span>
            </div>
          </div>

          <div className="transparency-hero-art" aria-hidden="true">
            <div className="transparency-art-ring transparency-art-ring-one" />
            <div className="transparency-art-ring transparency-art-ring-two" />

            <div className="transparency-art-card">
              <div className="transparency-art-icon">✓</div>
              <span className="transparency-art-label">PUBLIC ACCOUNTABILITY</span>
              <strong>Recorded.<br />Verifiable.<br />Transparent.</strong>
              <div className="transparency-art-divider" />
              <div className="transparency-art-foot">
                <span>Blockchain records</span>
                <span className="transparency-live-dot" />
              </div>
            </div>
          </div>
        </section>

        <div className="transparency-info-strip">
          <span className="transparency-info-icon">i</span>
          <p>
            All amounts are displayed in <strong>ETH</strong>. This page
            reads contract records; it does not initiate transactions or
            change blockchain data.
          </p>
        </div>

        {error && (
          <div className="transparency-alert" role="alert">
            <span>!</span>
            <div>
              <strong>Couldn't load the records</strong>
              <p>{error}</p>
              <button onClick={loadData} disabled={loading}>
                Try again
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <section className="transparency-loading">
            <span className="transparency-spinner" />
            <h2>Gathering the records</h2>
            <p>Reading campaigns, donations and expenses from the blockchain...</p>
          </section>
        ) : (
          <>
            <section className="transparency-section">
              <div className="transparency-section-heading">
                <div>
                  <span className="transparency-eyebrow">THE BIG PICTURE</span>
                  <h2>Where the funds stand</h2>
                  <p>A financial overview of all campaigns recorded by the contract.</p>
                </div>
              </div>

              <div className="transparency-summary-grid">
                <article className="transparency-summary-card summary-highlight">
                  <div className="transparency-summary-top">
                    <span>Total donations received</span>
                    <span className="transparency-summary-icon">↗</span>
                  </div>
                  <strong>{formatEth(totalDonations)} <small>ETH</small></strong>
                  <p>Combined value of recorded donations</p>
                </article>

                <article className="transparency-summary-card">
                  <div className="transparency-summary-top">
                    <span>Expenses reserved</span>
                    <span className="transparency-summary-icon">◷</span>
                  </div>
                  <strong>{formatEth(totalReserved)} <small>ETH</small></strong>
                  <p>Includes paid and unpaid recorded expenses</p>
                </article>

                <article className="transparency-summary-card">
                  <div className="transparency-summary-top">
                    <span>Paid to recipients</span>
                    <span className="transparency-summary-icon">✓</span>
                  </div>
                  <strong>{formatEth(totalPaid)} <small>ETH</small></strong>
                  <p>Payments marked as released on-chain</p>
                </article>

                <article className="transparency-summary-card">
                  <div className="transparency-summary-top">
                    <span>Unreserved allocation</span>
                    <span className="transparency-summary-icon">◇</span>
                  </div>
                  <strong>{formatEth(totalUnreserved)} <small>ETH</small></strong>
                  <p>Raised funds less recorded reserved expenses</p>
                </article>
              </div>
            </section>

            <section className="transparency-section">
              <div className="transparency-section-heading">
                <div>
                  <span className="transparency-eyebrow">VERIFICATION TRACKER</span>
                  <h2>Expense status</h2>
                  <p>See which expense records have been verified and paid.</p>
                </div>
              </div>

              <div className="transparency-status-grid">
                <article className="transparency-status-card">
                  <span className="transparency-status-icon status-icon-green">✓</span>
                  <div>
                    <strong>{verifiedCount}</strong>
                    <p>Verified expenses</p>
                  </div>
                </article>

                <article className="transparency-status-card">
                  <span className="transparency-status-icon status-icon-amber">◷</span>
                  <div>
                    <strong>{pendingCount}</strong>
                    <p>Awaiting verification</p>
                  </div>
                </article>

                <article className="transparency-status-card">
                  <span className="transparency-status-icon status-icon-green">↗</span>
                  <div>
                    <strong>{paidCount}</strong>
                    <p>Payments released</p>
                  </div>
                </article>

                <article className="transparency-status-card">
                  <span className="transparency-status-icon status-icon-blue">◌</span>
                  <div>
                    <strong>{pendingPaymentCount}</strong>
                    <p>Verified but unpaid</p>
                  </div>
                </article>
              </div>
            </section>

            <section className="transparency-section">
              <div className="transparency-section-heading">
                <div>
                  <span className="transparency-eyebrow">CAMPAIGN BY CAMPAIGN</span>
                  <h2>Follow the funding</h2>
                  <p>Compare each campaign's fundraising goal, money raised and recorded expenses.</p>
                </div>
                <span className="transparency-count-pill">
                  {campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"}
                </span>
              </div>

              {campaigns.length === 0 ? (
                <div className="transparency-empty">
                  <span className="transparency-empty-icon">◇</span>
                  <h3>No campaign records yet</h3>
                  <p>Campaigns will appear here once they have been recorded on this blockchain.</p>
                </div>
              ) : (
                <div className="transparency-campaign-list">
                  {campaigns.map((campaign) => {
                    const progress = progressFor(campaign);

                    return (
                      <article className="transparency-campaign-card" key={campaign.id}>
                        <div className="transparency-campaign-top">
                          <div className="transparency-campaign-title">
                            <span className="transparency-record-id">
                              CAMPAIGN #{campaign.id}
                            </span>
                            <h3>{campaign.name}</h3>
                          </div>

                          <span
                            className={`transparency-badge status-${(campaign.status || "unknown").toLowerCase().replaceAll(" ", "-")}`}
                          >
                            {campaign.status || "Unknown"}
                          </span>
                        </div>

                        {campaign.description && (
                          <p className="transparency-campaign-description">
                            {campaign.description}
                          </p>
                        )}

                        <div className="transparency-progress-heading">
                          <span>Fundraising progress</span>
                          <strong>{progress.toFixed(2)}%</strong>
                        </div>

                        <div
                          className="transparency-progress-track"
                          role="progressbar"
                          aria-label={`Fundraising progress for ${campaign.name}`}
                          aria-valuenow={Math.round(progress)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`transparency-progress-fill ${campaign.status === "Completed" ? "progress-completed" : ""}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="transparency-financial-grid">
                          <div>
                            <span>Fundraising goal</span>
                            <strong>{formatEth(campaign.goal)} ETH</strong>
                          </div>
                          <div>
                            <span>Total raised</span>
                            <strong>{formatEth(campaign.raised)} ETH</strong>
                          </div>
                          <div>
                            <span>Remaining to goal</span>
                            <strong>{formatEth(campaign.remainingGoal)} ETH</strong>
                          </div>
                          <div>
                            <span>Expenses reserved</span>
                            <strong>{formatEth(campaign.reserved)} ETH</strong>
                          </div>
                          <div>
                            <span>Paid to recipients</span>
                            <strong>{formatEth(campaign.paid)} ETH</strong>
                          </div>
                          <div>
                            <span>Unreserved allocation</span>
                            <strong>{formatEth(campaign.unreserved)} ETH</strong>
                          </div>
                        </div>

                        <div className="transparency-campaign-wallet">
                          <span>Campaign NGO wallet</span>
                          <code title={campaign.ngo}>{shortAddress(campaign.ngo)}</code>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="transparency-section">
              <div className="transparency-section-heading">
                <div>
                  <span className="transparency-eyebrow">DONOR ACTIVITY</span>
                  <h2>Donation records</h2>
                  <p>Public donation entries and their recorded campaign details.</p>
                </div>
                <span className="transparency-count-pill">
                  {donations.length} {donations.length === 1 ? "record" : "records"}
                </span>
              </div>

              {donations.length === 0 ? (
                <div className="transparency-empty">
                  <span className="transparency-empty-icon">↗</span>
                  <h3>No donations recorded yet</h3>
                  <p>When a donation is recorded on-chain, it will be listed here.</p>
                </div>
              ) : (
                <div className="transparency-record-list">
                  {donations.map((donation) => (
                    <article className="transparency-record-card" key={donation.index}>
                      <div className="transparency-record-icon donation-record-icon">↗</div>

                      <div className="transparency-record-main">
                        <span className="transparency-record-id">
                          DONATION #{donation.index + 1} · CAMPAIGN #{donation.campaignId}
                        </span>
                        <h3>{donation.campaignName}</h3>
                        <p>{donation.timestamp}</p>
                        <div className="transparency-record-wallet">
                          <span>Donor wallet</span>
                          <code title={donation.donor}>{shortAddress(donation.donor)}</code>
                        </div>
                      </div>

                      <div className="transparency-record-amount">
                        <span>Donation amount</span>
                        <strong>{formatEth(donation.amount)} <small>ETH</small></strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="transparency-section">
              <div className="transparency-section-heading">
                <div>
                  <span className="transparency-eyebrow">FUND UTILIZATION</span>
                  <h2>Expense records</h2>
                  <p>Review each recorded expense, its recipient, and its verification and payment status.</p>
                </div>
                <span className="transparency-count-pill">
                  {expenses.length} {expenses.length === 1 ? "record" : "records"}
                </span>
              </div>

              {expenses.length === 0 ? (
                <div className="transparency-empty">
                  <span className="transparency-empty-icon">◇</span>
                  <h3>No expenses recorded yet</h3>
                  <p>Recorded campaign expenses will appear here for public review.</p>
                </div>
              ) : (
                <div className="transparency-record-list">
                  {expenses.map((expense) => (
                    <article className="transparency-record-card expense-record-card" key={expense.index}>
                      <div className="transparency-record-icon expense-record-icon">↗</div>

                      <div className="transparency-record-main">
                        <span className="transparency-record-id">
                          EXPENSE #{expense.index + 1} · CAMPAIGN #{expense.campaignId}
                        </span>
                        <h3>{expense.campaignName}</h3>
                        <p className="transparency-expense-purpose">
                          {expense.purpose || "No purpose provided"}
                        </p>
                        <p>{expense.timestamp}</p>

                        <div className="transparency-record-wallet">
                          <span>Recipient wallet</span>
                          <code title={expense.recipient}>
                            {shortAddress(expense.recipient)}
                          </code>
                        </div>

                        <div className="transparency-record-statuses">
                          <span className={`transparency-badge ${expense.verified ? "status-verified" : "status-pending"}`}>
                            {expense.verified ? "✓ Verified" : "Awaiting verification"}
                          </span>
                          <span className={`transparency-badge ${expense.released ? "status-paid" : "status-unpaid"}`}>
                            {expense.released ? "✓ Payment released" : "Payment not released"}
                          </span>
                        </div>
                      </div>

                      <div className="transparency-record-amount">
                        <span>Expense amount</span>
                        <strong>{formatEth(expense.amount)} <small>ETH</small></strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="transparency-accounting-note">
              <span className="transparency-note-icon">i</span>
              <p>
                <strong>Understanding the totals:</strong> “Expenses reserved”
                includes both paid and unpaid expenses. “Unreserved allocation”
                is an accounting calculation based on funds raised minus reserved
                expenses; it is not the live ETH balance of the contract.
              </p>
            </div>
          </>
        )}

        <footer className="transparency-footer">
          <span className="transparency-footer-icon">✓</span>
          <div>
            <strong>Transparency by design</strong>
            <p>
              DonateChain displays records retrieved from its smart contract.
              Wallet addresses are shortened for readability; hover over them
              to view the full address.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default Transparency;
