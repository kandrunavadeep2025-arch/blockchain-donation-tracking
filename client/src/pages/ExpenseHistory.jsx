
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contract } from "../contract";

const campaignStatuses = [
  "Pending",
  "Active",
  "Completed",
  "Removed",
];

function formatEth(value) {
  const amount = Number(ethers.formatEther(value));

  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function ExpenseHistory() {
  const [expenses, setExpenses] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory() {
    setLoading(true);
    setError("");

    try {
      const campaignCount = Number(await contract.getCampaignCount());
      const expenseCount = Number(await contract.getExpenseCount());

      const campaignResults = await Promise.all(
        Array.from({ length: campaignCount }, async (_, index) => {
          const campaignId = index + 1;

          const [
            campaign,
            reserved,
          ] = await Promise.all([
            contract.getCampaign(campaignId),
            contract.campaignExpenses(campaignId),
          ]);

          const raised = campaign.totalRaised;

          return {
            id: campaignId,
            name: campaign.name,
            status: campaignStatuses[Number(campaign.status)],
            goal: formatEth(campaign.goalAmount),
            raised: formatEth(raised),
            reserved: formatEth(reserved),
            paid: formatEth(campaign.totalPaid),
            available: formatEth(
              raised >= reserved ? raised - reserved : 0n
            ),
          };
        })
      );

      const expenseResults = await Promise.all(
        Array.from({ length: expenseCount }, async (_, index) => {
          const expense = await contract.getExpenseDetails(index);

          let campaignName = `Campaign #${expense.campaignId}`;

          try {
            const campaign = await contract.getCampaign(
              Number(expense.campaignId)
            );
            campaignName = campaign.name;
          } catch {
            // Retain the campaign ID if details are unavailable.
          }

          return {
            index,
            campaignId: Number(expense.campaignId),
            campaignName,
            amount: formatEth(expense.amount),
            purpose: expense.purpose,
            timestamp: new Date(
              Number(expense.timestamp) * 1000
            ).toLocaleString(),
            verified: expense.verified,
            released: expense.released,
            recipient: expense.recipient,
          };
        })
      );

      setCampaigns(campaignResults.reverse());
      setExpenses(expenseResults.reverse());
    } catch (err) {
      console.error("Expense history loading error:", err);

      setError(
        "Could not load blockchain history. Check that Hardhat is running and the contract address is correct."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return <div style={{ padding: "30px" }}>Loading blockchain history...</div>;
  }

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <h1>Expense History & Fund Transparency</h1>

      <p>
        Financial totals are read from the DonationTracker smart contract.
        All amounts are displayed in test ETH.
      </p>

      <button onClick={loadHistory} disabled={loading}>
        Refresh Blockchain Data
      </button>

      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}

      <h2>Campaign Fund Summary</h2>

      {campaigns.length === 0 ? (
        <p>No campaigns found on the blockchain.</p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {campaigns.map((campaign) => (
            <section
              key={campaign.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <h3>{campaign.name}</h3>

              <p>
                <strong>Campaign ID:</strong> {campaign.id}
              </p>

              <p>
                <strong>Status:</strong> {campaign.status}
              </p>

              <p>
                <strong>Fundraising Goal:</strong> {campaign.goal} ETH
              </p>

              <p>
                <strong>Total Raised:</strong> {campaign.raised} ETH
              </p>

              <p>
                <strong>Expenses Reserved:</strong> {campaign.reserved} ETH
              </p>

              <p>
                <strong>Actually Paid to Recipients:</strong>{" "}
                {campaign.paid} ETH
              </p>

              <p>
                <strong>Unreserved Funds:</strong> {campaign.available} ETH
              </p>
            </section>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: "35px" }}>Recorded Expenses</h2>

      {expenses.length === 0 ? (
        <p>No expenses have been recorded.</p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {expenses.map((expense) => (
            <section
              key={expense.index}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <h3>Expense #{expense.index + 1}</h3>

              <p>
                <strong>Campaign:</strong> {expense.campaignName}
              </p>

              <p>
                <strong>Campaign ID:</strong> {expense.campaignId}
              </p>

              <p>
                <strong>Amount:</strong> {expense.amount} ETH
              </p>

              <p>
                <strong>Purpose:</strong> {expense.purpose}
              </p>

              <p>
                <strong>Recipient:</strong> {expense.recipient}
              </p>

              <p>
                <strong>Recorded At:</strong> {expense.timestamp}
              </p>

              <p>
                <strong>Admin Verification:</strong>{" "}
                {expense.verified ? "Verified ✅" : "Pending"}
              </p>

              <p>
                <strong>Payment Status:</strong>{" "}
                {expense.released
                  ? "Paid to recipient ✅"
                  : "Not yet paid"}
              </p>
            </section>
          ))}
        </div>
      )}

      <p style={{ marginTop: "25px", color: "#64748b", fontSize: "13px" }}>
        Recorded transactions remain part of the blockchain history, even if
        a campaign is later removed from active listings.
      </p>
    </div>
  );
}

export default ExpenseHistory;
