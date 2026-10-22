require("dotenv").config();
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const Campaign = require("./models/Campaign");

const ABI = [
  "function getCampaign(uint256) view returns (uint256 id,address ngo,string name,string description,string imageUrl,uint256 goalAmount,uint256 totalRaised,uint256 totalPaid,uint8 status,uint256 createdAt)"
];

const EXPECTED_NGO = "0x8EdE0DEEc33AF9B02c7159EE732f5599cB8967Ae";

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const provider = new ethers.JsonRpcProvider(
      process.env.BLOCKCHAIN_RPC_URL
    );

    const network = await provider.getNetwork();

    if (network.chainId !== 11155111n) {
      throw new Error("Wrong network. Expected Sepolia.");
    }

    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      ABI,
      provider
    );

    const c = await contract.getCampaign(2);

    if (
      c.ngo.toLowerCase() !== EXPECTED_NGO.toLowerCase() ||
      c.name !== "flood" ||
      c.description !== "emergency" ||
      ethers.formatEther(c.goalAmount) !== "0.1" ||
      Number(c.status) !== 0
    ) {
      throw new Error(
        "On-chain details do not match the expected campaign. Nothing saved."
      );
    }

    const existing = await Campaign.findOne({
      blockchainCampaignId: 2
    });

    if (existing) {
      console.log("Campaign #2 already exists in MongoDB. No changes made.");
      return;
    }

    const record = await Campaign.create({
      name: c.name,
      description: c.description,
      imageUrl: c.imageUrl,
      goalAmount: Number(ethers.formatEther(c.goalAmount)),
      blockchainCampaignId: 2,
      ngoWalletAddress: c.ngo.toLowerCase(),
      status: "pending"
    });

    console.log("SUCCESS: Campaign #2 saved to MongoDB.");
    console.log("Name:", record.name);
    console.log("Campaign ID:", record.blockchainCampaignId);
    console.log("Status:", record.status);
  } catch (error) {
    console.error("RECOVERY FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
