
require("dotenv").config();

const mongoose = require("mongoose");
const { ethers } = require("ethers");
const Campaign = require("../models/Campaign");

const abi = [
  "function getCampaignCount() view returns (uint256)",
  "function getCampaign(uint256 campaignId) view returns (uint256 id, address ngo, string name, string description, string imageUrl, uint256 goalAmount, uint256 totalRaised, uint256 totalPaid, uint8 status, uint256 createdAt)",
];

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  const rpcUrl =
    process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";

  if (!process.env.MONGODB_URI || !ethers.isAddress(address || "")) {
    throw new Error(
      "Missing MONGODB_URI or valid CONTRACT_ADDRESS in server/.env"
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Verify the current blockchain and contract before modifying MongoDB.
  await provider.getNetwork();

  const bytecode = await provider.getCode(address);

  if (bytecode === "0x") {
    throw new Error(
      "No contract exists at CONTRACT_ADDRESS on this network. Nothing was deleted."
    );
  }

  const contract = new ethers.Contract(address, abi, provider);
  const onChainCount = Number(await contract.getCampaignCount());

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const records = await Campaign.find({});
    const stale = [];

    for (const record of records) {
      const id = record.blockchainCampaignId;

      try {
        if (!Number.isSafeInteger(id) || id < 1 || id > onChainCount) {
          stale.push(record);
          continue;
        }

        const chain = await contract.getCampaign(id);

        const matches =
          Number(chain.id) === id &&
          record.ngoWalletAddress &&
          chain.ngo.toLowerCase() === record.ngoWalletAddress.toLowerCase() &&
          chain.name === record.name &&
          chain.description === record.description &&
          (chain.imageUrl || "") === (record.imageUrl || "") &&
          chain.goalAmount === ethers.parseEther(String(record.goalAmount));

        if (!matches) {
          stale.push(record);
          continue;
        }

        // Synchronize a valid MongoDB record with its authoritative
        // status on the current blockchain.
        const statuses = ["pending", "active", "completed", "removed"];
        record.status = statuses[Number(chain.status)];
        await record.save();
      } catch (error) {
        // Stop rather than deleting records after an unexpected RPC error.
        throw new Error(
          `Could not verify campaign ID ${id}. No cleanup was applied. ${error.message}`
        );
      }
    }

    console.log(`Current on-chain campaigns: ${onChainCount}`);
    console.log(`MongoDB campaign records: ${records.length}`);
    console.log(`Stale records identified: ${stale.length}`);

    const preview = stale.map((record) => ({
      id: record.blockchainCampaignId,
      name: record.name,
    }));

    console.table(preview);

    if (process.argv.includes("--apply")) {
      if (stale.length > 0) {
        const ids = stale.map((record) => record._id);

        const result = await Campaign.deleteMany({
          _id: { $in: ids },
        });

        console.log(`Removed ${result.deletedCount} stale campaign records.`);
      } else {
        console.log("No stale campaign records needed removal.");
      }
    } else {
      console.log(
        "Preview only. To remove these records, rerun with --apply."
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Cleanup stopped:", error.message);
  process.exitCode = 1;
});
