
require("dotenv").config();

const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const samples = await Campaign.find({
      blockchainCampaignId: { $in: [2, 3] },
      name: { $in: ["e", "w"] },
    }).lean();

    console.log("Sample campaign records found:", samples.length);
    console.table(
      samples.map((item) => ({
        id: item.blockchainCampaignId,
        name: item.name,
        goalAmountEth: item.goalAmount,
      }))
    );

    if (!process.argv.includes("--apply")) {
      console.log("Preview only. No records were deleted.");
      console.log("Run with --apply to remove these specific samples.");
      return;
    }

    const result = await Campaign.deleteMany({
      _id: { $in: samples.map((item) => item._id) },
    });

    console.log(`Removed ${result.deletedCount} sample campaign records.`);
    console.log("User accounts and other collections were not changed.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Cleanup failed:", error.message);
  process.exitCode = 1;
});
