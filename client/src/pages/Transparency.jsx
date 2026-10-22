
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { contract } from "../contract";

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

  return (
    <main style={{ padding: "32px", maxWidth: "1150px", margin: "auto" }}>
      <h1>Fund Transparency Dashboard</h1>

      <p>
        Review donations, campaign progress, recorded expenses and
        payments using data read directly from the DonationTracker contract.
      </p>

      <p>All financial amounts are displayed in ETH.</p>

      <button onClick={loadData} disabled={loading}>
        {loading ? "Loading..." : "Refresh Blockchain Data"}
      </button>

      {error && (
        <p role="alert" style={{ color: "red", marginTop: "16px" }}>
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading blockchain records...</p>
      ) : (
        <>
          <h2 style={{ marginTop: "30px" }}>Overall Fund Summary</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              ["Total Donations Received", totalDonations],
              ["Expenses Recorded / Reserved", totalReserved],
              ["Actually Paid to Recipients", totalPaid],
              ["Unreserved Campaign Allocations", totalUnreserved],
            ].map(([label, value]) => (
              <section
                key={label}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <p style={{ color: "#64748b" }}>{label}</p>
                <h2>{formatEth(value)} ETH</h2>
              </section>
            ))}
          </div>

          <h2 style={{ marginTop: "32px" }}>Expense Status Summary</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <p>Verified expenses: <strong>{verifiedCount}</strong></p>
            <p>Awaiting verification: <strong>{pendingCount}</strong></p>
            <p>Payments released: <strong>{paidCount}</strong></p>
            <p>Verified but unpaid: <strong>{pendingPaymentCount}</strong></p>
          </div>

          <h2 style={{ marginTop: "32px" }}>Campaign Financial Summary</h2>

          {campaigns.length === 0 ? (
            <p>No campaigns have been created on this blockchain.</p>
          ) : (
            campaigns.map((campaign) => {
              const goal = Number(ethers.formatEther(campaign.goal));
              const raised = Number(ethers.formatEther(campaign.raised));

              const progress =
                goal > 0
                  ? Math.min(100, Math.max(0, (raised / goal) * 100))
                  : 0;

              return (
                <section
                  key={campaign.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    padding: "20px",
                    marginTop: "16px",
                  }}
                >
                  <h3>{campaign.name}</h3>

                  <p>Campaign ID: {campaign.id}</p>
                  <p>Status: <strong>{campaign.status}</strong></p>

                  <p>Fundraising goal: {formatEth(campaign.goal)} ETH</p>
                  <p>Total raised: {formatEth(campaign.raised)} ETH</p>

                  <div
                    style={{
                      height: "10px",
                      background: "#e5e7eb",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: campaign.status === "Completed"
                          ? "#16a34a"
                          : "#2563eb",
                      }}
                    />
                  </div>

                  <p>Fundraising progress: {progress.toFixed(2)}%</p>
                  <p>Remaining to goal: {formatEth(campaign.remainingGoal)} ETH</p>
                  <p>Expenses reserved: {formatEth(campaign.reserved)} ETH</p>
                  <p>Paid to recipients: {formatEth(campaign.paid)} ETH</p>
                  <p>Unreserved campaign allocation: {formatEth(campaign.unreserved)} ETH</p>
                </section>
              );
            })
          )}

          <h2 style={{ marginTop: "32px" }}>Donation Records</h2>

          {donations.length === 0 ? (
            <p>No donations have been recorded on this blockchain.</p>
          ) : (
            donations.map((donation) => (
              <section
                key={donation.index}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "18px",
                  marginTop: "12px",
                }}
              >
                <h3>{donation.campaignName}</h3>
                <p>Campaign ID: {donation.campaignId}</p>
                <p>Donor wallet: {donation.donor}</p>
                <p>Donation amount: {formatEth(donation.amount)} ETH</p>
                <p>Recorded at: {donation.timestamp}</p>
              </section>
            ))
          )}

          <h2 style={{ marginTop: "32px" }}>Expense Records</h2>

          {expenses.length === 0 ? (
            <p>No expenses have been recorded on this blockchain.</p>
          ) : (
            expenses.map((expense) => (
              <section
                key={expense.index}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "18px",
                  marginTop: "12px",
                }}
              >
                <h3>Expense #{expense.index + 1}: {expense.campaignName}</h3>
                <p>Campaign ID: {expense.campaignId}</p>
                <p>Amount: {formatEth(expense.amount)} ETH</p>
                <p>Purpose: {expense.purpose}</p>
                <p>Recipient: {expense.recipient}</p>
                <p>Recorded at: {expense.timestamp}</p>
                <p>Verification: {expense.verified ? "Verified" : "Pending"}</p>
                <p>Payment: {expense.released ? "Paid to recipient" : "Not released"}</p>
              </section>
            ))
          )}

          <p style={{ marginTop: "30px", color: "#64748b", fontSize: "13px" }}>
            “Expenses recorded / reserved” includes both paid and unpaid
            expenses. “Unreserved campaign allocations” is an accounting
            calculation, not the live ETH balance of the contract.
          </p>
        </>
      )}
    </main>
  );
}

export default Transparency;
