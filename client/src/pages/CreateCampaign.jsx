import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { contract } from "../contract";

function CreateCampaign() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setStatus("");

    if (!name.trim() || !description.trim()) {
      setStatus("Enter the campaign name and description.");
      return;
    }

    // Accept a positive ETH amount with up to 18 decimal places.
    if (!/^\d+(\.\d{1,18})?$/.test(goalAmount.trim())) {
      setStatus(
        "Enter a valid ETH goal with up to 18 decimal places."
      );
      return;
    }

    let goalWei;

    try {
      goalWei = ethers.parseEther(goalAmount.trim());

      if (goalWei <= 0n) {
        setStatus("The fundraising goal must be greater than zero.");
        return;
      }
    } catch {
      setStatus("Please enter a valid ETH fundraising goal.");
      return;
    }

    const token = sessionStorage.getItem("donatechainToken");

    if (!token) {
      setStatus("Please log in first.");
      navigate("/login");
      return;
    }

    if (!window.ethereum) {
      setStatus("Please install or unlock MetaMask.");
      return;
    }

    setLoading(true);

    let createdCampaignId = null;
    let blockchainTransactionConfirmed = false;

    try {
      setStatus("Checking your NGO account...");

      const response = await fetch(
        "https://blockchain-donation-tracking.onrender.com/api/auth/me",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const authData = await response.json();

      if (!response.ok || !authData.success) {
        throw new Error(
          authData.message ||
            "Your login has expired. Please log in again."
        );
      }

      const user = authData.user;

      if (!user || user.role !== "ngo") {
        throw new Error(
          "Only approved NGO accounts can create campaigns."
        );
      }

      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      // Sepolia chain ID is 11155111.
      if (network.chainId !== 11155111n) {
        throw new Error(
          "Please switch MetaMask to the Sepolia test network."
        );
      }

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      if (
        !user.walletAddress ||
        user.walletAddress.toLowerCase() !==
          walletAddress.toLowerCase()
      ) {
        throw new Error(
          "Your MetaMask account must match your approved NGO wallet."
        );
      }

      const signerContract = contract.connect(signer);

      const isAuthorized = await signerContract.authorizedNGO(
        walletAddress
      );

      if (!isAuthorized) {
        throw new Error(
          "This MetaMask wallet is not authorized by the smart contract."
        );
      }

      setStatus("Confirm campaign creation in MetaMask...");

      const transaction = await signerContract.createCampaign(
        name.trim(),
        description.trim(),
        goalWei,
        imageUrl.trim()
      );

      setStatus(
        "Transaction submitted. Waiting for blockchain confirmation..."
      );

      const receipt = await transaction.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("The blockchain transaction failed.");
      }

      blockchainTransactionConfirmed = true;

      // Read the campaign ID from the confirmed transaction event.
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);

          if (parsed?.name === "CampaignCreated") {
            createdCampaignId = Number(parsed.args.campaignId);
            break;
          }
        } catch {
          // Ignore logs that do not match the campaign ABI.
        }
      }

      if (
        !Number.isSafeInteger(createdCampaignId) ||
        createdCampaignId <= 0
      ) {
        throw new Error(
          `Transaction ${receipt.hash} succeeded, but the campaign ID could not be read. Do not submit another transaction.`
        );
      }

      setStatus(
        `Campaign #${createdCampaignId} is on the blockchain. Saving its details to MongoDB...`
      );

      let saveResponse;
      let saveData;

      try {
        saveResponse = await fetch(
          "https://blockchain-donation-tracking.onrender.com/api/campaigns",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: name.trim(),
              description: description.trim(),
              goalAmount: Number(goalAmount.trim()),
              imageUrl: imageUrl.trim(),
              blockchainCampaignId: createdCampaignId,
            }),
          }
        );

        saveData = await saveResponse.json();
      } catch (error) {
        console.error("MongoDB campaign save request failed:", error);

        setStatus(
          `Campaign #${createdCampaignId} was confirmed on the blockchain, but the server could not be reached or returned an invalid response. Do not create it again. Transaction: ${receipt.hash}`
        );

        return;
      }

      if (!saveResponse.ok || !saveData.success) {
        console.error("MongoDB campaign save error:", saveData);

        setStatus(
          `Campaign #${createdCampaignId} exists on the blockchain, but the backend could not save it: ${
            saveData.message || "Unknown server error"
          }. Do not create another campaign.`
        );

        return;
      }

      setStatus(
        `Campaign #${createdCampaignId} saved successfully and is waiting for admin approval!`
      );

      window.setTimeout(() => {
        navigate("/campaigns");
      }, 1500);
    } catch (error) {
      console.error("Campaign creation error:", error);

      if (blockchainTransactionConfirmed) {
        setStatus(
          `The blockchain transaction succeeded, but a later step failed. Do not submit another transaction. ${
            error?.shortMessage ||
            error?.reason ||
            error?.message ||
            "Unknown error"
          }`
        );
      } else {
        setStatus(
          error?.shortMessage ||
            error?.reason ||
            error?.message ||
            "Campaign creation failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: "40px 20px",
        maxWidth: "520px",
        margin: "auto",
      }}
    >
      <h1>Create a Campaign</h1>

      <p>
        Campaign goals use ETH. New campaigns must be approved by an
        administrator before accepting donations.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <label>
          Campaign Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            maxLength={2000}
            rows={4}
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </label>

        <label>
          Fundraising Goal (ETH)
          <input
            type="number"
            min="0.000000000000000001"
            step="any"
            placeholder="Example: 0.5"
            value={goalAmount}
            onChange={(event) => setGoalAmount(event.target.value)}
            required
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </label>

        <label>
          Image URL (optional)
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.com/image.jpg"
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Create Campaign"}
        </button>
      </form>

      {status && (
        <p
          role="status"
          aria-live="polite"
          style={{
            marginTop: "20px",
            overflowWrap: "anywhere",
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}

export default CreateCampaign;