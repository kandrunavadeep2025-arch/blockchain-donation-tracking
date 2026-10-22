
const express = require("express");
const { ethers } = require("ethers");
const Campaign = require("../models/Campaign");
const requireAuth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

const campaignAbi = [
  "function getCampaign(uint256 campaignId) view returns (uint256 id, address ngo, string name, string description, string imageUrl, uint256 goalAmount, uint256 totalRaised, uint256 totalPaid, uint8 status, uint256 createdAt)",
];

function getContract() {
  const address = process.env.CONTRACT_ADDRESS;

  if (!address || !ethers.isAddress(address)) {
    throw new Error("CONTRACT_ADDRESS is missing or invalid in server/.env");
  }

  const provider = new ethers.JsonRpcProvider(
    process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545"
  );

  return new ethers.Contract(address, campaignAbi, provider);
}

function getStatus(status) {
  return ["pending", "active", "completed", "removed"][Number(status)];
}

// NGO creates the campaign on-chain first.
// This endpoint verifies that transaction's resulting campaign before saving metadata.
router.post(
  "/",
  requireAuth,
  requireRole("ngo"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        imageUrl = "",
        goalAmount,
        blockchainCampaignId,
      } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof description !== "string" ||
        !description.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Campaign name and description are required.",
        });
      }

      if (
        typeof blockchainCampaignId !== "number" ||
        !Number.isSafeInteger(blockchainCampaignId) ||
        blockchainCampaignId < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid blockchain campaign ID is required.",
        });
      }

      if (
        typeof goalAmount !== "number" ||
        !Number.isFinite(goalAmount) ||
        goalAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "The fundraising goal must be a positive ETH amount.",
        });
      }

      if (!req.user.walletAddress ||
          !ethers.isAddress(req.user.walletAddress)) {
        return res.status(403).json({
          success: false,
          message: "Link an approved NGO wallet before creating campaigns.",
        });
      }

      const contract = getContract();

      const onChain = await contract.getCampaign(
        blockchainCampaignId
      );

      const onChainNgo = onChain.ngo.toLowerCase();
      const userWallet = req.user.walletAddress.toLowerCase();

      if (onChainNgo !== userWallet) {
        return res.status(403).json({
          success: false,
          message: "This campaign does not belong to your linked NGO wallet.",
        });
      }

      if (Number(onChain.status) !== 0) {
        return res.status(400).json({
          success: false,
          message: "A new campaign must be pending admin approval.",
        });
      }

      if (onChain.name !== name.trim() ||
          onChain.description !== description.trim() ||
          onChain.imageUrl !== imageUrl ||
          onChain.goalAmount !== ethers.parseEther(String(goalAmount))) {
        return res.status(400).json({
          success: false,
          message: "Campaign details do not match the blockchain record.",
        });
      }

      const existing = await Campaign.findOne({
        blockchainCampaignId,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "This blockchain campaign ID is already registered.",
        });
      }

      const campaign = await Campaign.create({
        name: onChain.name,
        description: onChain.description,
        imageUrl: onChain.imageUrl,
        goalAmount: Number(ethers.formatEther(onChain.goalAmount)),
        blockchainCampaignId,
        ngoWalletAddress: onChainNgo,
        status: "pending",
      });

      return res.status(201).json({
        success: true,
        campaign,
        message: "Blockchain campaign registered as pending approval.",
      });
    } catch (error) {
      console.error("Campaign creation error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not verify or save the blockchain campaign.",
      });
    }
  }
);

// Admin can see campaigns pending approval and their current chain status.
router.get(
  "/admin/all",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const contract = getContract();
      const records = await Campaign.find().sort({ createdAt: -1 });
      const campaigns = [];

      for (const record of records) {
        try {
          const chain = await contract.getCampaign(
            record.blockchainCampaignId
          );

          if (
            chain.ngo.toLowerCase() !==
              record.ngoWalletAddress.toLowerCase() ||
            chain.name !== record.name
          ) {
            continue;
          }

          const status = getStatus(chain.status);
          record.status = status;
          await record.save();

          campaigns.push({
            ...record.toObject(),
            status,
            totalRaisedEth: ethers.formatEther(chain.totalRaised),
            totalPaidEth: ethers.formatEther(chain.totalPaid),
          });
        } catch (error) {
          console.warn(
            "Skipping campaign not present on chain:",
            record.blockchainCampaignId
          );
        }
      }

      return res.json({ success: true, campaigns });
    } catch (error) {
      console.error("Admin campaign list error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Could not load admin campaign list.",
      });
    }
  }
);

// Public list contains only approved active or completed campaigns.
router.get("/", async (req, res) => {
  try {
    const contract = getContract();
    const records = await Campaign.find().sort({ createdAt: -1 });
    const campaigns = [];

    for (const record of records) {
      try {
        const chain = await contract.getCampaign(
          record.blockchainCampaignId
        );

        if (
          chain.ngo.toLowerCase() !== record.ngoWalletAddress.toLowerCase() ||
          chain.name !== record.name
        ) {
          continue;
        }

        const status = getStatus(chain.status);

        record.status = status;
        await record.save();

        if (status !== "active" && status !== "completed") {
          continue;
        }

        campaigns.push({
          ...record.toObject(),
          status,
          totalRaisedEth: ethers.formatEther(chain.totalRaised),
          totalPaidEth: ethers.formatEther(chain.totalPaid),
          remainingGoalEth: ethers.formatEther(
            chain.goalAmount - chain.totalRaised
          ),
        });
      } catch (error) {
        // Do not show stale MongoDB sample records with no matching
        // campaign on the current blockchain.
        console.warn(
          "Skipping campaign not present on chain:",
          record.blockchainCampaignId
        );
      }
    }

    return res.json({ success: true, campaigns });
  } catch (error) {
    console.error("Campaign list error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load campaigns from the blockchain.",
    });
  }
});

module.exports = router;
