
require("dotenv").config();

const mongoose = require("mongoose");
const { ethers } = require("ethers");
const Campaign = require("../models/Campaign");

const abi = [
  "function getCampaignCount() view returns (uint256)",
  "function getCampaign(uint256 id) view returns (uint256 id, address ngo, string name, string description, string imageUrl, uint256 goalAmount, uint256 totalRaised, uint256 totalPaid, uint8 status, uint256 createdAt)",
];

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  const rpcUrl =
    process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";

  if (!address || !ethers.isAddress(address)) {
    throw new Error("Check CONTRACT_ADDRESS in server/.env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const code = await provider.getCode(address);

  if (code === "0x") {
    throw new Error(
      "No contract found at the configured address on this network."
    );
  }

  const contract = new ethers.Contract(address, abi, provider);

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const count = Number(await contract.getCampaignCount());
    const dbRecords = await Campaign.find({}).lean();
    const statuses = ["pending", "active", "completed", "removed"];

    console.log(`On-chain campaigns: ${count}`);
    console.log(`MongoDB records: ${dbRecords.length}`);

    for (let id = 1; id <= count; id++) {
      const chain = await contract.getCampaign(id);
      const db = dbRecords.find(
        (record) => record.blockchainCampaignId === id
      );

      console.log("\n------------------------------");
      console.log(`Campaign ID: ${id}`);
      console.log(`Blockchain name: ${chain.name}`);
      console.log(`Blockchain NGO: ${chain.ngo}`);
      console.log(`Goal: ${ethers.formatEther(chain.goalAmount)} ETH`);
      console.log(`Raised: ${ethers.formatEther(chain.totalRaised)} ETH`);
      console.log(`Status: ${statuses[Number(chain.status)]}`);
      console.log(
        "MongoDB record:",
        db ? `${db.name} (found)` : "MISSING"
      );
    }
  } finally {
    await mongoose.disconnect();
    provider.destroy();
  }
}

main().catch((error) => {
  console.error("Inspection failed:", error.message);
  process.exitCode = 1;
});
